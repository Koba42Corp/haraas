// Cloud Code main entry point
const logger = require('../utils/logger');

// Example cloud function
Parse.Cloud.define('hello', async (request) => {
  logger.info('Hello cloud function called', { user: request.user?.id });
  return 'Hello from HaRaaS Parse Server!';
});

// User registration hook
Parse.Cloud.beforeSave(Parse.User, async (request) => {
  const user = request.object;
  
  if (!user.existed()) {
    logger.info('New user registration', { username: user.get('username') });
    
    // Set default values for new users
    if (!user.get('emailVerified')) {
      user.set('emailVerified', false);
    }
  }
});

// User login hook
Parse.Cloud.afterLogin(async (request) => {
  const user = request.user;
  logger.info('User logged in', { 
    userId: user.id, 
    username: user.get('username') 
  });
  
  // Update last login time
  user.set('lastLogin', new Date());
  await user.save(null, { useMasterKey: true });
});

// Example beforeSave hook for a custom class
Parse.Cloud.beforeSave('TestObject', async (request) => {
  const object = request.object;
  
  // Automatically set createdBy field
  if (!object.existed() && request.user) {
    object.set('createdBy', request.user);
  }
  
  // Set updatedAt
  object.set('updatedAt', new Date());
});

// Load API modules
require('./api/login');

logger.info('Cloud code loaded successfully');
