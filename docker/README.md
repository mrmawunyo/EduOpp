# EduOpps Docker Deployment

Complete Docker deployment solution for the EduOpps educational opportunities management platform.

## Quick Start

### Automated Deployment
```bash
# Run the automated deployment script
./scripts/deploy.sh

# Or with specific commands
./scripts/deploy.sh deploy    # Full deployment
./scripts/deploy.sh start     # Start services
./scripts/deploy.sh stop      # Stop services
./scripts/deploy.sh status    # Check status
```

### Manual Deployment
```bash
# 1. Create environment file
cp .env.example .env
# Edit .env with your configuration

# 2. Build and start services
docker-compose up -d

# 3. Run database migrations
docker-compose exec app npm run db:push

# 4. Seed initial data
docker-compose exec app npm run db:seed
```

## Services Overview

The Docker setup includes the following services:

### Application (app)
- **Image**: Custom Node.js application
- **Port**: 5000
- **Features**: 
  - Multi-stage build for optimization
  - Non-root user for security
  - Health checks
  - Automatic restarts

### Database (db)
- **Image**: PostgreSQL 14 Alpine
- **Port**: 5432
- **Features**:
  - Persistent data storage
  - Health checks
  - Automatic initialization
  - Connection pooling

### Cache (redis)
- **Image**: Redis 7 Alpine  
- **Port**: 6379
- **Features**:
  - Session storage
  - Data persistence
  - Password protection

### Reverse Proxy (nginx)
- **Image**: Nginx Alpine
- **Ports**: 80, 443
- **Features**:
  - Load balancing
  - Static file serving
  - Rate limiting
  - Security headers
  - SSL/TLS termination

## Configuration

### Environment Variables

Required environment variables (set in `.env`):

```bash
# Database
POSTGRES_DB=eduopps
POSTGRES_USER=eduopps
POSTGRES_PASSWORD=your-secure-password

# Application Security
JWT_SECRET=your-jwt-secret-64-chars
SESSION_SECRET=your-session-secret

# Email Configuration
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
FROM_EMAIL=noreply@eduopps.com

# Optional: Redis
REDIS_PASSWORD=your-redis-password

# Optional: Object Storage
MINIO_ACCESS_KEY=your-access-key
MINIO_SECRET_KEY=your-secret-key
REPLIT_STORAGE_URL=your-storage-url
```

### Nginx Configuration

The Nginx service provides:
- **Reverse Proxy**: Routes requests to the application
- **Static Files**: Serves uploaded documents directly
- **Security**: Rate limiting and security headers
- **Performance**: Gzip compression and caching

### Database Initialization

The PostgreSQL container automatically:
- Creates the database and user
- Sets up required extensions
- Creates custom types (enums)
- Grants appropriate permissions

## Deployment Commands

### Using the Deployment Script

```bash
# Complete deployment
./scripts/deploy.sh deploy

# Service management
./scripts/deploy.sh start
./scripts/deploy.sh stop
./scripts/deploy.sh restart

# Monitoring
./scripts/deploy.sh status
./scripts/deploy.sh logs

# Cleanup
./scripts/deploy.sh clean
```

### Manual Docker Compose Commands

```bash
# Start all services
docker-compose up -d

# View logs
docker-compose logs -f [service-name]

# Execute commands in containers
docker-compose exec app npm run db:push
docker-compose exec db psql -U eduopps -d eduopps

# Scale services (if needed)
docker-compose up -d --scale app=3

# Stop services
docker-compose down

# Stop and remove volumes
docker-compose down -v
```

## Backup and Recovery

### Automated Backups

```bash
# Full backup (database + uploads)
./scripts/backup.sh backup

# Database only
./scripts/backup.sh backup-db

# Uploads only  
./scripts/backup.sh backup-uploads

# List backups
./scripts/backup.sh list
```

### Manual Backup

```bash
# Database backup
docker-compose exec db pg_dump -U eduopps eduopps > backup.sql

# Uploads backup
docker cp eduopps-app:/app/uploads ./uploads-backup
```

### Restore Operations

```bash
# Restore database
./scripts/backup.sh restore-db backups/database_20240115_120000.sql.gz

# Restore uploads
./scripts/backup.sh restore-uploads backups/uploads_20240115_120000.tar.gz
```

## Monitoring and Maintenance

### Health Checks

The deployment includes comprehensive health checks:

```bash
# Application health
curl http://localhost:5000/api/health

# Database health
docker-compose exec db pg_isready -U eduopps -d eduopps

# Service status
docker-compose ps
```

