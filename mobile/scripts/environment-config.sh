#!/bin/bash

# EduOpps Mobile Environment Configuration Script
# Configures different environments (development, staging, production)

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

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

# Environment configurations
declare -A ENV_CONFIGS=(
    ["development"]="http://localhost:5000"
    ["staging"]="https://staging-eduopps.your-domain.com"
    ["production"]="https://eduopps.your-domain.com"
)

update_api_url() {
    local environment=$1
    local api_url=${ENV_CONFIGS[$environment]}
    
    if [ -z "$api_url" ]; then
        log_error "Unknown environment: $environment"
        exit 1
    fi
    
    log_info "Configuring for $environment environment..."
    log_info "API URL: $api_url"
    
    # Update API URL in api.ts
    if [ -f "src/services/api.ts" ]; then
        # Create backup
        cp src/services/api.ts src/services/api.ts.bak
        
        # Update the API_BASE_URL
        sed -i.tmp "s|const API_BASE_URL = ['\"][^'\"]*['\"];|const API_BASE_URL = '$api_url';|g" src/services/api.ts
        rm -f src/services/api.ts.tmp
        
        log_success "API URL updated in src/services/api.ts"
    else
        log_error "src/services/api.ts not found"
        exit 1
    fi
}

update_app_config() {
    local environment=$1
    local api_url=${ENV_CONFIGS[$environment]}
    
    # Update app.json with environment-specific settings
    node -e "
        const fs = require('fs');
        const appJson = require('./app.json');
        
        // Update extra configuration
        if (!appJson.expo.extra) {
            appJson.expo.extra = {};
        }
        
        appJson.expo.extra.apiUrl = '$api_url';
        appJson.expo.extra.environment = '$environment';
        
        // Update app name for non-production environments
        if ('$environment' !== 'production') {
            appJson.expo.name = 'EduOpps Mobile ($environment)';
            appJson.expo.slug = 'eduopps-mobile-$environment';
        } else {
            appJson.expo.name = 'EduOpps Mobile';
            appJson.expo.slug = 'eduopps-mobile';
        }
        
        fs.writeFileSync('./app.json', JSON.stringify(appJson, null, 2));
    "
    
    log_success "App configuration updated for $environment"
}

create_env_specific_config() {
    local environment=$1
    
    # Create environment-specific configuration file
    cat > "config.$environment.ts" << EOF
// Environment configuration for $environment
export const config = {
  environment: '$environment',
  apiUrl: '${ENV_CONFIGS[$environment]}',
  enableLogging: $([ "$environment" == "production" ] && echo "false" || echo "true"),
  enableDebugMode: $([ "$environment" == "development" ] && echo "true" || echo "false"),
  apiTimeout: $([ "$environment" == "production" ] && echo "10000" || echo "30000"),
};
EOF
    
    log_success "Created config.$environment.ts"
}

setup_development() {
    log_info "Setting up development environment..."
    
    update_api_url "development"
    update_app_config "development"
    create_env_specific_config "development"
    
    # Development-specific settings
    log_info "Configuring development settings..."
    
    # Enable remote debugging
    export REACT_NATIVE_PACKAGER_HOSTNAME=$(hostname -I | cut -d' ' -f1)
    
    log_success "Development environment configured"
    log_info "You can now run: npm start"
}

setup_staging() {
    log_info "Setting up staging environment..."
    
    update_api_url "staging"
    update_app_config "staging"
    create_env_specific_config "staging"
    
    log_success "Staging environment configured"
    log_info "Ready for staging builds with: eas build --profile preview"
}

setup_production() {
    log_info "Setting up production environment..."
    
    update_api_url "production"
    update_app_config "production"
    create_env_specific_config "production"
    
    # Production-specific optimizations
    log_info "Applying production optimizations..."
    
    log_success "Production environment configured"
    log_info "Ready for production builds with: eas build --profile production"
}

prompt_custom_url() {
    echo "Custom Environment Setup"
    echo "======================="
    
    read -p "Enter environment name (e.g., staging, testing): " ENV_NAME
    read -p "Enter API URL (e.g., https://api.example.com): " API_URL
    
    if [ -n "$ENV_NAME" ] && [ -n "$API_URL" ]; then
        ENV_CONFIGS["$ENV_NAME"]="$API_URL"
        
        update_api_url "$ENV_NAME"
        update_app_config "$ENV_NAME"
        create_env_specific_config "$ENV_NAME"
        
        log_success "Custom environment '$ENV_NAME' configured with API: $API_URL"
    else
        log_error "Environment name and API URL are required"
        exit 1
    fi
}

restore_backup() {
    if [ -f "src/services/api.ts.bak" ]; then
        cp src/services/api.ts.bak src/services/api.ts
        log_success "API configuration restored from backup"
    else
        log_warning "No backup file found"
    fi
}

show_current_config() {
    log_info "Current Configuration:"
    echo "===================="
    
    if [ -f "src/services/api.ts" ]; then
        API_URL=$(grep "API_BASE_URL" src/services/api.ts | sed "s/.*= ['\"]\\([^'\"]*\\)['\"];.*/\\1/")
        echo "API URL: $API_URL"
    fi
    
    if [ -f "app.json" ]; then
        APP_NAME=$(node -p "require('./app.json').expo.name" 2>/dev/null || echo "Unknown")
        APP_SLUG=$(node -p "require('./app.json').expo.slug" 2>/dev/null || echo "Unknown")
        ENV_NAME=$(node -p "require('./app.json').expo.extra?.environment || 'Unknown'" 2>/dev/null || echo "Unknown")
        
        echo "App Name: $APP_NAME"
        echo "App Slug: $APP_SLUG"
        echo "Environment: $ENV_NAME"
    fi
    
    echo
}

test_api_connection() {
    if [ -f "src/services/api.ts" ]; then
        API_URL=$(grep "API_BASE_URL" src/services/api.ts | sed "s/.*= ['\"]\\([^'\"]*\\)['\"];.*/\\1/")
        
        log_info "Testing API connection to: $API_URL"
        
        if curl -s --connect-timeout 5 "$API_URL/api/health" > /dev/null; then
            log_success "API is accessible"
        else
            log_warning "API is not accessible - make sure the backend is running"
        fi
    else
        log_error "API configuration not found"
    fi
}

show_help() {
    echo "EduOpps Mobile Environment Configuration"
    echo "======================================="
    echo
    echo "Usage: $0 [COMMAND]"
    echo
    echo "Commands:"
    echo "  dev          Configure for development (localhost)"
    echo "  staging      Configure for staging environment"
    echo "  production   Configure for production environment"
    echo "  custom       Configure custom environment"
    echo "  status       Show current configuration"
    echo "  test         Test API connection"
    echo "  restore      Restore API configuration from backup"
    echo "  help         Show this help message"
    echo
    echo "Examples:"
    echo "  $0 dev       # Setup for local development"
    echo "  $0 staging   # Setup for staging server"
    echo "  $0 custom    # Setup custom environment"
    echo
}

# Navigate to mobile directory if not already there
if [ ! -f "package.json" ] && [ -f "../package.json" ]; then
    cd ..
fi

if [ ! -f "package.json" ]; then
    log_error "package.json not found. Run this script from the mobile app directory."
    exit 1
fi

# Handle commands
case "${1:-help}" in
    dev|development)
        setup_development
        ;;
    staging)
        setup_staging
        ;;
    prod|production)
        setup_production
        ;;
    custom)
        prompt_custom_url
        ;;
    status|show)
        show_current_config
        ;;
    test)
        test_api_connection
        ;;
    restore)
        restore_backup
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