const logger = require('../../utils/logger');

/**
 * User Registration Cloud Function
 * Creates a new user account with validation and error handling
 */
Parse.Cloud.define('registerUser', async (request) => {
  const { firstName, lastName, email, phone, password } = request.params;
  
  try {
    // Validate required fields
    if (!firstName || !lastName || !email || !password) {
      throw new Parse.Error(Parse.Error.INVALID_QUERY, 'Missing required fields: firstName, lastName, email, password');
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      throw new Parse.Error(Parse.Error.INVALID_EMAIL_ADDRESS, 'Invalid email format');
    }

    // Validate password strength
    if (password.length < 6) {
      throw new Parse.Error(Parse.Error.INVALID_QUERY, 'Password must be at least 6 characters long');
    }

    // Check if user already exists
    const existingUser = new Parse.Query(Parse.User);
    existingUser.equalTo('email', email.toLowerCase());
    const existing = await existingUser.first({ useMasterKey: true });
    
    if (existing) {
      throw new Parse.Error(Parse.Error.EMAIL_TAKEN, 'An account with this email already exists');
    }

    // Create new user
    const user = new Parse.User();
    user.set('username', email.toLowerCase()); // Use email as username
    user.set('email', email.toLowerCase());
    user.set('password', password);
    user.set('firstName', firstName.trim());
    user.set('lastName', lastName.trim());
    user.set('displayName', `${firstName.trim()} ${lastName.trim()}`);
    
    if (phone) {
      user.set('phone', phone.trim());
    }
    
    // Set additional user properties
    user.set('emailVerified', false);
    user.set('isActive', true);
    user.set('registrationDate', new Date());
    user.set('lastLogin', new Date());
    
    // Save the user
    const savedUser = await user.signUp();
    
    logger.info('User registered successfully', { 
      userId: savedUser.id, 
      email: email.toLowerCase(),
      displayName: `${firstName} ${lastName}`
    });

    // Return user data (excluding sensitive information)
    return {
      success: true,
      message: 'User registered successfully',
      user: {
        id: savedUser.id,
        username: savedUser.get('username'),
        email: savedUser.get('email'),
        firstName: savedUser.get('firstName'),
        lastName: savedUser.get('lastName'),
        displayName: savedUser.get('displayName'),
        phone: savedUser.get('phone'),
        emailVerified: savedUser.get('emailVerified'),
        sessionToken: savedUser.getSessionToken()
      }
    };

  } catch (error) {
    logger.error('User registration failed', { 
      email: email?.toLowerCase(), 
      error: error.message 
    });
    
    // Handle specific Parse errors
    if (error instanceof Parse.Error) {
      throw error;
    }
    
    // Handle generic errors
    throw new Parse.Error(Parse.Error.INTERNAL_SERVER_ERROR, 'Registration failed. Please try again.');
  }
});

/**
 * User Login Cloud Function
 * Authenticates user and returns session information
 */
Parse.Cloud.define('loginUser', async (request) => {
  const { email, password, rememberMe } = request.params;
  
  try {
    // Validate required fields
    if (!email || !password) {
      throw new Parse.Error(Parse.Error.INVALID_QUERY, 'Email and password are required');
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      throw new Parse.Error(Parse.Error.INVALID_EMAIL_ADDRESS, 'Invalid email format');
    }

    // Attempt to log in the user
    const user = await Parse.User.logIn(email.toLowerCase(), password);
    
    // Update last login time
    user.set('lastLogin', new Date());
    await user.save(null, { useMasterKey: true });
    
    logger.info('User logged in successfully', { 
      userId: user.id, 
      email: email.toLowerCase(),
      rememberMe: !!rememberMe
    });

    // Return user data and session information
    return {
      success: true,
      message: 'Login successful',
      user: {
        id: user.id,
        username: user.get('username'),
        email: user.get('email'),
        firstName: user.get('firstName'),
        lastName: user.get('lastName'),
        displayName: user.get('displayName'),
        phone: user.get('phone'),
        emailVerified: user.get('emailVerified'),
        lastLogin: user.get('lastLogin'),
        sessionToken: user.getSessionToken()
      },
      rememberMe: !!rememberMe
    };

  } catch (error) {
    logger.error('User login failed', { 
      email: email?.toLowerCase(), 
      error: error.message 
    });
    
    // Handle specific Parse errors
    if (error instanceof Parse.Error) {
      // Customize error messages for better UX
      if (error.code === Parse.Error.OBJECT_NOT_FOUND) {
        throw new Parse.Error(Parse.Error.OBJECT_NOT_FOUND, 'Invalid email or password');
      }
      throw error;
    }
    
    // Handle generic errors
    throw new Parse.Error(Parse.Error.INTERNAL_SERVER_ERROR, 'Login failed. Please try again.');
  }
});

