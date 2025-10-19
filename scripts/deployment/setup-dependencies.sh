#!/bin/bash
set -e

echo "================================================"
echo "Skepsis Backend - Dependency Installation Script"
echo "================================================"
echo ""

# Check if running as root
if [ "$EUID" -eq 0 ]; then 
   echo "❌ Please don't run as root. Run as ubuntu user."
   exit 1
fi

# Update system
echo "📦 Updating system packages..."
sudo apt-get update
sudo apt-get upgrade -y

# Install Node.js 18
echo ""
echo "📦 Installing Node.js 18..."
if ! command -v node &> /dev/null; then
    curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
    sudo apt-get install -y nodejs
else
    echo "✅ Node.js already installed"
fi
node --version
npm --version

# Install MongoDB 7.0
echo ""
echo "📦 Installing MongoDB 7.0..."
if ! command -v mongod &> /dev/null; then
    # Import GPG key
    curl -fsSL https://www.mongodb.org/static/pgp/server-7.0.asc | \
        sudo gpg -o /usr/share/keyrings/mongodb-server-7.0.gpg --dearmor

    # Add repository
    echo "deb [ arch=amd64,arm64 signed-by=/usr/share/keyrings/mongodb-server-7.0.gpg ] https://repo.mongodb.org/apt/ubuntu jammy/mongodb-org/7.0 multiverse" | \
        sudo tee /etc/apt/sources.list.d/mongodb-org-7.0.list

    # Install
    sudo apt-get update
    sudo apt-get install -y mongodb-org

    # Start and enable
    sudo systemctl start mongod
    sudo systemctl enable mongod
else
    echo "✅ MongoDB already installed"
fi

# Check MongoDB status
echo ""
echo "🔍 Checking MongoDB status..."
sudo systemctl status mongod --no-pager || true

# Install PM2
echo ""
echo "📦 Installing PM2 (Process Manager)..."
sudo npm install -g pm2

# Install Git if not present
echo ""
echo "📦 Checking Git installation..."
if ! command -v git &> /dev/null; then
    sudo apt-get install -y git
else
    echo "✅ Git already installed"
fi

# Install build essentials
echo ""
echo "📦 Installing build essentials..."
sudo apt-get install -y build-essential

# Create backup directory
echo ""
echo "📁 Creating backup directory..."
mkdir -p /home/ubuntu/backups

echo ""
echo "================================================"
echo "✅ All dependencies installed successfully!"
echo "================================================"
echo ""
echo "Installed versions:"
echo "  - Node.js: $(node --version)"
echo "  - npm: $(npm --version)"
echo "  - MongoDB: $(mongod --version | head -n1)"
echo "  - PM2: $(pm2 --version)"
echo ""
echo "Next steps:"
echo "  1. Run: ./setup-mongodb-security.sh"
echo "  2. Clone your repository"
echo "  3. Run: ./deploy-app.sh"
echo ""
