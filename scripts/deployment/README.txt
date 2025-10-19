Skepsis Backend - AWS Deployment Scripts
=========================================

DEPLOYMENT ORDER:
================

1. FRESH INSTALLATION (First Time Setup)
   -------------------------------------
   a) SSH into your EC2 instance:
      ssh -i your-key.pem ubuntu@your-ec2-ip

   b) Upload deployment scripts:
      scp -i your-key.pem -r scripts/deployment ubuntu@your-ec2-ip:~/
   
   c) Make scripts executable:
      cd ~/deployment
      chmod +x *.sh
   
   d) Run setup in order:
      ./setup-dependencies.sh        # Installs Node.js, MongoDB, PM2
      ./setup-mongodb-security.sh    # Secures MongoDB with auth
      
   e) Clone your repository:
      cd /home/ubuntu
      git clone <your-repo-url> skepsis-backend
      cd skepsis-backend
   
   f) Create .env file:
      nano .env
      # Add: PORT, MONGODB_URI (from previous step), FRONTEND_URL
   
   g) Deploy application:
      ~/deployment/deploy-app.sh     # Builds and starts app
   
   h) Optional - Setup Nginx reverse proxy:
      ~/deployment/setup-nginx.sh    # Setup domain and SSL
   
   i) Optional - Configure firewall:
      ~/deployment/setup-firewall.sh # UFW security rules


2. UPDATES (After Initial Setup)
   ------------------------------
   For quick code updates:
   
   cd skepsis-backend
   ~/deployment/quick-deploy.sh    # Pull, build, restart


3. MONITORING
   ----------
   pm2 status                    # Check app status
   pm2 logs skepsis-backend      # View logs
   pm2 monit                     # Resource monitoring
   sudo systemctl status mongod  # MongoDB status


4. TROUBLESHOOTING
   ---------------
   # Check if app is running
   curl http://localhost:3000/api/waitlist/validate/TEST123
   
   # View logs
   pm2 logs skepsis-backend --lines 100
   
   # Restart everything
   pm2 restart skepsis-backend
   sudo systemctl restart mongod
   sudo systemctl restart nginx
   
   # Check MongoDB credentials
   cat /home/ubuntu/.mongodb-credentials


5. SECURITY CHECKLIST
   ------------------
   ✅ MongoDB authentication enabled
   ✅ MongoDB bound to localhost only
   ✅ Firewall rules configured (UFW)
   ✅ .env file with secure credentials
   ✅ SSL certificate (if using Nginx)
   ✅ Regular backups scheduled
   

6. AWS SECURITY GROUP REQUIREMENTS
   --------------------------------
   Inbound Rules:
   - SSH (22) from your IP only
   - HTTP (80) from anywhere (0.0.0.0/0)
   - HTTPS (443) from anywhere (0.0.0.0/0)
   
   DO NOT OPEN:
   - Port 3000 (Node.js) - use Nginx proxy
   - Port 27017 (MongoDB) - localhost only


7. BACKUP
   -------
   Manual backup:
   mongodump --uri="mongodb://skepsis_app:PASSWORD@localhost:27017/skepsis" \
             --out=/home/ubuntu/backups/$(date +%Y%m%d)
   
   Automated daily backup (already in setup-dependencies.sh):
   Backups stored in /home/ubuntu/backups/


NOTES:
======
- All scripts check for existing installations
- MongoDB credentials saved to ~/.mongodb-credentials
- PM2 configured for auto-restart on server reboot
- Log rotation configured (10MB max, 7 days retention)
- Scripts are idempotent (safe to run multiple times)


SUPPORT:
========
If you encounter issues:
1. Check logs: pm2 logs skepsis-backend
2. Verify MongoDB: mongosh [connection-string]
3. Check firewall: sudo ufw status
4. Test endpoints: curl http://localhost:3000/api/...
