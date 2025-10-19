#!/bin/bash
set -e

echo "================================================"
echo "Skepsis Backend - Application Deployment"
echo "================================================"
echo ""

# Variables
APP_NAME="skepsis-backend"

# Auto-detect app directory (find package.json)
if [ -f "package.json" ]; then
    APP_DIR=$(pwd)
    echo "✅ Detected app directory: $APP_DIR"
elif [ -d "/home/ubuntu/skepsis-backend" ]; then
    APP_DIR="/home/ubuntu/skepsis-backend"
    cd $APP_DIR
elif [ -d "/home/ubuntu/backend-api" ]; then
    APP_DIR="/home/ubuntu/backend-api"
    cd $APP_DIR
else
    echo "❌ Application directory not found!"
    echo "Please run this script from your app directory, or ensure your repo is in:"
    echo "  /home/ubuntu/skepsis-backend OR"
    echo "  /home/ubuntu/backend-api"
    exit 1
fi

cd $APP_DIR

# Check for .env file
if [ ! -f ".env" ]; then
    echo "⚠️  .env file not found!"
    echo ""
    echo "Creating .env template..."
    cat > .env << 'EOF'
PORT=3000
NODE_ENV=production
MONGODB_URI=mongodb://skepsis_app:YOUR_PASSWORD@localhost:27017/skepsis
FRONTEND_URL=https://skepsis.live
EOF
    echo ""
    echo "❌ Please edit .env file with correct values:"
    echo "  nano $APP_DIR/.env"
    echo ""
    echo "Then run this script again."
    exit 1
fi

# Install dependencies
echo "📦 Installing dependencies..."
npm install --production

# Build application
echo ""
echo "🔨 Building application..."
npm run build

# Check if build was successful
if [ ! -d "dist" ]; then
    echo "❌ Build failed - dist directory not found"
    exit 1
fi

# Stop existing PM2 process if running
echo ""
echo "🔄 Stopping existing processes..."
pm2 stop $APP_NAME 2>/dev/null || echo "No existing process to stop"
pm2 delete $APP_NAME 2>/dev/null || echo "No existing process to delete"

# Start with PM2
echo ""
echo "🚀 Starting application with PM2..."
pm2 start dist/main.js --name $APP_NAME

# Save PM2 configuration
echo ""
echo "💾 Saving PM2 configuration..."
pm2 save

# Setup PM2 startup script (if not already done)
if [ ! -f /etc/systemd/system/pm2-ubuntu.service ]; then
    echo ""
    echo "⚙️  Setting up PM2 startup script..."
    pm2 startup systemd -u ubuntu --hp /home/ubuntu | tail -n 1 | sudo bash
fi

# Setup log rotation
echo ""
echo "📝 Setting up log rotation..."
pm2 install pm2-logrotate 2>/dev/null || echo "pm2-logrotate already installed"
pm2 set pm2-logrotate:max_size 10M
pm2 set pm2-logrotate:retain 7

# Show status
echo ""
echo "📊 Application Status:"
pm2 status

echo ""
echo "📋 Recent Logs:"
pm2 logs $APP_NAME --lines 20 --nostream

echo ""
echo "================================================"
echo "✅ Deployment completed successfully!"
echo "================================================"
echo ""
echo "Application is running on:"
echo "  http://localhost:3000"
echo ""
echo "Useful commands:"
echo "  pm2 status                  - Check status"
echo "  pm2 logs $APP_NAME          - View logs"
echo "  pm2 restart $APP_NAME       - Restart app"
echo "  pm2 monit                   - Monitor resources"
echo ""
echo "Test the API:"
echo "  curl http://localhost:3000/api/waitlist/validate/TEST123"
echo ""
