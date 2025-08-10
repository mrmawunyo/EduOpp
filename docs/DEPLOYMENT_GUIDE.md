# EduOpps Deployment Guide

## Overview

This guide covers the complete deployment process for the EduOpps platform, including both web and mobile applications. The platform supports deployment on various environments from development to production.

## Prerequisites

### System Requirements
- **Node.js**: Version 16 or later
- **PostgreSQL**: Version 12 or later
- **Redis**: Version 6 or later (for session storage)
- **File Storage**: Local filesystem or cloud storage (AWS S3, Replit Object Storage)
- **Email Service**: SMTP server or email service provider

### Required Environment Variables
```bash
# Database Configuration
DATABASE_URL=postgresql://user:password@localhost:5432/eduopps
PGUSER=eduopps_user
PGPASSWORD=secure_password
PGDATABASE=eduopps
PGHOST=localhost
PGPORT=5432

# Authentication
JWT_SECRET=your-super-secret-jwt-key-here
SESSION_SECRET=your-session-secret-here

# Email Configuration
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
FROM_EMAIL=noreply@eduopps.com

# File Storage
UPLOAD_DIR=./uploads
MAX_FILE_SIZE=10485760  # 10MB in bytes

# Object Storage (if using cloud storage)
MINIO_ACCESS_KEY=your-access-key
MINIO_SECRET_KEY=your-secret-key
REPLIT_STORAGE_URL=your-storage-url

# Application Settings
NODE_ENV=production
PORT=5000
FRONTEND_URL=https://your-domain.com
```

## Local Development Setup

### 1. Clone and Install Dependencies
```bash
# Clone the repository
git clone <repository-url>
cd eduopps

# Install backend dependencies
npm install

# Install frontend dependencies (if separate)
cd client && npm install && cd ..

# Install mobile app dependencies (optional)
cd mobile && npm install && cd ..
```

### 2. Database Setup
```bash
# Create PostgreSQL database
createdb eduopps

# Set environment variables
export DATABASE_URL="postgresql://username:password@localhost:5432/eduopps"

# Run database migrations
npm run db:push

# Seed initial data (optional)
npm run db:seed
```

### 3. Start Development Server
```bash
# Start the full-stack development server
npm run dev

# The application will be available at:
# Frontend: http://localhost:3000
# Backend API: http://localhost:5000
```

## Production Deployment

### Option 1: Replit Deployment (Recommended)

#### Web Application
1. **Prepare for Deployment**
   ```bash
   # Ensure all dependencies are installed
   npm install
   
   # Build the frontend
   npm run build
   
   # Run production tests
   npm test
   ```

2. **Configure Environment**
   - Set all required environment variables in Replit Secrets
   - Ensure DATABASE_URL points to production database
   - Configure email service credentials

3. **Deploy**
   - Click the "Deploy" button in Replit
   - Configure custom domain (optional)
   - Set up health checks and monitoring

4. **Post-Deployment**
   ```bash
   # Run database migrations
   npm run db:push
   
   # Seed initial data if needed
   npm run db:seed
   ```

#### Mobile Application
1. **Setup Expo Build Service**
   ```bash
   cd mobile
   npm install -g eas-cli
   eas login
   eas build:configure
   ```

2. **Configure App Credentials**
   ```bash
   # Update app.json with production settings
   # Set production API URL in src/services/api.ts
   ```

3. **Build for Stores**
   ```bash
   # Build for iOS App Store
   eas build --platform ios --profile production
   
   # Build for Google Play Store
   eas build --platform android --profile production
   ```

### Option 2: Docker Deployment

#### Web Application Dockerfile
```dockerfile
FROM node:18-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./
RUN npm ci --only=production

# Copy application code
COPY . .

# Build frontend
RUN npm run build

# Expose port
EXPOSE 5000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:5000/api/health || exit 1

# Start application
CMD ["npm", "start"]
```

