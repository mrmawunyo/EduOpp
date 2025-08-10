#!/bin/bash

# EduOpps Docker Deployment Script
# This script automates the complete deployment process

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
PROJECT_NAME="eduopps"
DOCKER_COMPOSE_FILE="docker-compose.yml"
ENV_FILE=".env"

# Functions
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

check_requirements() {
    log_info "Checking system requirements..."
    
    # Check Docker
    if ! command -v docker &> /dev/null; then
        log_error "Docker is not installed. Please install Docker first."
        exit 1
    fi
    
    # Check Docker Compose
    if ! command -v docker-compose &> /dev/null; then
        log_error "Docker Compose is not installed. Please install Docker Compose first."
        exit 1
    fi
    
    # Check if Docker daemon is running
    if ! docker info &> /dev/null; then
        log_error "Docker daemon is not running. Please start Docker first."
        exit 1
    fi
    
    log_success "System requirements met"
}

create_env_file() {
    if [ ! -f "$ENV_FILE" ]; then
        log_info "Creating environment file..."
        cat > "$ENV_FILE" << EOF
# EduOpps Environment Configuration

# Application
NODE_ENV=production
PORT=5000
FRONTEND_URL=http://localhost

# Database
POSTGRES_DB=eduopps
POSTGRES_USER=eduopps
POSTGRES_PASSWORD=$(openssl rand -base64 32)
POSTGRES_PORT=5432

# Redis
REDIS_PASSWORD=$(openssl rand -base64 32)
REDIS_PORT=6379

# JWT and Session
JWT_SECRET=$(openssl rand -base64 64)
SESSION_SECRET=$(openssl rand -base64 64)

# Email (Configure these values)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
FROM_EMAIL=noreply@eduopps.com

# File Upload
MAX_FILE_SIZE=10485760

# Optional: Object Storage (comment out if not using)
# MINIO_ACCESS_KEY=your-access-key
# MINIO_SECRET_KEY=your-secret-key
# REPLIT_STORAGE_URL=your-storage-url
EOF
        log_success "Environment file created at $ENV_FILE"
        log_warning "Please edit $ENV_FILE and configure your email settings and other environment variables"
        
        read -p "Press Enter to continue after configuring the environment file..."
    else
        log_info "Environment file already exists"
    fi
}

build_images() {
    log_info "Building Docker images..."
    docker-compose build --no-cache
    log_success "Docker images built successfully"
}

start_services() {
    log_info "Starting services..."
    docker-compose up -d
    log_success "Services started"
}

wait_for_services() {
    log_info "Waiting for services to be ready..."
    
    # Wait for database
    log_info "Waiting for database..."
    timeout=60
    while ! docker-compose exec -T db pg_isready -U eduopps -d eduopps &> /dev/null; do
        timeout=$((timeout - 1))
        if [ $timeout -eq 0 ]; then
            log_error "Database failed to start within expected time"
            exit 1
        fi
        sleep 1
    done
    log_success "Database is ready"
    
    # Wait for application
    log_info "Waiting for application..."
    timeout=60
    while ! curl -f http://localhost:5000/api/health &> /dev/null; do
        timeout=$((timeout - 1))
        if [ $timeout -eq 0 ]; then
            log_error "Application failed to start within expected time"
            docker-compose logs app
            exit 1
        fi
        sleep 2
    done
    log_success "Application is ready"
}

run_migrations() {
    log_info "Running database migrations..."
    docker-compose exec app npm run db:push
    log_success "Database migrations completed"
}

seed_database() {
    log_info "Seeding initial data..."
    docker-compose exec app npm run db:seed
    log_success "Database seeded"
}

create_admin_user() {
    log_info "Creating admin user..."
    echo "Please provide admin user details:"
    read -p "Admin email: " admin_email
    read -s -p "Admin password: " admin_password
    echo
    read -p "School name: " school_name
    
    docker-compose exec app node -e "
        require('./server/seed.js').createAdminUser('$admin_email', '$admin_password', '$school_name')
            .then(() => console.log('Admin user created successfully'))
            .catch(err => { console.error('Error:', err.message); process.exit(1); });
    "
    log_success "Admin user created"
}

check_deployment() {
    log_info "Checking deployment status..."
    
    # Check if all containers are running
    if ! docker-compose ps | grep -q "Up"; then
        log_error "Some containers are not running properly"
        docker-compose ps
        exit 1
    fi
    
    # Check application health
    if curl -f http://localhost:5000/api/health &> /dev/null; then
        log_success "Application is healthy and responding"
    else
        log_error "Application health check failed"
        exit 1
    fi
    
    # Display running services
    log_info "Deployment successful! Services running:"
    docker-compose ps
    
    echo
    log_success "🎉 EduOpps is now running!"
    log_info "Application URL: http://localhost:5000"
    log_info "Database: localhost:5432"
    log_info "Redis: localhost:6379"
    echo
    log_info "To view logs: docker-compose logs -f"
    log_info "To stop services: docker-compose down"
    log_info "To stop and remove volumes: docker-compose down -v"
}

show_help() {
    echo "EduOpps Docker Deployment Script"
    echo
    echo "Usage: $0 [COMMAND]"
    echo
    echo "Commands:"
    echo "  deploy     Complete deployment (default)"
    echo "  start      Start services"
    echo "  stop       Stop services"
    echo "  restart    Restart services"
    echo "  logs       Show logs"
    echo "  status     Show service status"
    echo "  clean      Stop and remove all containers and volumes"
    echo "  help       Show this help message"
    echo
}

# Main deployment function
deploy() {
    log_info "Starting EduOpps deployment..."
    
    check_requirements
    create_env_file
    build_images
    start_services
    wait_for_services
    run_migrations
    seed_database
    
    # Ask if user wants to create admin user
    read -p "Do you want to create an admin user now? (y/n): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        create_admin_user
    fi
    
    check_deployment
}

# Handle different commands
case "${1:-deploy}" in
    deploy)
        deploy
        ;;
    start)
        log_info "Starting services..."
        docker-compose up -d
        wait_for_services
        log_success "Services started successfully"
        ;;
    stop)
        log_info "Stopping services..."
        docker-compose down
        log_success "Services stopped"
        ;;
    restart)
        log_info "Restarting services..."
        docker-compose restart
        wait_for_services
        log_success "Services restarted successfully"
        ;;
    logs)
        docker-compose logs -f
        ;;
    status)
        log_info "Service status:"
        docker-compose ps
        echo
        log_info "Application health:"
        curl -s http://localhost:5000/api/health | jq . || echo "Application not responding"
        ;;
    clean)
        log_warning "This will stop and remove all containers, networks, and volumes"
        read -p "Are you sure? (y/n): " -n 1 -r
        echo
        if [[ $REPLY =~ ^[Yy]$ ]]; then
            docker-compose down -v --remove-orphans
            docker system prune -f
            log_success "Cleanup completed"
        fi
        ;;
    help)
        show_help
        ;;
    *)
        log_error "Unknown command: $1"
        show_help
        exit 1
        ;;
esac