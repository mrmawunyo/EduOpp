#!/bin/bash

# EduOpps Mobile App Deployment Script
# Automated deployment for React Native/Expo mobile app

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
APP_NAME="EduOpps Mobile"
PROJECT_DIR="$(dirname "$0")/.."

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
    log_info "Checking deployment requirements..."
    
    # Check Node.js
    if ! command -v node &> /dev/null; then
        log_error "Node.js is not installed. Please install Node.js 16+ first."
        exit 1
    fi
    
    NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
    if [ "$NODE_VERSION" -lt 16 ]; then
        log_error "Node.js version 16 or later is required. Current: $(node -v)"
        exit 1
    fi
    
    # Check Expo CLI
    if ! command -v expo &> /dev/null; then
        log_warning "Expo CLI not found. Installing..."
        npm install -g @expo/cli
    fi
    
    # Check EAS CLI
    if ! command -v eas &> /dev/null; then
        log_warning "EAS CLI not found. Installing..."
        npm install -g eas-cli
    fi
    
    log_success "Requirements check completed"
}

setup_environment() {
    log_info "Setting up deployment environment..."
    
    cd "$PROJECT_DIR"
    
    # Install dependencies
    log_info "Installing dependencies..."
    npm ci
    
    # Check if user is logged in to Expo
    if ! eas whoami &> /dev/null; then
        log_info "Please login to your Expo account:"
        eas login
    fi
    
    # Verify project configuration
    if [ ! -f "eas.json" ]; then
        log_info "Configuring EAS build..."
        eas build:configure
    fi
    
    log_success "Environment setup completed"
}

build_development() {
    log_info "Building development version..."
    
    eas build --profile development --platform all --non-interactive
    
    log_success "Development build completed"
    log_info "Install the build on your device for testing"
}

build_preview() {
    log_info "Building preview version..."
    
    # Build for internal testing
    eas build --profile preview --platform all --non-interactive
    
    log_success "Preview build completed"
    log_info "Preview builds are ready for stakeholder testing"
}

build_production() {
    log_info "Building production version..."
    
    # Increment version
    read -p "Do you want to increment the version? (y/n): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        increment_version
    fi
    
    # Build production apps
    eas build --profile production --platform all --non-interactive
    
    log_success "Production build completed"
}

increment_version() {
    log_info "Incrementing app version..."
    
    # Read current version from app.json
    CURRENT_VERSION=$(node -p "require('./app.json').expo.version")
    log_info "Current version: $CURRENT_VERSION"
    
    # Ask for new version
    read -p "Enter new version (current: $CURRENT_VERSION): " NEW_VERSION
    
    if [ -n "$NEW_VERSION" ]; then
        # Update version in app.json
        node -e "
            const fs = require('fs');
            const appJson = require('./app.json');
            appJson.expo.version = '$NEW_VERSION';
            fs.writeFileSync('./app.json', JSON.stringify(appJson, null, 2));
        "
        
        # Update version in package.json
        npm version "$NEW_VERSION" --no-git-tag-version
        
        log_success "Version updated to $NEW_VERSION"
    fi
}

submit_to_stores() {
    log_info "Submitting to app stores..."
    
    log_warning "Make sure you have the latest production builds ready"
    read -p "Continue with store submission? (y/n): " -n 1 -r
    echo
    
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        eas submit --profile production --platform all --non-interactive
        log_success "Apps submitted to stores"
        log_info "Monitor submission status in Expo dashboard and store consoles"
    fi
}

publish_update() {
    log_info "Publishing over-the-air update..."
    
    read -p "Enter update message: " UPDATE_MESSAGE
    
    if [ -z "$UPDATE_MESSAGE" ]; then
        UPDATE_MESSAGE="Bug fixes and improvements"
    fi
    
    eas update --branch production --message "$UPDATE_MESSAGE"
    
    log_success "Update published successfully"
    log_info "Users with compatible app versions will receive the update"
}

