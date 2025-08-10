#!/bin/bash

# EduOpps Mobile App Setup Script
# This script sets up the React Native mobile app environment

set -e

echo "🚀 Setting up EduOpps Mobile App..."

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js 16 or later."
    exit 1
fi

# Check Node.js version
NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 16 ]; then
    echo "❌ Node.js version 16 or later is required. Current version: $(node -v)"
    exit 1
fi

echo "✅ Node.js $(node -v) detected"

# Check if npm is installed
if ! command -v npm &> /dev/null; then
    echo "❌ npm is not installed. Please install npm."
    exit 1
fi

echo "✅ npm $(npm -v) detected"

# Install Expo CLI if not present
if ! command -v expo &> /dev/null; then
    echo "📦 Installing Expo CLI..."
    npm install -g @expo/cli
else
    echo "✅ Expo CLI detected"
fi

# Navigate to mobile directory
cd "$(dirname "$0")/.."

# Install dependencies
echo "📦 Installing mobile app dependencies..."
npm install

# Create assets directory if it doesn't exist
if [ ! -d "assets" ]; then
    echo "📁 Creating assets directory..."
    mkdir -p assets
fi

# Update API URL in config
echo "⚙️  Configuring API settings..."
read -p "Enter your server URL (default: http://localhost:5000): " SERVER_URL
SERVER_URL=${SERVER_URL:-http://localhost:5000}

# Update the API URL in the source code
sed -i.bak "s|http://localhost:5000|$SERVER_URL|g" src/services/api.ts
rm -f src/services/api.ts.bak

echo "✅ API URL configured: $SERVER_URL"

# Check if the backend is running
echo "🔍 Checking backend connectivity..."
if curl -s --connect-timeout 5 "$SERVER_URL/api/schools" > /dev/null; then
    echo "✅ Backend is accessible"
else
    echo "⚠️  Backend is not accessible at $SERVER_URL"
    echo "   Please ensure your backend server is running"
fi

echo ""
echo "🎉 Mobile app setup complete!"
echo ""
echo "Next steps:"
echo "1. Start the development server: npm start"
echo "2. Install Expo Go on your mobile device"
echo "3. Scan the QR code to run the app"
echo ""
echo "For production builds:"
echo "- Android: expo build:android"
echo "- iOS: expo build:ios"
echo ""
echo "📱 Happy coding!"