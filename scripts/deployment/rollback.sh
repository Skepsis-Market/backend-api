#!/bin/bash
set -e

# ================================================
# Skepsis Backend - Rollback Script
# ================================================
# This script rolls back to a previous deployment
# Usage: ./rollback.sh [commit-hash] [backup-path]
# ================================================

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

log() {
    echo -e "${GREEN}[$(date +'%Y-%m-%d %H:%M:%S')]${NC} $1"
}

error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

echo ""
echo "================================================"
echo "  Skepsis Backend - Rollback"
echo "================================================"
echo ""

# Get parameters
ROLLBACK_COMMIT=$1
BACKUP_PATH=$2

# Auto-detect app directory
if [ -f "package.json" ]; then
    APP_DIR=$(pwd)
elif [ -d "/home/ubuntu/skepsis-backend" ]; then
    APP_DIR="/home/ubuntu/skepsis-backend"
elif [ -d "/home/ubuntu/backend-api" ]; then
    APP_DIR="/home/ubuntu/backend-api"
else
    error "Application directory not found!"
    exit 1
fi

cd $APP_DIR

# If no commit provided, try to read from file
if [ -z "$ROLLBACK_COMMIT" ]; then
    if [ -f "/tmp/pre-deploy-commit.txt" ]; then
        ROLLBACK_COMMIT=$(cat /tmp/pre-deploy-commit.txt)
        log "Found previous commit: $ROLLBACK_COMMIT"
    else
        error "No commit hash provided and no saved commit found"
        echo "Usage: $0 <commit-hash> [backup-path]"
        exit 1
    fi
fi

warning "⚠️  ROLLBACK WARNING ⚠️"
echo ""
echo "You are about to rollback to commit: $ROLLBACK_COMMIT"
echo "Current directory: $APP_DIR"
echo ""
echo "This will:"
echo "  1. Stop the application"
echo "  2. Revert code to previous commit"
echo "  3. Rebuild the application"
echo "  4. Optionally restore database backup"
echo "  5. Restart the application"
echo ""
echo "Continue? (yes/no)"
read -r REPLY

if [[ ! $REPLY =~ ^[Yy][Ee][Ss]$ ]]; then
    log "Rollback cancelled"
    exit 0
fi

# ================================================
# Step 1: Stop Service
# ================================================
log "Step 1: Stopping service..."

if command -v pm2 &> /dev/null; then
    pm2 stop skepsis-backend || true
elif command -v systemctl &> /dev/null; then
    sudo systemctl stop skepsis-backend || true
fi

log "✅ Service stopped"

# ================================================
# Step 2: Revert Code
# ================================================
log "Step 2: Reverting code to $ROLLBACK_COMMIT..."

# Stash any changes
git stash

# Checkout previous commit
git checkout $ROLLBACK_COMMIT

log "✅ Code reverted"

# ================================================
# Step 3: Rebuild
# ================================================
log "Step 3: Rebuilding application..."

npm ci
npm run build

log "✅ Application rebuilt"

# ================================================
# Step 4: Database Restore (Optional)
# ================================================
if [ -n "$BACKUP_PATH" ]; then
    log "Step 4: Restoring database from backup..."
    
    if [ ! -d "$BACKUP_PATH" ]; then
        error "Backup path not found: $BACKUP_PATH"
        warning "Skipping database restore"
    else
        # Load .env for MONGODB_URI
        source .env
        
        if [ -z "$MONGODB_URI" ]; then
            error "MONGODB_URI not set in .env"
            exit 1
        fi
        
        warning "About to restore database from: $BACKUP_PATH"
        echo "This will overwrite current database data!"
        echo "Continue? (yes/no)"
        read -r DB_REPLY
        
        if [[ $DB_REPLY =~ ^[Yy][Ee][Ss]$ ]]; then
            mongorestore --uri="$MONGODB_URI" --drop "$BACKUP_PATH"
            log "✅ Database restored"
        else
            warning "Database restore skipped"
        fi
    fi
else
    log "Step 4: No backup path provided, skipping database restore"
fi

# ================================================
# Step 5: Restart Service
# ================================================
log "Step 5: Restarting service..."

if command -v pm2 &> /dev/null; then
    pm2 restart skepsis-backend
    pm2 status skepsis-backend
elif command -v systemctl &> /dev/null; then
    sudo systemctl start skepsis-backend
    sudo systemctl status skepsis-backend --no-pager
fi

log "✅ Service restarted"

# ================================================
# Verification
# ================================================
log "Verifying rollback..."

sleep 3

# Check if service is running
if command -v pm2 &> /dev/null; then
    if pm2 list | grep -q "online.*skepsis-backend"; then
        log "✅ Service is running"
    else
        error "Service is not running properly"
        pm2 logs skepsis-backend --lines 30
        exit 1
    fi
fi

# Test API
source .env
PORT=${PORT:-3000}

if curl -f -s "http://localhost:$PORT/api/markets" > /dev/null; then
    log "✅ API is responding"
else
    warning "⚠️  API may not be responding, check logs"
fi

# ================================================
# Summary
# ================================================
echo ""
echo "================================================"
log "✅ Rollback completed successfully!"
echo "================================================"
echo ""
echo "Current commit: $(git rev-parse HEAD)"
echo ""
echo "Please verify:"
echo "  1. Check logs: pm2 logs skepsis-backend"
echo "  2. Test critical endpoints"
echo "  3. Monitor for any issues"
echo ""
