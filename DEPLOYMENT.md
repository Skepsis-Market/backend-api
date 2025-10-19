# EC2 Deployment Guide

## Prerequisites
- AWS EC2 instance (Ubuntu 22.04 LTS recommended)
- Node.js 18+ installed
- MongoDB installed
- Security group allowing inbound on port 3000 (or your chosen port)

---

## Step 1: Setup EC2 Instance

### SSH into EC2
```bash
ssh -i your-key.pem ubuntu@your-ec2-ip
```

### Install Node.js
```bash
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs
node --version  # Should be 18+
```

### Install MongoDB
```bash
# Import MongoDB GPG key
curl -fsSL https://www.mongodb.org/static/pgp/server-7.0.asc | \
   sudo gpg -o /usr/share/keyrings/mongodb-server-7.0.gpg \
   --dearmor

# Add MongoDB repository
echo "deb [ arch=amd64,arm64 signed-by=/usr/share/keyrings/mongodb-server-7.0.gpg ] https://repo.mongodb.org/apt/ubuntu jammy/mongodb-org/7.0 multiverse" | \
   sudo tee /etc/apt/sources.list.d/mongodb-org-7.0.list

# Install MongoDB
sudo apt-get update
sudo apt-get install -y mongodb-org

# Start MongoDB
sudo systemctl start mongod
sudo systemctl enable mongod
sudo systemctl status mongod
```

### Install PM2 (Process Manager)
```bash
sudo npm install -g pm2
```

---

## Step 2: Deploy Application

### Clone Repository
```bash
cd /home/ubuntu
git clone <your-repo-url> skepsis-backend
cd skepsis-backend
```

### Install Dependencies
```bash
npm install --production
```

### Configure Environment
```bash
nano .env
```

Add:
```env
PORT=3000
NODE_ENV=production
MONGODB_URI=mongodb://localhost:27017/skepsis
FRONTEND_URL=https://skepsis.live
```

### Build Application
```bash
npm run build
```

---

## Step 3: Start with PM2

### Start Application
```bash
pm2 start dist/main.js --name skepsis-backend
```

### Save PM2 Configuration
```bash
pm2 save
pm2 startup
# Follow the command output to enable PM2 on system boot
```

### Check Status
```bash
pm2 status
pm2 logs skepsis-backend
```

---

## Step 4: Configure Nginx (Optional - Reverse Proxy)

### Install Nginx
```bash
sudo apt-get install -y nginx
```

### Configure Nginx
```bash
sudo nano /etc/nginx/sites-available/skepsis-backend
```

Add:
```nginx
server {
    listen 80;
    server_name api.skepsis.live;  # Your domain

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }
}
```

### Enable Site
```bash
sudo ln -s /etc/nginx/sites-available/skepsis-backend /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

---

## Step 5: Setup SSL (Optional - Let's Encrypt)

```bash
sudo apt-get install -y certbot python3-certbot-nginx
sudo certbot --nginx -d api.skepsis.live
```

---

## Step 6: Firewall Configuration

### Using UFW
```bash
sudo ufw allow ssh
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw allow 3000/tcp  # Only if not using Nginx
sudo ufw enable
sudo ufw status
```

### AWS Security Group
Add inbound rules:
- SSH (22) from your IP
- HTTP (80) from anywhere
- HTTPS (443) from anywhere
- Custom TCP (3000) from anywhere (if not using Nginx)

---

## Management Commands

### PM2 Commands
```bash
pm2 list                    # List all apps
pm2 logs skepsis-backend    # View logs
pm2 restart skepsis-backend # Restart app
pm2 stop skepsis-backend    # Stop app
pm2 delete skepsis-backend  # Remove app
```

### MongoDB Commands
```bash
sudo systemctl status mongod    # Check status
sudo systemctl restart mongod   # Restart
sudo systemctl stop mongod      # Stop
mongosh                         # Connect to MongoDB shell
```

### Check Application
```bash
curl http://localhost:3000/api/waitlist/validate/TEST123
```

---

## Deployment Updates

### Update Code
```bash
cd /home/ubuntu/skepsis-backend
git pull origin main
npm install --production
npm run build
pm2 restart skepsis-backend
```

---

## Monitoring

### Setup PM2 Monitoring
```bash
pm2 install pm2-logrotate
pm2 set pm2-logrotate:max_size 10M
pm2 set pm2-logrotate:retain 7
```

### View Metrics
```bash
pm2 monit
```

---

## Backup MongoDB

### Manual Backup
```bash
mongodump --db skepsis --out /home/ubuntu/backups/$(date +%Y%m%d)
```

### Automated Daily Backup (Cron)
```bash
crontab -e
```

Add:
```cron
0 2 * * * mongodump --db skepsis --out /home/ubuntu/backups/$(date +\%Y\%m\%d)
```

---

## Troubleshooting

### Check Logs
```bash
pm2 logs skepsis-backend --lines 100
```

### Check MongoDB Connection
```bash
mongosh --eval "db.version()"
```

### Check Port
```bash
sudo lsof -i :3000
```

### Restart Everything
```bash
pm2 restart skepsis-backend
sudo systemctl restart mongod
sudo systemctl restart nginx
```

---

## Environment Variables for Production

```env
PORT=3000
NODE_ENV=production
MONGODB_URI=mongodb://localhost:27017/skepsis
FRONTEND_URL=https://skepsis.live
```

---

## Security Recommendations

1. **Keep packages updated**
   ```bash
   npm audit
   npm audit fix
   ```

2. **Firewall**: Only allow necessary ports
3. **MongoDB**: Bind to localhost only (default)
4. **Environment variables**: Never commit `.env` to git
5. **SSH**: Disable password auth, use keys only
6. **Updates**: Keep Ubuntu and packages updated
   ```bash
   sudo apt update && sudo apt upgrade -y
   ```

---

## Cost Optimization

- **EC2**: t3.micro or t3.small (eligible for free tier)
- **MongoDB**: Use local MongoDB or MongoDB Atlas free tier
- **Storage**: 8-20GB EBS volume
- **Bandwidth**: Monitor data transfer costs

---

## Success! 🚀

Your Skepsis backend should now be running on EC2 and accessible via:
- `http://your-ec2-ip:3000/api/waitlist/...`
- `https://api.skepsis.live/api/waitlist/...` (if using domain)