### Log Management

View logs from different services:

```bash
# All services
docker-compose logs -f

# Specific service
docker-compose logs -f app
docker-compose logs -f db
docker-compose logs -f nginx

# Follow logs with timestamps
docker-compose logs -f -t app
```

### Performance Monitoring

```bash
# Container resource usage
docker stats

# Database performance
docker-compose exec db psql -U eduopps -d eduopps -c "
SELECT query, mean_time, calls 
FROM pg_stat_statements 
ORDER BY mean_time DESC 
LIMIT 10;"
```

## Security Features

### Application Security
- **Non-root containers**: All containers run as non-root users
- **Security headers**: Comprehensive HTTP security headers
- **Rate limiting**: API and authentication rate limiting
- **Input validation**: All inputs validated and sanitized

### Network Security
- **Internal network**: Services communicate on isolated network
- **Port exposure**: Only necessary ports exposed externally
- **SSL/TLS**: Ready for SSL certificate integration

### Data Security
- **Encrypted passwords**: Bcrypt password hashing
- **JWT tokens**: Secure token-based authentication
- **File validation**: Strict file type and size validation
- **Database security**: Connection encryption and user isolation

## SSL/TLS Configuration

### Let's Encrypt Integration

```bash
# Install certbot
sudo apt install certbot python3-certbot-nginx

# Get certificate
sudo certbot --nginx -d your-domain.com

# Update nginx configuration for HTTPS
# Edit docker/nginx/default.conf to include SSL settings
```

### Custom SSL Certificates

```bash
# Copy certificates to docker/ssl/
mkdir -p docker/ssl
cp your-cert.pem docker/ssl/
cp your-key.pem docker/ssl/

# Update nginx configuration
# Uncomment SSL sections in docker/nginx/default.conf
```

## Scaling and Load Balancing

### Horizontal Scaling

```bash
# Scale application containers
docker-compose up -d --scale app=3

# Nginx automatically load balances between instances
```

### Database Scaling

For production environments with high load:

```bash
# Add read replicas (requires custom configuration)
# Consider external managed database services
# Implement connection pooling
```

## Troubleshooting

### Common Issues

**Container won't start:**
```bash
# Check logs
docker-compose logs [service-name]

# Check configuration
docker-compose config

# Rebuild container
docker-compose build --no-cache [service-name]
```

**Database connection issues:**
```bash
# Check database status
docker-compose exec db pg_isready

# Test connection
docker-compose exec app npm run db:test

# Reset database
docker-compose down
docker volume rm eduopps_postgres_data
docker-compose up -d
```

**Permission issues:**
```bash
# Fix upload directory permissions
docker-compose exec app chown -R nodejs:nodejs /app/uploads

# Fix database permissions
docker-compose exec db psql -U postgres -c "GRANT ALL ON DATABASE eduopps TO eduopps;"
```

### Performance Issues

**High memory usage:**
```bash
# Check container resources
docker stats

# Optimize container limits
# Edit docker-compose.yml to add resource limits
```

**Slow database queries:**
```bash
# Analyze slow queries
docker-compose exec db psql -U eduopps -d eduopps -c "
SELECT query, mean_time FROM pg_stat_statements 
WHERE mean_time > 1000 
ORDER BY mean_time DESC;"

# Optimize database
docker-compose exec db psql -U eduopps -d eduopps -c "VACUUM ANALYZE;"
```

## Production Considerations

### Resource Requirements

**Minimum Requirements:**
- CPU: 2 cores
- Memory: 4GB RAM
- Storage: 20GB SSD

**Recommended for Production:**
- CPU: 4+ cores
- Memory: 8GB+ RAM
- Storage: 100GB+ SSD

### High Availability Setup

For production environments:
- Use managed database services (AWS RDS, Google Cloud SQL)
- Implement Redis clustering
- Use cloud load balancers
- Set up monitoring and alerting
- Implement backup strategies
- Configure log aggregation

### Environment-Specific Configurations

Create different compose files for different environments:

```bash
# Development
docker-compose -f docker-compose.yml -f docker-compose.dev.yml up

# Staging
docker-compose -f docker-compose.yml -f docker-compose.staging.yml up

# Production
docker-compose -f docker-compose.yml -f docker-compose.prod.yml up
```

This Docker deployment provides a production-ready, scalable, and secure environment for the EduOpps platform with automated deployment, monitoring, and maintenance capabilities.