run_tests() {
    log_info "Running tests and quality checks..."
    
    # TypeScript check
    log_info "Running TypeScript check..."
    npx tsc --noEmit
    
    # Linting (if configured)
    if grep -q "lint" package.json; then
        log_info "Running linter..."
        npm run lint
    fi
    
    # Tests (if configured)
    if grep -q "test" package.json; then
        log_info "Running tests..."
        npm test -- --watchAll=false
    fi
    
    log_success "Quality checks completed"
}

check_backend_connectivity() {
    log_info "Checking backend connectivity..."
    
    # Extract API URL from configuration
    API_URL=$(node -p "
        try {
            const config = require('./src/services/api.ts');
            // Extract URL from the file content
            const fs = require('fs');
            const content = fs.readFileSync('./src/services/api.ts', 'utf8');
            const match = content.match(/API_BASE_URL = ['\"]([^'\"]+)['\"];/);
            match ? match[1] : 'http://localhost:5000';
        } catch(e) {
            'http://localhost:5000';
        }
    " 2>/dev/null || echo "http://localhost:5000")
    
    log_info "Testing API at: $API_URL"
    
    if curl -s --connect-timeout 5 "$API_URL/api/health" > /dev/null; then
        log_success "Backend is accessible"
    else
        log_warning "Backend is not accessible at $API_URL"
        log_info "Make sure your backend server is running for full functionality"
    fi
}

show_help() {
    echo "$APP_NAME Deployment Script"
    echo
    echo "Usage: $0 [COMMAND]"
    echo
    echo "Commands:"
    echo "  setup         Setup deployment environment"
    echo "  dev           Build development version"
    echo "  preview       Build preview version"
    echo "  production    Build production version"
    echo "  submit        Submit to app stores"
    echo "  update        Publish over-the-air update"
    echo "  test          Run tests and quality checks"
    echo "  full          Complete deployment (preview + production + submit)"
    echo "  help          Show this help message"
    echo
    echo "Examples:"
    echo "  $0 setup      # Initial setup"
    echo "  $0 preview    # Build for testing"
    echo "  $0 production # Build for stores"
    echo "  $0 full       # Complete deployment"
    echo
}

show_status() {
    log_info "Deployment status check..."
    
    # Check Expo login
    if eas whoami &> /dev/null; then
        EXPO_USER=$(eas whoami)
        log_success "Logged in as: $EXPO_USER"
    else
        log_warning "Not logged in to Expo"
    fi
    
    # Check app configuration
    if [ -f "app.json" ]; then
        APP_VERSION=$(node -p "require('./app.json').expo.version")
        APP_SLUG=$(node -p "require('./app.json').expo.slug")
        log_info "App: $APP_SLUG v$APP_VERSION"
    fi
    
    # Check backend connectivity
    check_backend_connectivity
    
    # Show recent builds
    log_info "Recent builds:"
    eas build:list --limit=5 --non-interactive || log_warning "Could not fetch build list"
}

# Main deployment function
full_deployment() {
    log_info "Starting full deployment process..."
    
    check_requirements
    setup_environment
    run_tests
    check_backend_connectivity
    
    log_info "Building preview version for testing..."
    build_preview
    
    read -p "Preview builds completed. Continue with production builds? (y/n): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        build_production
        
        read -p "Production builds completed. Submit to app stores? (y/n): " -n 1 -r
        echo
        if [[ $REPLY =~ ^[Yy]$ ]]; then
            submit_to_stores
        fi
    fi
    
    log_success "Deployment process completed!"
}

# Handle different commands
case "${1:-help}" in
    setup)
        check_requirements
        setup_environment
        ;;
    dev|development)
        check_requirements
        setup_environment
        build_development
        ;;
    preview)
        check_requirements
        setup_environment
        run_tests
        build_preview
        ;;
    production|prod)
        check_requirements
        setup_environment
        run_tests
        check_backend_connectivity
        build_production
        ;;
    submit)
        submit_to_stores
        ;;
    update)
        publish_update
        ;;
    test)
        run_tests
        ;;
    status)
        show_status
        ;;
    full)
        full_deployment
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