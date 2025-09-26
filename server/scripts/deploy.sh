#!/bin/bash

# HaRaaS Heroku Deployment Script

set -e

echo "🚀 Starting HaRaaS deployment to Heroku..."

# Check if Heroku CLI is installed
if ! command -v heroku &> /dev/null; then
    echo "❌ Heroku CLI is not installed. Please install it first:"
    echo "   https://devcenter.heroku.com/articles/heroku-cli"
    exit 1
fi

# Check if logged in to Heroku
if ! heroku auth:whoami &> /dev/null; then
    echo "❌ Not logged in to Heroku. Please run 'heroku login' first."
    exit 1
fi

# Get app name
read -p "Enter your Heroku app name (or press Enter to create new): " APP_NAME

if [ -z "$APP_NAME" ]; then
    echo "Creating new Heroku app..."
    APP_NAME=$(heroku create --json | jq -r '.name')
    echo "✅ Created app: $APP_NAME"
else
    # Check if app exists
    if ! heroku apps:info $APP_NAME &> /dev/null; then
        echo "Creating app: $APP_NAME"
        heroku create $APP_NAME
    fi
fi

echo "📝 Setting up environment variables..."

# Required environment variables
heroku config:set NODE_ENV=production -a $APP_NAME
heroku config:set APP_ID=$(openssl rand -hex 16) -a $APP_NAME
heroku config:set MASTER_KEY=$(openssl rand -hex 32) -a $APP_NAME
heroku config:set ENCRYPTION_KEY=$(openssl rand -hex 32) -a $APP_NAME
heroku config:set SERVER_URL_PROD=https://$APP_NAME.herokuapp.com/parse -a $APP_NAME
heroku config:set DASHBOARD_USERNAME=admin -a $APP_NAME
heroku config:set DASHBOARD_PASSWORD=$(openssl rand -hex 16) -a $APP_NAME

echo "⚠️  IMPORTANT: You need to set your DATABASE_URI manually:"
echo "   heroku config:set DATABASE_URI='your-mongodb-connection-string' -a $APP_NAME"
echo ""
echo "📖 For MongoDB Atlas setup, see: https://www.mongodb.com/cloud/atlas"

# Add git remote if not exists
if ! git remote get-url heroku &> /dev/null; then
    heroku git:remote -a $APP_NAME
fi

echo "🔄 Deploying to Heroku..."
git add .
git commit -m "Deploy HaRaaS Parse Server" || echo "No changes to commit"
git push heroku main

echo "✅ Deployment complete!"
echo ""
echo "🌐 Your app is available at:"
echo "   App: https://$APP_NAME.herokuapp.com"
echo "   API: https://$APP_NAME.herokuapp.com/parse"
echo "   Dashboard: https://$APP_NAME.herokuapp.com/dashboard"
echo ""
echo "🔑 Dashboard credentials:"
echo "   Username: admin"
echo "   Password: $(heroku config:get DASHBOARD_PASSWORD -a $APP_NAME)"
echo ""
echo "⚠️  Don't forget to set your DATABASE_URI!"
echo "   heroku config:set DATABASE_URI='your-mongodb-connection-string' -a $APP_NAME"
