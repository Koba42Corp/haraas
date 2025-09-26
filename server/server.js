// Import regenerator-runtime polyfill
require('regenerator-runtime');

// Import centralized logger first
const logger = require('./utils/logger');

// Global error handler for uncaught exceptions
process.on('uncaughtException', (err) => {
  logger.error('Uncaught Exception:', err);
  process.exit(1);
});

// Global handler for unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

// Memory monitoring for debugging
const logMemoryUsage = () => {
  const memUsage = process.memoryUsage();
  logger.debug('Memory Usage:', {
    rss: `${Math.round(memUsage.rss / 1024 / 1024)} MB`,
    heapTotal: `${Math.round(memUsage.heapTotal / 1024 / 1024)} MB`,
    heapUsed: `${Math.round(memUsage.heapUsed / 1024 / 1024)} MB`,
    external: `${Math.round(memUsage.external / 1024 / 1024)} MB`
  });
};

// Log memory usage every 5 minutes in production
if (process.env.NODE_ENV === 'production') {
  setInterval(logMemoryUsage, 5 * 60 * 1000);
}

// Required modules
const http = require('http');
const express = require('express');
const path = require('path');
require('dotenv').config();
const { ParseServer } = require('parse-server');
const ParseDashboard = require('parse-dashboard');
const cors = require('cors');

