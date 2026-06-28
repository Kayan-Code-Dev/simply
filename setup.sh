#!/bin/bash
set -e

echo "========================================="
echo "Starting Simply-V2 VPS Setup"
echo "========================================="

echo "Creating swap file to prevent OOM errors..."
if [ ! -f /swapfile ]; then
    fallocate -l 2G /swapfile || dd if=/dev/zero of=/swapfile bs=1M count=2048
    chmod 600 /swapfile
    mkswap /swapfile
    swapon /swapfile
    echo '/swapfile none swap sw 0 0' >> /etc/fstab
    echo "Swap file created successfully."
fi

# Detect OS
if [ -f /etc/os-release ]; then
    . /etc/os-release
    OS_FAMILY=$ID_LIKE
    OS_ID=$ID
else
    OS_FAMILY="unknown"
    OS_ID="unknown"
fi

echo "OS Detected: $OS_ID ($OS_FAMILY)"

# Install dependencies based on OS
if [[ "$OS_ID" == "ubuntu" || "$OS_ID" == "debian" || "$OS_FAMILY" == *"debian"* ]]; then
    echo "Updating apt package list..."
    export DEBIAN_FRONTEND=noninteractive
    apt-get update -y
    echo "Installing required packages (Nginx, MariaDB, Git, Curl, Redis, Unzip)..."
    apt-get install -y curl tar nginx mariadb-server git unzip redis-server
    
    echo "Installing Node.js 20..."
    if ! command -v node &> /dev/null; then
        curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
        apt-get install -y nodejs
    fi
    
    # Start Services
    systemctl enable --now mariadb || systemctl enable --now mysql
    systemctl enable --now redis-server || systemctl enable --now redis
    
elif [[ "$OS_ID" == "rocky" || "$OS_ID" == "almalinux" || "$OS_ID" == "centos" || "$OS_FAMILY" == *"rhel"* ]]; then
    echo "Installing required packages..."
    dnf install -y epel-release -y || true
    dnf install -y curl tar nginx mariadb-server redis unzip git
    
    echo "Installing Node.js 20..."
    if ! command -v node &> /dev/null; then
        curl -fsSL https://rpm.nodesource.com/setup_20.x | bash -
        dnf install -y nodejs
    fi
    
    # Start Services
    systemctl enable --now mariadb || systemctl enable --now mysqld
    systemctl enable --now redis
else
    echo "Unsupported OS family: $OS_ID. Please install Node.js, Nginx, MariaDB/MySQL, and Redis manually."
    exit 1
fi

echo "Installing PM2 globally..."
if ! command -v pm2 &> /dev/null; then
    npm install -g pm2
fi

echo "Waiting for database server to start..."
sleep 5

echo "Configuring MySQL/MariaDB database..."
mysql -e "CREATE DATABASE IF NOT EXISTS simply_v2;"
mysql -e "CREATE USER IF NOT EXISTS 'simply_user'@'localhost' IDENTIFIED BY 'SimplyPass123!';" || true
mysql -e "GRANT ALL PRIVILEGES ON simply_v2.* TO 'simply_user'@'localhost';"
mysql -e "FLUSH PRIVILEGES;"

echo "Setting up application directory..."
mkdir -p /var/www/simply-v2
cd /var/www/simply-v2

# Extract ZIP if deploy.zip was uploaded, or TAR if deploy.tar.gz
if [ -f /root/deploy.zip ]; then
    echo "Extracting deploy.zip..."
    unzip -o /root/deploy.zip -d /var/www/simply-v2
elif [ -f /root/deploy.tar.gz ]; then
    echo "Extracting deploy.tar.gz..."
    tar -xzf /root/deploy.tar.gz -C /var/www/simply-v2
fi

echo "Setting up backend..."
cd /var/www/simply-v2/backend

# Create .env from template if it doesn't exist
if [ ! -f .env ]; then
    cat <<EOF > .env
PORT=5000
DATABASE_URL="mysql://simply_user:SimplyPass123!@localhost:3306/simply_v2"
JWT_SECRET="SimplySuperSecretJWTKey2026!"
REDIS_URL="redis://localhost:6379"
NODE_ENV="production"
SMTP_HOST="smtp.gmail.com"
SMTP_PORT="587"
SMTP_USER="your-email@gmail.com"
SMTP_PASS="your-app-password"
FRONTEND_URL="http://localhost"
EOF
    echo "Created template backend .env file. Please edit this later with your real credentials."
fi

# Create uploads folder
mkdir -p uploads
chmod -R 775 uploads

# Install backend dependencies
npm install --production
npx prisma generate
npx prisma db push --accept-data-loss

echo "Starting backend with PM2..."
pm2 stop simply-backend || true
pm2 start src/index.js --name "simply-backend"
pm2 save
pm2 startup systemd || true

echo "Setting up Nginx Configuration..."
if [ -d /etc/nginx/sites-available ]; then
    # Debian/Ubuntu style configuration
    cat <<EOF > /etc/nginx/sites-available/simply-v2
server {
    listen 80;
    server_name _; # Change this to your domain name or IP address

    location / {
        root /var/www/simply-v2/frontend/dist;
        index index.html;
        try_files \$uri \$uri/ /index.html;
    }

    location /api {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_cache_bypass \$http_upgrade;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
    }

    location /uploads {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_cache_bypass \$http_upgrade;
    }
}
EOF
    ln -sf /etc/nginx/sites-available/simply-v2 /etc/nginx/sites-enabled/
    rm -f /etc/nginx/sites-enabled/default || true
else
    # CentOS/RHEL/Rocky/Alma style configuration
    cat <<EOF > /etc/nginx/conf.d/simply-v2.conf
server {
    listen 80;
    server_name _; # Change this to your domain name or IP address

    location / {
        root /var/www/simply-v2/frontend/dist;
        index index.html;
        try_files \$uri \$uri/ /index.html;
    }

    location /api {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_cache_bypass \$http_upgrade;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
    }

    location /uploads {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_cache_bypass \$http_upgrade;
    }
}
EOF
    rm -f /etc/nginx/conf.d/default.conf || true
fi

echo "Restarting Nginx..."
systemctl restart nginx

echo "========================================="
echo "Deployment Complete!"
echo "Please visit your VPS IP Address in the browser."
echo "========================================="
