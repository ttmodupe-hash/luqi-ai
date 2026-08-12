#!/bin/bash
# =============================================================================
# LUQI AI - Production Setup Script
# =============================================================================
# One-time setup script for production deployment.
# Configures the server, installs dependencies, and prepares the environment.
# =============================================================================

set -euo pipefail

# ---------------------------------------------------------------------------
# Configuration
# ---------------------------------------------------------------------------
APP_NAME="luqi-ai"
APP_DIR="/opt/${APP_NAME}"
APP_USER="${APP_NAME}"
APP_GROUP="${APP_NAME}"
PYTHON_VERSION="3.11"
NODE_VERSION="20"

# ---------------------------------------------------------------------------
# Logging
# ---------------------------------------------------------------------------
log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $*"
}

error() {
    log "ERROR: $*" >&2
    exit 1
}

# ---------------------------------------------------------------------------
# Pre-flight Checks
# ---------------------------------------------------------------------------
log "Starting LUQI AI production setup..."

if [ "$EUID" -ne 0 ]; then
    error "This script must be run as root"
fi

# ---------------------------------------------------------------------------
# System Update
# ---------------------------------------------------------------------------
log "Updating system packages..."
apt-get update
apt-get upgrade -y

# ---------------------------------------------------------------------------
# Install Dependencies
# ---------------------------------------------------------------------------
log "Installing system dependencies..."

apt-get install -y \
    curl \
    wget \
    git \
    build-essential \
    libpq-dev \
    python3-dev \
    python3-pip \
    python3-venv \
    nodejs \
    npm \
    nginx \
    redis-server \
    postgresql \
    postgresql-contrib \
    supervisor \
    certbot \
    python3-certbot-nginx \
    ufw \
    fail2ban \
    htop \
    tmux \
    vim

# ---------------------------------------------------------------------------
# Create Application User
# ---------------------------------------------------------------------------
log "Creating application user..."

if ! id "$APP_USER" &>/dev/null; then
    useradd -r -s /bin/false -d "$APP_DIR" "$APP_USER"
fi

# ---------------------------------------------------------------------------
# Create Directory Structure
# ---------------------------------------------------------------------------
log "Creating directory structure..."

mkdir -p "$APP_DIR"/{src,logs,backups,venv}
chown -R "$APP_USER:$APP_GROUP" "$APP_DIR"

# ---------------------------------------------------------------------------
# Configure PostgreSQL
# ---------------------------------------------------------------------------
log "Configuring PostgreSQL..."

systemctl enable postgresql
systemctl start postgresql

# Create database and user
sudo -u postgres psql -c "CREATE USER $APP_USER WITH PASSWORD 'changeme';" || true
sudo -u postgres psql -c "CREATE DATABASE ${APP_NAME} OWNER $APP_USER;" || true
sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE ${APP_NAME} TO $APP_USER;" || true

log "PostgreSQL configured. Remember to change the default password!"

# ---------------------------------------------------------------------------
# Configure Redis
# ---------------------------------------------------------------------------
log "Configuring Redis..."

systemctl enable redis-server
systemctl start redis-server

# ---------------------------------------------------------------------------
# Configure Nginx
# ---------------------------------------------------------------------------
log "Configuring Nginx..."

systemctl enable nginx
systemctl start nginx

# Remove default site
rm -f /etc/nginx/sites-enabled/default

# ---------------------------------------------------------------------------
# Configure Firewall
# ---------------------------------------------------------------------------
log "Configuring firewall..."

ufw default deny incoming
ufw default allow outgoing
ufw allow ssh
ufw allow http
ufw allow https
ufw --force enable

# ---------------------------------------------------------------------------
# Configure Fail2Ban
# ---------------------------------------------------------------------------
log "Configuring Fail2Ban..."

systemctl enable fail2ban
systemctl start fail2ban

# ---------------------------------------------------------------------------
# SSL Certificate (Let's Encrypt)
# ---------------------------------------------------------------------------
log "Setting up SSL certificate..."

# Note: Replace with your actual domain
# certbot --nginx -d api.luqi.ai -d app.luqi.ai --non-interactive --agree-tos --email admin@luqi.ai

log "SSL certificate setup skipped. Run certbot manually with your domain."

# ---------------------------------------------------------------------------
# Summary
# ---------------------------------------------------------------------------
log "Production setup complete!"
log ""
log "Next steps:"
log "  1. Change the PostgreSQL password"
log "  2. Run certbot with your domain"
log "  3. Deploy the application code to $APP_DIR/src"
log "  4. Configure environment variables"
log "  5. Start the application with supervisor"
log ""
log "Application directory: $APP_DIR"

exit 0
