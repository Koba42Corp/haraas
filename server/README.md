# HaRaaS Parse Server

A Node.js Express server with Parse Server backend, ready for deployment on Heroku.

## Features

- **Parse Server**: Backend-as-a-Service with user authentication, data storage, and cloud functions
- **Parse Dashboard**: Web-based admin interface for managing your Parse app
- **Express.js**: Web framework for additional API endpoints
- **Heroku Ready**: Configured for easy deployment to Heroku
- **Production Logging**: Winston-based logging with different levels for development and production
- **CORS Support**: Cross-origin resource sharing configured
- **Health Checks**: Built-in health check endpoint
- **Live Query**: Real-time data synchronization (optional)

## Quick Start

### Local Development

1. **Clone and setup**:
   ```bash
   cd server
   npm install
   ```

2. **Configure environment**:
   ```bash
   cp env.example .env
   # Edit .env with your configuration
   ```

3. **Start the server**:
   ```bash
   npm run dev  # Development with nodemon
   # or
   npm start    # Production mode
   ```

4. **Access the services**:
   - API: http://localhost:1337/parse
   - Dashboard: http://localhost:1337/dashboard
   - Health Check: http://localhost:1337/health

### Environment Variables

Create a `.env` file based on `env.example`:

```env
# Required
NODE_ENV=development
PORT=1337
APP_ID=your-unique-app-id
MASTER_KEY=your-secure-master-key
ENCRYPTION_KEY=your-encryption-key
DATABASE_URI=mongodb://localhost:27017/haraas

# Dashboard
DASHBOARD_USERNAME=admin
DASHBOARD_PASSWORD=secure-password

# Production (Heroku)
SERVER_URL_PROD=https://your-app.herokuapp.com/parse
```

## Heroku Deployment

### Prerequisites

1. **Heroku CLI**: Install from [heroku.com](https://devcenter.heroku.com/articles/heroku-cli)
2. **MongoDB**: Set up a MongoDB database (MongoDB Atlas recommended)

### Deploy Steps

1. **Create Heroku app**:
   ```bash
   heroku create your-app-name
   ```

2. **Set environment variables**:
   ```bash
   heroku config:set NODE_ENV=production
   heroku config:set APP_ID=your-unique-app-id
   heroku config:set MASTER_KEY=your-secure-master-key
   heroku config:set ENCRYPTION_KEY=your-encryption-key
   heroku config:set DATABASE_URI=your-mongodb-connection-string
   heroku config:set DASHBOARD_USERNAME=admin
   heroku config:set DASHBOARD_PASSWORD=secure-password
   heroku config:set SERVER_URL_PROD=https://your-app-name.herokuapp.com/parse
   ```

3. **Deploy**:
   ```bash
   git add .
   git commit -m "Initial commit"
   git push heroku main
   ```

4. **Access your app**:
   - API: https://your-app-name.herokuapp.com/parse
   - Dashboard: https://your-app-name.herokuapp.com/dashboard

### MongoDB Setup (Atlas)

1. Create account at [MongoDB Atlas](https://www.mongodb.com/cloud/atlas)
2. Create a new cluster
3. Create a database user
4. Whitelist your IP (or use 0.0.0.0/0 for Heroku)
5. Get connection string and set as `DATABASE_URI`

## API Usage

### Initialize Parse SDK (Client)

```javascript
// JavaScript
Parse.initialize("your-app-id");
Parse.serverURL = 'https://your-app.herokuapp.com/parse';

// React Native / Node.js
const Parse = require('parse/node');
Parse.initialize("your-app-id");
Parse.serverURL = 'https://your-app.herokuapp.com/parse';
```

### Basic Operations

```javascript
// Create a new object
const TestObject = Parse.Object.extend("TestObject");
const testObject = new TestObject();
testObject.set("name", "Hello World");
await testObject.save();

// Query objects
const query = new Parse.Query(TestObject);
const results = await query.find();

// User registration
const user = new Parse.User();
user.set("username", "john_doe");
user.set("password", "secure_password");
user.set("email", "john@example.com");
await user.signUp();

// User login
const user = await Parse.User.logIn("john_doe", "secure_password");
```

## Cloud Functions

Add your cloud functions in `cloud/main.js`:

```javascript
// Example cloud function
Parse.Cloud.define('hello', async (request) => {
  return 'Hello from the cloud!';
});

// Call from client
const result = await Parse.Cloud.run('hello');
```

## Security Notes

- **Change default keys**: Always use unique, secure keys in production
- **Database security**: Ensure your MongoDB instance is properly secured
- **HTTPS only**: The server enforces HTTPS in production
- **IP whitelisting**: Master key operations are restricted to specific IP ranges
- **Environment variables**: Never commit sensitive data to version control

## Monitoring

- **Health Check**: `GET /health` returns server status
- **Logs**: Check Heroku logs with `heroku logs --tail`
- **Memory Usage**: Logged every 5 minutes in production

## Troubleshooting

### Common Issues

1. **Database connection**: Ensure `DATABASE_URI` is correct and accessible
2. **CORS errors**: Check `corsOptions` in `server.js`
3. **Dashboard access**: Verify `DASHBOARD_USERNAME` and `DASHBOARD_PASSWORD`
4. **Heroku deployment**: Check that all required environment variables are set

### Debug Mode

Set `LOG_LEVEL=debug` for verbose logging:

```bash
heroku config:set LOG_LEVEL=debug
```

## Support

For Parse Server documentation: https://docs.parseplatform.org/
For Heroku deployment help: https://devcenter.heroku.com/
