#!/bin/bash
set -e

echo "================================================"
echo "Skepsis Backend - Quick Update Deployment"
echo "================================================"
echo ""

APP_NAME="skepsis-backend"

# Auto-detect app directory
if [ -f "package.json" ]; then
    APP_DIR=$(pwd)
elif [ -d "/home/ubuntu/skepsis-backend" ]; then
    APP_DIR="/home/ubuntu/skepsis-backend"
elif [ -d "/home/ubuntu/backend-api" ]; then
    APP_DIR="/home/ubuntu/backend-api"
else
    echo "❌ Application directory not found"
    exit 1
fi

cd $APP_DIR

echo "📥 Pulling latest code..."
git pull origin main

echo ""
echo "📦 Installing dependencies..."
npm install --production

echo ""
echo "🔨 Building application..."
npm run build

echo ""
echo "🔄 Restarting application..."
pm2 restart $APP_NAME

echo ""
echo "📊 Status:"
pm2 status

echo ""
echo "✅ Deployment complete!"
echo ""
echo "View logs: pm2 logs $APP_NAME"
echo ""
