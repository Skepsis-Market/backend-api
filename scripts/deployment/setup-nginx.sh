#!/bin/bash
set -e

echo "================================================"
echo "Nginx Reverse Proxy Setup"
echo "================================================"
echo ""

# Prompt for domain
read -p "Enter your domain (e.g., api.skepsis.live): " DOMAIN

if [ -z "$DOMAIN" ]; then
    echo "❌ Domain is required"
    exit 1
fi

# Install Nginx
echo ""
echo "📦 Installing Nginx..."
sudo apt-get install -y nginx

# Add rate limiting to main nginx config
echo ""
echo "⚙️  Configuring rate limiting..."
if ! grep -q "limit_req_zone" /etc/nginx/nginx.conf; then
    sudo sed -i '/http {/a \    limit_req_zone $binary_remote_addr zone=api_limit:10m rate=10r/s;' /etc/nginx/nginx.conf
fi

# Create Nginx configuration
echo ""
echo "⚙️  Creating Nginx configuration..."
sudo bash -c "cat > /etc/nginx/sites-available/skepsis-backend << 'EOF'
server {
    listen 80;
    server_name $DOMAIN;

    # Security headers
    add_header X-Frame-Options \"SAMEORIGIN\" always;
    add_header X-Content-Type-Options \"nosniff\" always;
    add_header X-XSS-Protection \"1; mode=block\" always;

    # Max body size
    client_max_body_size 10M;

    # Proxy settings
    location / {
        # Rate limiting
        limit_req zone=api_limit burst=20 nodelay;
        
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        
        # WebSocket support
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        
        # Headers
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        
        # Timeouts
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
        
        # Cache bypass
        proxy_cache_bypass \$http_upgrade;
    }
}
EOF"

# Replace $DOMAIN in the config
sudo sed -i "s/\$DOMAIN/$DOMAIN/g" /etc/nginx/sites-available/skepsis-backend

# Enable site
echo ""
echo "🔗 Enabling site..."
sudo ln -sf /etc/nginx/sites-available/skepsis-backend /etc/nginx/sites-enabled/

# Remove default site
sudo rm -f /etc/nginx/sites-enabled/default

# Test configuration
echo ""
echo "🧪 Testing Nginx configuration..."
sudo nginx -t

# Restart Nginx
echo ""
echo "🔄 Restarting Nginx..."
sudo systemctl restart nginx
sudo systemctl enable nginx

echo ""
echo "================================================"
echo "✅ Nginx configured successfully!"
echo "================================================"
echo ""
echo "Your API is now accessible at:"
echo "  http://$DOMAIN"
echo ""
echo "To setup SSL (HTTPS), run:"
echo "  sudo apt-get install -y certbot python3-certbot-nginx"
echo "  sudo certbot --nginx -d $DOMAIN"
echo ""
echo "After SSL setup, your API will be at:"
echo "  https://$DOMAIN"
echo ""
