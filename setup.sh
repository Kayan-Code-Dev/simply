#!/bin/bash
set -e

echo "========================================="
echo "Simply CRM - Subdomain Deployment"
echo "Domain: crm.simply.com"
echo "========================================="

# ============================================
# SWAP
# ============================================
echo "Creating swap file..."
if [ ! -f /swapfile ]; then
    fallocate -l 2G /swapfile || dd if=/dev/zero of=/swapfile bs=1M count=2048
    chmod 600 /swapfile
    mkswap /swapfile
    swapon /swapfile
    echo '/swapfile none swap sw 0 0' >> /etc/fstab
    echo "Swap created."
fi

# ============================================
# OS DETECT
# ============================================
if [ -f /etc/os-release ]; then
    . /etc/os-release
    OS_FAMILY=$ID_LIKE
    OS_ID=$ID
else
    OS_FAMILY="unknown"
    OS_ID="unknown"
fi

echo "OS: $OS_ID ($OS_FAMILY)"

# ============================================
# INSTALL PACKAGES
# ============================================
if [[ "$OS_ID" == "ubuntu" || "$OS_ID" == "debian" || "$OS_FAMILY" == *"debian"* ]]; then
    export DEBIAN_FRONTEND=noninteractive
    apt-get update -y
    apt-get install -y curl tar nginx mariadb-server git unzip redis-server certbot python3-certbot-nginx
    
    # Node.js 20
    if ! command -v node &> /dev/null; then
        curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
        apt-get install -y nodejs
    fi
    
    systemctl enable --now mariadb
    systemctl enable --now redis-server
    
elif [[ "$OS_ID" == "rocky" || "$OS_ID" == "almalinux" || "$OS_ID" == "centos" || "$OS_FAMILY" == *"rhel"* ]]; then
    dnf install -y epel-release
    dnf install -y curl tar nginx mariadb-server redis unzip git certbot python3-certbot-nginx
    
    if ! command -v node &> /dev/null; then
        curl -fsSL https://rpm.nodesource.com/setup_20.x | bash -
        dnf install -y nodejs
    fi
    
    systemctl enable --now mariadb
    systemctl enable --now redis
else
    echo "Unsupported OS: $OS_ID"
    exit 1
fi

# ============================================
# PM2
# ============================================
if ! command -v pm2 &> /dev/null; then
    npm install -g pm2
fi

# ============================================
# DATABASE
# ============================================
sleep 5
echo "Configuring database..."
mysql -e "CREATE DATABASE IF NOT EXISTS simply_crm;"
mysql -e "CREATE USER IF NOT EXISTS 'simply_user'@'localhost' IDENTIFIED BY 'SimplyPass123!';" || true
mysql -e "GRANT ALL PRIVILEGES ON simply_crm.* TO 'simply_user'@'localhost';"
mysql -e "FLUSH PRIVILEGES;"

# ============================================
# EXTRACT PROJECT
# ============================================
mkdir -p /var/www/simply-crm
cd /var/www/simply-crm

if [ -f /root/deploy.zip ]; then
    echo "Extracting deploy.zip..."
    unzip -o /root/deploy.zip -d /var/www/simply-crm
elif [ -f /root/deploy.tar.gz ]; then
    echo "Extracting deploy.tar.gz..."
    tar -xzf /root/deploy.tar.gz -C /var/www/simply-crm
else
    echo "❌ No deploy.zip or deploy.tar.gz found in /root/"
    echo "Please upload the project first!"
    exit 1
fi

# ============================================
# BACKEND SETUP
# ============================================
echo "Setting up backend..."
cd /var/www/simply-crm/backend

# .env
if [ ! -f .env ]; then
    cat <<EOF > .env
PORT=5000
DATABASE_URL="mysql://simply_user:SimplyPass123!@localhost:3306/simply_crm"
JWT_SECRET="SimplySuperSecretJWTKey2026!"
REDIS_URL="redis://localhost:6379"
NODE_ENV="production"
FRONTEND_URL="https://crm.simply.com"
EOF
    echo "Created .env template."
fi

# Update .env for production
sed -i 's|FRONTEND_URL=.*|FRONTEND_URL="https://crm.simply.com"|' .env

# Uploads
mkdir -p uploads
chmod -R 775 uploads

# Dependencies
npm install --production
npx prisma generate
npx prisma db push --accept-data-loss

# ============================================
# PM2 START
# ============================================
pm2 stop simply-crm || true
pm2 start src/index.js --name "simply-crm"
pm2 save
pm2 startup systemd || true

# ============================================
# NGINX - SUBDOMAIN CONFIG
# ============================================
echo "Configuring Nginx for crm.simply.com..."

cat <<EOF > /etc/nginx/sites-available/crm.simply.com
server {
    listen 80;
    server_name crm.simply.com;

    # Frontend
    location / {
        root /var/www/simply-crm/frontend/dist;
        index index.html;
        try_files \$uri \$uri/ /index.html;
    }

    # API
    location /api {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_cache_bypass \$http_upgrade;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }

    # Uploads
    location /uploads {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
    }
}

# Block direct IP access (optional security)
server {
    listen 80 default_server;
    server_name _;
    return 444;
}
EOF

ln -sf /etc/nginx/sites-available/crm.simply.com /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default || true

# Test & Reload
nginx -t && systemctl reload nginx

# ============================================
# SSL
# ============================================
echo "Installing SSL..."
certbot --nginx -d crm.simply.com --agree-tos --non-interactive --email admin@simply.com

# ============================================
# FIREWALL
# ============================================
ufw allow 'Nginx Full'
ufw allow OpenSSH
ufw --force enable

# ============================================
# DONE
# ============================================
echo "========================================="
echo "✅ Deployment Complete!"
echo "========================================="
echo "🌐 https://crm.simply.com"
echo ""
echo "📋 Next Steps:"
echo "1. Add DNS A record: crm → 76.13.156.123"
echo "2. Edit .env if needed: nano /var/www/simply-crm/backend/.env"
echo "3. Check logs: pm2 logs simply-crm"
echo "4. Check Nginx: tail -f /var/log/nginx/error.log"
echo "========================================="