/**
 * Logout User Cloud Function
 * Logs out the current user and invalidates session
 */
Parse.Cloud.define('logoutUser', async (request) => {
  try {
    if (!request.user) {
      throw new Parse.Error(Parse.Error.INVALID_SESSION_TOKEN, 'No user session found');
    }

    const userId = request.user.id;
    const email = request.user.get('email');
    
    // Log the logout attempt
    logger.info('User logout initiated', { userId, email });
    
    // Parse handles session invalidation automatically when using Parse.User.logOut()
    // But since we're in a cloud function, we'll return success and let the client handle logout
    
    return {
      success: true,
      message: 'Logout successful'
    };

  } catch (error) {
    logger.error('User logout failed', { 
      userId: request.user?.id, 
      error: error.message 
    });
    
    if (error instanceof Parse.Error) {
      throw error;
    }
    
    throw new Parse.Error(Parse.Error.INTERNAL_SERVER_ERROR, 'Logout failed. Please try again.');
  }
});

/**
 * Get Current User Cloud Function
 * Returns current user information
 */
Parse.Cloud.define('getCurrentUser', async (request) => {
  try {
    if (!request.user) {
      throw new Parse.Error(Parse.Error.INVALID_SESSION_TOKEN, 'No user session found');
    }

    const user = request.user;
    
    // Fetch fresh user data
    await user.fetch({ useMasterKey: true });
    
    return {
      success: true,
      user: {
        id: user.id,
        username: user.get('username'),
        email: user.get('email'),
        firstName: user.get('firstName'),
        lastName: user.get('lastName'),
        displayName: user.get('displayName'),
        phone: user.get('phone'),
        emailVerified: user.get('emailVerified'),
        lastLogin: user.get('lastLogin'),
        registrationDate: user.get('registrationDate'),
        isActive: user.get('isActive')
      }
    };

  } catch (error) {
    logger.error('Get current user failed', { 
      userId: request.user?.id, 
      error: error.message 
    });
    
    if (error instanceof Parse.Error) {
      throw error;
    }
    
    throw new Parse.Error(Parse.Error.INTERNAL_SERVER_ERROR, 'Failed to get user information');
  }
});

/**
 * Update User Profile Cloud Function
 * Updates user profile information
 */
Parse.Cloud.define('updateUserProfile', async (request) => {
  const { firstName, lastName, phone } = request.params;
  
  try {
    if (!request.user) {
      throw new Parse.Error(Parse.Error.INVALID_SESSION_TOKEN, 'No user session found');
    }

    const user = request.user;
    
    // Update fields if provided
    if (firstName !== undefined) {
      user.set('firstName', firstName.trim());
    }
    
    if (lastName !== undefined) {
      user.set('lastName', lastName.trim());
    }
    
    if (phone !== undefined) {
      user.set('phone', phone.trim());
    }
    
    // Update display name if first or last name changed
    if (firstName !== undefined || lastName !== undefined) {
      const newFirstName = firstName !== undefined ? firstName.trim() : user.get('firstName');
      const newLastName = lastName !== undefined ? lastName.trim() : user.get('lastName');
      user.set('displayName', `${newFirstName} ${newLastName}`);
    }
    
    // Save the user
    const savedUser = await user.save(null, { useMasterKey: true });
    
    logger.info('User profile updated', { 
      userId: user.id, 
      email: user.get('email')
    });

    return {
      success: true,
      message: 'Profile updated successfully',
      user: {
        id: savedUser.id,
        username: savedUser.get('username'),
        email: savedUser.get('email'),
        firstName: savedUser.get('firstName'),
        lastName: savedUser.get('lastName'),
        displayName: savedUser.get('displayName'),
        phone: savedUser.get('phone'),
        emailVerified: savedUser.get('emailVerified')
      }
    };

  } catch (error) {
    logger.error('Update user profile failed', { 
      userId: request.user?.id, 
      error: error.message 
    });
    
    if (error instanceof Parse.Error) {
      throw error;
    }
    
    throw new Parse.Error(Parse.Error.INTERNAL_SERVER_ERROR, 'Profile update failed. Please try again.');
  }
});

logger.info('Login API cloud functions loaded successfully');
