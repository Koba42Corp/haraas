# Quick Start Guide

## 🚀 Deploy to Heroku in 5 Minutes

### Prerequisites
- [Heroku CLI](https://devcenter.heroku.com/articles/heroku-cli) installed
- [Git](https://git-scm.com/) installed
- MongoDB database (we recommend [MongoDB Atlas](https://www.mongodb.com/cloud/atlas) - free tier available)

### Step 1: Setup MongoDB Atlas (Free)
1. Go to [MongoDB Atlas](https://www.mongodb.com/cloud/atlas)
2. Create free account and cluster
3. Create database user (Database Access → Add New Database User)
4. Whitelist all IPs (Network Access → Add IP Address → Allow Access from Anywhere: `0.0.0.0/0`)
5. Get connection string (Clusters → Connect → Connect your application)

### Step 2: Deploy to Heroku
```bash
cd server
npm install
git init
git add .
git commit -m "Initial commit"

# Login to Heroku
heroku login

# Run deployment script
./scripts/deploy.sh
```

### Step 3: Set Database URI
```bash
# Replace with your MongoDB Atlas connection string
heroku config:set DATABASE_URI='mongodb+srv://username:password@cluster.mongodb.net/haraas'
```

### Step 4: Test Your Deployment
```bash
# Check if server is running
curl https://your-app-name.herokuapp.com/health

# Access Parse Dashboard
open https://your-app-name.herokuapp.com/dashboard
```

## 🧪 Local Development

### Setup
```bash
cd server
npm install
cp env.example .env
# Edit .env with your local settings
npm run dev
```

### Test Locally
- API: http://localhost:1337/parse
- Dashboard: http://localhost:1337/dashboard (admin/password)
- Health: http://localhost:1337/health

## 📱 Connect Your Client App

### JavaScript/React
```javascript
import Parse from 'parse';

Parse.initialize('your-app-id');
Parse.serverURL = 'https://your-app-name.herokuapp.com/parse';

// Test connection
const TestObject = Parse.Object.extend('TestObject');
const testObject = new TestObject();
testObject.set('message', 'Hello Parse!');
await testObject.save();
console.log('Object saved!');
```

### React Native
```javascript
import Parse from 'parse/react-native';

Parse.initialize('your-app-id');
Parse.serverURL = 'https://your-app-name.herokuapp.com/parse';
```

### iOS (Swift)
```swift
import ParseSwift

Parse.initialize(applicationId: "your-app-id", 
                clientKey: "", 
                serverURL: URL(string: "https://your-app-name.herokuapp.com/parse")!)
```

### Android (Java)
```java
Parse.initialize(new Parse.Configuration.Builder(this)
    .applicationId("your-app-id")
    .server("https://your-app-name.herokuapp.com/parse")
    .build()
);
```

## 🔧 Configuration

### Environment Variables
Get your app configuration:
```bash
heroku config -a your-app-name
```

Key variables:
- `APP_ID`: Your Parse application ID
- `MASTER_KEY`: Master key for admin operations
- `DATABASE_URI`: MongoDB connection string
- `DASHBOARD_USERNAME/PASSWORD`: Dashboard login credentials

### Custom Domain (Optional)
```bash
heroku domains:add yourdomain.com -a your-app-name
# Update SERVER_URL_PROD to use your domain
heroku config:set SERVER_URL_PROD=https://yourdomain.com/parse -a your-app-name
```

## 🛠️ Common Tasks

### View Logs
```bash
heroku logs --tail -a your-app-name
```

### Scale Dynos
```bash
heroku ps:scale web=1 -a your-app-name
```

### Backup Database
```bash
# MongoDB Atlas has automatic backups
# Or use mongodump for manual backup
```

### Update Server
```bash
git add .
git commit -m "Update server"
git push heroku main
```

## 🆘 Troubleshooting

### Server Won't Start
1. Check logs: `heroku logs -a your-app-name`
2. Verify DATABASE_URI is set correctly
3. Ensure all required environment variables are set

### Can't Access Dashboard
1. Check DASHBOARD_USERNAME and DASHBOARD_PASSWORD
2. Verify SERVER_URL_PROD is correct
3. Try accessing via direct URL: `https://your-app-name.herokuapp.com/dashboard`

### Database Connection Issues
1. Verify MongoDB Atlas cluster is running
2. Check IP whitelist includes `0.0.0.0/0`
3. Ensure database user has read/write permissions
4. Test connection string format

### CORS Errors
1. Check client app origin in server.js corsOptions
2. Verify SERVER_URL_PROD matches your Heroku app URL
3. Ensure HTTPS is used in production

## 📚 Next Steps

1. **Add Authentication**: Implement user registration/login in your client app
2. **Create Data Models**: Define your app's data structure using Parse Objects
3. **Add Cloud Functions**: Implement server-side logic in `cloud/main.js`
4. **Set up Push Notifications**: Configure push notifications for mobile apps
5. **Add File Storage**: Use Parse Files for image/document uploads
6. **Implement Live Queries**: Real-time data synchronization

## 🔗 Useful Links

- [Parse Server Guide](https://docs.parseplatform.org/parse-server/guide/)
- [Parse JavaScript SDK](https://docs.parseplatform.org/js/guide/)
- [Heroku Node.js Guide](https://devcenter.heroku.com/articles/getting-started-with-nodejs)
- [MongoDB Atlas Documentation](https://docs.atlas.mongodb.com/)