#### Docker Compose Setup
```yaml
version: '3.8'

services:
  app:
    build: .
    ports:
      - "5000:5000"
    environment:
      - NODE_ENV=production
      - DATABASE_URL=postgresql://eduopps:password@db:5432/eduopps
    depends_on:
      - db
      - redis
    volumes:
      - ./uploads:/app/uploads

  db:
    image: postgres:14-alpine
    environment:
      - POSTGRES_DB=eduopps
      - POSTGRES_USER=eduopps
      - POSTGRES_PASSWORD=password
    volumes:
      - postgres_data:/var/lib/postgresql/data
    ports:
      - "5432:5432"

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data

volumes:
  postgres_data:
  redis_data:
```

#### Deploy with Docker
```bash
# Build and start services
docker-compose up -d

# Run database migrations
docker-compose exec app npm run db:push

# View logs
docker-compose logs -f app
```

### Option 3: VPS/Cloud Server Deployment

#### Server Setup (Ubuntu 20.04+)
```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Node.js
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Install PostgreSQL
sudo apt install postgresql postgresql-contrib

# Install PM2 for process management
sudo npm install -g pm2

# Install Nginx (optional, for reverse proxy)
sudo apt install nginx
```

#### Application Deployment
```bash
# Clone application
git clone <repository-url> /var/www/eduopps
cd /var/www/eduopps

# Install dependencies
npm ci --only=production

# Build frontend
npm run build

# Set up environment
sudo cp .env.example .env
sudo nano .env  # Configure production values

# Set up database
sudo -u postgres createdb eduopps
sudo -u postgres createuser eduopps
npm run db:push

# Start with PM2
pm2 start ecosystem.config.js --env production
pm2 save
pm2 startup
```

#### PM2 Configuration (ecosystem.config.js)
```javascript
module.exports = {
  apps: [{
    name: 'eduopps',
    script: 'server/index.js',
    instances: 'max',
    exec_mode: 'cluster',
    env: {
      NODE_ENV: 'development'
    },
    env_production: {
      NODE_ENV: 'production',
      PORT: 5000
    },
    error_file: './logs/err.log',
    out_file: './logs/out.log',
    log_file: './logs/combined.log',
    time: true
  }]
};
```

#### Nginx Configuration
```nginx
server {
    listen 80;
    server_name your-domain.com;

    location / {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }

    # Serve static files directly
    location /uploads/ {
        alias /var/www/eduopps/uploads/;
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
}
```

## Database Migration and Management

### Production Database Setup
```bash
# Create production database
createdb eduopps_production

# Run migrations
DATABASE_URL="postgresql://user:pass@host:port/eduopps_production" npm run db:push

# Create initial admin user
npm run create-admin -- --email admin@school.edu --password secure123 --school "Main School"
```

### Backup Strategy
```bash
# Daily backup script
#!/bin/bash
DATE=$(date +%Y%m%d_%H%M%S)
pg_dump eduopps_production > /backups/eduopps_$DATE.sql
aws s3 cp /backups/eduopps_$DATE.sql s3://backups/database/

# Keep only last 30 days of backups
find /backups -name "eduopps_*.sql" -mtime +30 -delete
```

### Monitoring Database Performance
```sql
-- Monitor slow queries
SELECT query, mean_time, calls, total_time
FROM pg_stat_statements
ORDER BY total_time DESC
LIMIT 10;

-- Check index usage
SELECT schemaname, tablename, indexname, idx_tup_read, idx_tup_fetch
FROM pg_stat_user_indexes
ORDER BY idx_tup_read DESC;
```

## Security Configuration

### SSL/TLS Setup
```bash
# Install Certbot for Let's Encrypt
sudo apt install certbot python3-certbot-nginx

# Get SSL certificate
sudo certbot --nginx -d your-domain.com

# Auto-renewal
sudo crontab -e
# Add: 0 12 * * * /usr/bin/certbot renew --quiet
```

### Firewall Configuration
```bash
# Configure UFW firewall
sudo ufw default deny incoming
sudo ufw default allow outgoing
sudo ufw allow ssh
sudo ufw allow 80
sudo ufw allow 443
sudo ufw enable
```

