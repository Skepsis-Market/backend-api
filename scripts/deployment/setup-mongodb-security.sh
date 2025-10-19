#!/bin/bash
set -e

echo "================================================"
echo "MongoDB Security Setup"
echo "================================================"
echo ""

# Prompt for passwords
echo "🔐 Setting up MongoDB authentication..."
echo ""
read -sp "Enter password for MongoDB admin user: " ADMIN_PASSWORD
echo ""
read -sp "Enter password for skepsis app user: " APP_PASSWORD
echo ""
echo ""

# Create admin user
echo "👤 Creating admin user..."
mongosh admin --eval "
db.createUser({
  user: 'admin',
  pwd: '$ADMIN_PASSWORD',
  roles: [
    { role: 'userAdminAnyDatabase', db: 'admin' },
    { role: 'readWriteAnyDatabase', db: 'admin' }
  ]
})
" 2>/dev/null || echo "⚠️  Admin user may already exist"

# Create app user
echo "👤 Creating application user..."
mongosh admin --eval "
db.createUser({
  user: 'skepsis_app',
  pwd: '$APP_PASSWORD',
  roles: [
    { role: 'readWrite', db: 'skepsis' }
  ]
})
" 2>/dev/null || echo "⚠️  App user may already exist"

# Enable authentication in MongoDB config
echo ""
echo "🔒 Enabling authentication in MongoDB..."
sudo bash -c 'cat > /tmp/mongod-auth.conf << EOF
security:
  authorization: enabled
net:
  bindIp: 127.0.0.1
  port: 27017
EOF'

# Backup original config
if [ ! -f /etc/mongod.conf.backup ]; then
    sudo cp /etc/mongod.conf /etc/mongod.conf.backup
fi

# Append security settings if not present
if ! grep -q "authorization: enabled" /etc/mongod.conf; then
    echo "" | sudo tee -a /etc/mongod.conf
    echo "security:" | sudo tee -a /etc/mongod.conf
    echo "  authorization: enabled" | sudo tee -a /etc/mongod.conf
fi

# Ensure bind to localhost
sudo sed -i 's/bindIp:.*/bindIp: 127.0.0.1/' /etc/mongod.conf

# Restart MongoDB
echo ""
echo "🔄 Restarting MongoDB..."
sudo systemctl restart mongod
sleep 3

# Test connection
echo ""
echo "🧪 Testing authentication..."
if mongosh "mongodb://skepsis_app:$APP_PASSWORD@localhost:27017/skepsis" --eval "db.runCommand({ ping: 1 })" > /dev/null 2>&1; then
    echo "✅ Authentication working!"
else
    echo "❌ Authentication test failed"
    exit 1
fi

# Save connection string template
echo ""
echo "💾 Saving connection string..."
cat > /home/ubuntu/.mongodb-credentials << EOF
MongoDB Connection Details
==========================
Admin User: admin
Admin Password: $ADMIN_PASSWORD

App User: skepsis_app
App Password: $APP_PASSWORD

Connection String (for .env):
MONGODB_URI=mongodb://skepsis_app:$APP_PASSWORD@localhost:27017/skepsis

Admin Connection String:
mongodb://admin:$ADMIN_PASSWORD@localhost:27017/admin
EOF
chmod 600 /home/ubuntu/.mongodb-credentials

echo ""
echo "================================================"
echo "✅ MongoDB security configured successfully!"
echo "================================================"
echo ""
echo "Credentials saved to: /home/ubuntu/.mongodb-credentials"
echo ""
echo "⚠️  IMPORTANT: Save these credentials securely!"
echo ""
echo "Connection string for .env file:"
echo "MONGODB_URI=mongodb://skepsis_app:$APP_PASSWORD@localhost:27017/skepsis"
echo ""
echo "Next step: Clone your repository and run ./deploy-app.sh"
echo ""