// Main server initialization
(async () => {
  try {
    const app = express();
    const httpServer = http.createServer(app);

    // Basic middleware
    app.use(express.json({ limit: '50mb' }));
    app.use(express.urlencoded({ extended: true, limit: '50mb' }));
    
    // CORS configuration
    const corsOptions = {
      origin: function (origin, callback) {
        // Allow requests with no origin (like mobile apps or curl requests)
        if (!origin) return callback(null, true);
        
        // In development, allow all origins
        if (process.env.NODE_ENV !== 'production') {
          return callback(null, true);
        }
        
        // In production, you can specify allowed origins
        const allowedOrigins = [
          process.env.CLIENT_URL,
          'https://your-frontend-domain.com'
        ].filter(Boolean);
        
        if (allowedOrigins.indexOf(origin) !== -1) {
          callback(null, true);
        } else {
          callback(new Error('Not allowed by CORS'));
        }
      },
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
      allowedHeaders: [
        'X-Parse-Application-Id',
        'X-Parse-REST-API-Key',
        'X-Parse-Session-Token',
        'X-Parse-Master-Key',
        'X-Parse-Javascript-Key',
        'X-Parse-Installation-Id',
        'X-Parse-Client-Version',
        'X-Parse-Revocable-Session',
        'Content-Type',
        'Authorization'
      ],
      exposedHeaders: ['X-Parse-Session-Token'],
      credentials: true,
      optionsSuccessStatus: 200
    };

    // Apply CORS middleware
    app.use(cors(corsOptions));

    // Health check endpoint
    app.get('/health', (req, res) => {
      res.status(200).json({ 
        status: 'OK', 
        timestamp: new Date().toISOString(),
        uptime: process.uptime()
      });
    });

    // Heroku proxy trust (MUST be before Parse Server initialization)
    app.set('trust proxy', 1);

    // Detect if running on Heroku or in production
    const isProd = process.env.NODE_ENV === 'production' || !!process.env.DYNO;

    // SERVER_URL configuration
    const SERVER_URL = isProd 
      ? (process.env.SERVER_URL_PROD || `https://${process.env.HEROKU_APP_NAME}.herokuapp.com/v1`)
      : (process.env.SERVER_URL || 'http://localhost:1337/v1');
    
    if (isProd && (!SERVER_URL || !/^https:\/\//i.test(SERVER_URL))) {
      throw new Error(
        'SERVER_URL_PROD must be set to your public HTTPS URL in production, e.g. https://<app>.herokuapp.com/parse'
      );
    }

    logger.info(`🔗 SERVER_URL: ${SERVER_URL}`);
    logger.info(`🔐 Is Production: ${isProd}`);
    logger.info(`🌐 HTTPS Required: ${isProd ? 'Yes' : 'No'}`);

    // Parse Server configuration
    const parseConfig = {
      databaseURI: process.env.DATABASE_URI || 'mongodb://localhost:27017/haraas',
      databaseOptions: {
        retryWrites: true,
        maxPoolSize: isProd ? 50 : 10,
        minPoolSize: isProd ? 5 : 2
      },
      cloud: path.join(__dirname, 'cloud/main.js'),
      appId: process.env.APP_ID || 'haraas-app-id',
      appName: 'HaRaaS',
      masterKey: process.env.MASTER_KEY || 'haraas-master-key',
      
      // IP whitelist for master key operations
      masterKeyIps: isProd ? [
        // Heroku IP ranges
        '10.0.0.0/8',
        '172.16.0.0/12',
        '192.168.0.0/16',
        // Localhost
        '127.0.0.1',
        '::1'
      ] : ['127.0.0.1', '::1'],
      
      encryptionKey: process.env.ENCRYPTION_KEY || 'haraas-encryption-key',
      serverURL: SERVER_URL,
      publicServerURL: SERVER_URL,
      
      // Email verification settings
      verifyUserEmails: false, // Set to true when email is configured
      preventLoginWithUnverifiedEmail: false,
      
      // Security settings
      enableAnonymousUsers: false,
      allowClientClassCreation: !isProd,
      sessionLength: 24 * 60 * 60, // 24 hours
      
      // Logging
      logLevel: isProd ? 'warn' : 'info',
      
      // File upload settings
      maxUploadSize: '20mb',
      allowExpiredAuthDataToken: false,
      
      // Live Query settings
      liveQuery: {
        classNames: ['TestObject'] // Add your classes here
      },
      
      verbose: !isProd
    };

    // Add email configuration if available
    if (process.env.GMAIL_ADDRESS && process.env.GMAIL_PASSWORD) {
      logger.info('📧 Email configuration detected, setting up mail adapter...');
      
      // Create a simple custom email adapter
      const nodemailer = require('nodemailer');
      
      const transporter = nodemailer.createTransport({
        host: 'smtp.gmail.com',
        port: 587,
        secure: false,
        auth: {
          user: process.env.GMAIL_ADDRESS,
          pass: process.env.GMAIL_PASSWORD
        }
      });

      // Custom email adapter implementation
      parseConfig.emailAdapter = {
        sendMail: async (options) => {
          try {
            logger.info(`📧 Sending email to: ${options.to}`);
            
            // Create email content based on the type
            let subject, text, html;
            
            if (options.subject && options.text) {
              // Direct email with subject and text
              subject = options.subject;
              text = options.text;
              html = options.html || `<p>${options.text}</p>`;
            } else {
              // Template-based email (password reset, verification, etc.)
              const appName = 'HaRaaS';
              const link = options.link || '#';
              
              if (options.templateName === 'passwordResetEmail' || options.subject?.includes('password')) {
                subject = 'Reset your password';
                text = `Hi,\n\nYou requested to reset your password for ${appName}.\n\nPlease click here to reset it:\n${link}\n\nIf you did not request a password reset, please ignore this email.\n\nThanks,\nThe ${appName} Team`;
                html = `<p>Hi,</p><p>You requested to reset your password for <strong>${appName}</strong>.</p><p><a href="${link}">Click here to reset your password</a></p><p>If you did not request a password reset, please ignore this email.</p><p>Thanks,<br>The ${appName} Team</p>`;
              } else if (options.templateName === 'verificationEmail' || options.subject?.includes('verify')) {
                subject = 'Please verify your email';
                text = `Hi,\n\nWelcome to ${appName}!\n\nPlease click here to verify your email:\n${link}\n\nThanks,\nThe ${appName} Team`;
                html = `<p>Hi,</p><p>Welcome to <strong>${appName}</strong>!</p><p><a href="${link}">Click here to verify your email</a></p><p>Thanks,<br>The ${appName} Team</p>`;
              } else {
                // Fallback
                subject = options.subject || `${appName} Notification`;
                text = options.text || options.body || `You have a notification from ${appName}.`;
                html = options.html || `<p>${text}</p>`;
              }
            }

            const result = await transporter.sendMail({
              from: process.env.GMAIL_ADDRESS,
              to: options.to,
              subject: subject,
              text: text,
              html: html
            });
            
            logger.info(`📧 Email sent successfully to: ${options.to}`);
            return result;
          } catch (error) {
            logger.error('📧 Email sending failed:', error);
            throw error;
          }
        }
      };
      
      // Enable email verification
      parseConfig.verifyUserEmails = true;
      parseConfig.preventLoginWithUnverifiedEmail = false;
    } else {
      logger.info('📧 No email configuration found, email features disabled');
    }

    // Initialize Parse Server
    const api = new ParseServer(parseConfig);

    // Start Parse Server
    await api.start();

    // Parse Dashboard configuration
    const dashboardConfig = {
      apps: [
        {
          serverURL: SERVER_URL,
          appId: parseConfig.appId,
          masterKey: parseConfig.masterKey,
          appName: 'HaRaaS Dashboard',
          production: isProd
        }
      ],
      users: [
        {
          user: process.env.DASHBOARD_USERNAME || 'admin',
          pass: process.env.DASHBOARD_PASSWORD || 'password',
          apps: [{ appId: parseConfig.appId }]
        }
      ],
      useEncryptedPasswords: false,
      trustProxy: isProd
    };

    // Initialize Parse Dashboard
    const dashboard = new ParseDashboard(dashboardConfig, {
      allowInsecureHTTP: !isProd,
      trustProxy: isProd
    });

    // Mount Parse API
    app.use('/v1', api.app);

    // Mount Parse Dashboard
    app.use('/dashboard', dashboard);

    // Root endpoint
    app.get('/', (req, res) => {
      res.json({
        message: 'HaRaaS Parse Server is running!',
        version: '1.0.0',
        endpoints: {
          api: '/parse',
          dashboard: '/dashboard',
          health: '/health'
        }
      });
    });

    // ServerInfo endpoint (Dashboard compatibility)
    app.post('/parse/serverInfo', (req, res) => {
      res.json({
        status: 'OK',
        parseServerVersion: require('parse-server/package.json').version,
        features: {
          globalConfig: true,
          hooks: true,
          cloudCode: true,
          logs: true,
          push: false,
          schemas: true
        }
      });
    });

    // 404 handler
    app.use('*', (req, res) => {
      res.status(404).json({
        error: 'Endpoint not found',
        path: req.originalUrl
      });
    });

    // Error handler
    app.use((err, req, res, next) => {
      logger.error('Express error:', err);
      res.status(500).json({
        error: 'Internal server error',
        message: isProd ? 'Something went wrong' : err.message
      });
    });

    // Graceful shutdown handler
    const gracefulShutdown = () => {
      logger.info('Received shutdown signal, closing server gracefully...');
      httpServer.close(() => {
        logger.info('HTTP server closed');
        process.exit(0);
      });
    };

    process.on('SIGTERM', gracefulShutdown);
    process.on('SIGINT', gracefulShutdown);

    // Start server
    const port = process.env.PORT || 1337;
    httpServer.listen(port, () => {
      logger.info('=== HaRaaS Server Started ===');
      logger.info(`🚀 Parse Server: ${SERVER_URL}`);
      logger.info(`📊 Dashboard: ${SERVER_URL.replace('/parse', '/dashboard')}`);
      logger.info(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
      logger.info(`🔌 Port: ${port}`);
      logger.info(`📱 Production: ${isProd ? 'Yes' : 'No'}`);
      logger.info(`🔒 Proxy Trust: ${isProd ? 'Enabled' : 'Disabled'}`);
      logger.info(`👤 Dashboard User: ${process.env.DASHBOARD_USERNAME || 'admin'}`);
      logger.info('================================');
    });

    // Initialize Live Query Server if enabled
    if (parseConfig.liveQuery && parseConfig.liveQuery.classNames.length > 0) {
      ParseServer.createLiveQueryServer(httpServer, {
        websocketTimeout: 60 * 1000,
        cacheTimeout: 60 * 1000
      });
      logger.info('🔴 Live Query Server initialized');
    }

  } catch (error) {
    logger.error('❌ Server startup failed:', error);
    process.exit(1);
  }
})();