### Application Security Headers
```javascript
// Add to Express app
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  res.setHeader('Content-Security-Policy', "default-src 'self'");
  next();
});
```

## Performance Optimization

### Application Performance
```javascript
// Enable compression
const compression = require('compression');
app.use(compression());

// Enable caching
const cache = require('memory-cache');
app.use('/api', (req, res, next) => {
  const key = req.originalUrl;
  const cached = cache.get(key);
  if (cached) {
    return res.json(cached);
  }
  next();
});
```

### Database Optimization
```sql
-- Create necessary indexes
CREATE INDEX CONCURRENTLY idx_opportunities_search 
ON opportunities (industry, location, application_deadline) 
WHERE is_active = true;

-- Enable query optimization
ANALYZE;
VACUUM;
```

### CDN Configuration
```javascript
// Serve static assets via CDN
const CDN_URL = process.env.CDN_URL || '';
app.use(express.static('public', {
  maxAge: '1y',
  setHeaders: (res, path) => {
    if (CDN_URL) {
      res.setHeader('Cache-Control', 'public, max-age=31536000');
    }
  }
}));
```

## Monitoring and Logging

### Application Monitoring
```javascript
// Health check endpoint
app.get('/api/health', async (req, res) => {
  try {
    // Check database connection
    await db.query('SELECT 1');
    
    // Check external services
    const emailHealth = await checkEmailService();
    
    res.json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      services: {
        database: 'healthy',
        email: emailHealth ? 'healthy' : 'degraded'
      }
    });
  } catch (error) {
    res.status(503).json({
      status: 'unhealthy',
      error: error.message
    });
  }
});
```

### Logging Configuration
```javascript
const winston = require('winston');

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  transports: [
    new winston.transports.File({ filename: 'logs/error.log', level: 'error' }),
    new winston.transports.File({ filename: 'logs/combined.log' }),
    new winston.transports.Console({
      format: winston.format.simple()
    })
  ]
});
```

### System Monitoring
```bash
# Install monitoring tools
sudo apt install htop iotop nethogs

# Set up log rotation
sudo nano /etc/logrotate.d/eduopps
# Add configuration for log rotation
```

## Troubleshooting

### Common Issues

#### Database Connection Issues
```bash
# Check PostgreSQL status
sudo systemctl status postgresql

# Check connection
psql -h localhost -U eduopps -d eduopps

# View logs
sudo tail -f /var/log/postgresql/postgresql-14-main.log
```

#### Application Won't Start
```bash
# Check PM2 status
pm2 status
pm2 logs eduopps

# Check port availability
sudo netstat -tlnp | grep :5000

# Check environment variables
pm2 env 0
```

#### High Memory Usage
```bash
# Check memory usage
free -h
pm2 monit

# Restart application
pm2 restart eduopps
```

### Performance Issues
```bash
# Check slow queries
sudo -u postgres psql eduopps -c "
SELECT query, mean_time, calls 
FROM pg_stat_statements 
ORDER BY mean_time DESC 
LIMIT 5;"

# Monitor resource usage
top -p $(pgrep -f "node.*eduopps")
```

## Maintenance Tasks

### Regular Maintenance
```bash
#!/bin/bash
# Daily maintenance script

# Update application
cd /var/www/eduopps
git pull origin main
npm ci --only=production
npm run build
pm2 restart eduopps

# Database maintenance
psql eduopps -c "VACUUM ANALYZE;"

# Clean up old files
find uploads/ -type f -mtime +90 -delete

# Backup database
pg_dump eduopps > /backups/daily_$(date +%Y%m%d).sql
```

### Security Updates
```bash
# Update system packages
sudo apt update && sudo apt upgrade -y

# Update Node.js dependencies
npm audit fix

# Check for security vulnerabilities
npm audit
```

This deployment guide provides comprehensive instructions for deploying EduOpps in various environments while maintaining security, performance, and reliability standards.