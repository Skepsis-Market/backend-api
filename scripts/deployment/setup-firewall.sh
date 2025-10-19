#!/bin/bash
set -e

echo "================================================"
echo "Firewall (UFW) Setup"
echo "================================================"
echo ""

# Install UFW if not present
sudo apt-get install -y ufw

echo "🔒 Configuring firewall rules..."

# Reset UFW to default
sudo ufw --force reset

# Default policies
sudo ufw default deny incoming
sudo ufw default allow outgoing

# Allow SSH (CRITICAL - don't lock yourself out!)
sudo ufw allow ssh
echo "✅ SSH (22) allowed"

# Allow HTTP
sudo ufw allow 80/tcp
echo "✅ HTTP (80) allowed"

# Allow HTTPS
sudo ufw allow 443/tcp
echo "✅ HTTPS (443) allowed"

# Block direct access to MongoDB
sudo ufw deny 27017/tcp
echo "🚫 MongoDB (27017) blocked from external access"

# Block direct access to Node.js app (force through Nginx)
sudo ufw deny 3000/tcp
echo "🚫 Node.js (3000) blocked from external access"

# Enable UFW
echo ""
echo "🔥 Enabling firewall..."
echo "y" | sudo ufw enable

# Show status
echo ""
echo "📊 Firewall Status:"
sudo ufw status verbose

echo ""
echo "================================================"
echo "✅ Firewall configured successfully!"
echo "================================================"
echo ""
echo "Security rules applied:"
echo "  ✅ SSH access allowed"
echo "  ✅ HTTP/HTTPS traffic allowed"
echo "  🚫 Direct MongoDB access blocked"
echo "  🚫 Direct Node.js access blocked (use Nginx)"
echo ""
echo "⚠️  IMPORTANT: Make sure you can SSH before logging out!"
echo ""
