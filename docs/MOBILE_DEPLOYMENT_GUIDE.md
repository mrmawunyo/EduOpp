# EduOpps Mobile App Deployment Guide

## Overview

This comprehensive guide covers the deployment process for the EduOpps React Native mobile application, built with Expo. The mobile app provides a student-focused interface for browsing educational opportunities and managing profiles.

## Mobile App Architecture

### Technology Stack
- **Framework**: React Native with Expo 49
- **Language**: TypeScript
- **Navigation**: React Navigation (Stack + Bottom Tabs)
- **State Management**: React Query + Context API
- **UI Library**: React Native Paper + React Native Elements
- **Storage**: AsyncStorage for local data persistence
- **API Integration**: Shared endpoints with web application

### App Structure
```
mobile/
├── src/
│   ├── components/          # Reusable UI components
│   ├── screens/            # Main app screens
│   │   ├── LoginScreen.tsx      # Student authentication
│   │   ├── OpportunitiesScreen.tsx  # Browse opportunities
│   │   ├── OpportunityDetailScreen.tsx  # Opportunity details
│   │   └── ProfileScreen.tsx    # Student profile
│   ├── services/           # API and authentication
│   │   ├── api.ts              # HTTP client
│   │   └── AuthContext.tsx     # Authentication provider
│   ├── types/              # TypeScript definitions
│   └── utils/              # Utility functions
├── assets/                 # App icons and images
├── App.tsx                # Main app component
├── app.json               # Expo configuration
├── package.json           # Dependencies
└── scripts/setup.sh       # Automated setup script
```

### Key Features
- **Student Authentication**: Secure login with JWT tokens
- **Opportunity Browsing**: Search and filter educational opportunities
- **Interest Management**: Register/remove interest in opportunities
- **Profile Management**: View and update student profile
- **Offline Support**: Cached data with React Query
- **Native Integration**: Direct email/phone contact

## Development Setup

### Prerequisites

**System Requirements:**
- Node.js 16+ (LTS recommended)
- npm or yarn package manager
- Git for version control

**Development Tools:**
- Expo CLI: `npm install -g @expo/cli`
- EAS CLI: `npm install -g eas-cli` (for production builds)

**Testing Devices:**
- Expo Go app on iOS/Android device
- iOS Simulator (macOS only)
- Android Emulator or physical device

### Automated Setup

Use the provided setup script for quick configuration:

```bash
# Navigate to mobile directory
cd mobile

# Run automated setup
./scripts/setup.sh
```

The setup script will:
1. Verify Node.js and npm installation
2. Install Expo CLI if needed
3. Install project dependencies
4. Configure API endpoints
5. Test backend connectivity
6. Create necessary directories

### Manual Setup

**1. Install Dependencies**
```bash
cd mobile
npm install
```

**2. Configure Environment**

Update API configuration in `src/services/api.ts`:
```typescript
// For local development
const API_BASE_URL = 'http://localhost:5000';

// For production deployment
const API_BASE_URL = 'https://your-domain.com';

// For physical device testing (use your computer's IP)
const API_BASE_URL = 'http://192.168.1.XXX:5000';
```

**3. Configure App Settings**

Update `app.json` for your organization:
```json
{
  "expo": {
    "name": "Your School - EduOpps",
    "slug": "your-school-eduopps",
    "version": "1.0.0",
    "ios": {
      "bundleIdentifier": "com.yourschool.eduopps"
    },
    "android": {
      "package": "com.yourschool.eduopps"
    }
  }
}
```

### Development Server

**Start Development Server:**
```bash
npm start
```

**Platform-Specific Development:**
```bash
# Start with iOS simulator
npm run ios

# Start with Android emulator
npm run android

# Start for web development
npm run web
```

**QR Code Scanning:**
- Install Expo Go on your mobile device
- Scan the QR code displayed in terminal
- App will load automatically on your device

## Testing

### Development Testing

**Local Testing:**
```bash
# Start the backend server
cd .. && npm run dev

# In another terminal, start mobile app
cd mobile && npm start
```

**Device Testing:**
- Use Expo Go for rapid iteration
- Test on both iOS and Android devices
- Verify different screen sizes and orientations
- Test with various network conditions

**Backend Integration Testing:**
```bash
# Test API connectivity
curl http://localhost:5000/api/health

# Test authentication endpoint
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password"}'
```

### Quality Assurance

**Functional Testing Checklist:**
- [ ] User authentication (login/logout)
- [ ] Opportunity browsing and search
- [ ] Interest registration/removal
- [ ] Profile viewing and editing
- [ ] Network error handling
- [ ] Offline functionality
- [ ] Deep linking (if implemented)

**Performance Testing:**
- [ ] App startup time
- [ ] Screen transition smoothness
- [ ] Large list scrolling performance
- [ ] Memory usage optimization
- [ ] Battery consumption

**Cross-Platform Testing:**
- [ ] iOS devices (various screen sizes)
- [ ] Android devices (various manufacturers)
- [ ] Tablet support (if enabled)
- [ ] Different OS versions

## Production Builds

### Expo Application Services (EAS)

**Setup EAS Build:**
```bash
# Install EAS CLI
npm install -g eas-cli

# Login to Expo account
eas login

# Configure build profiles
eas build:configure
```

**Build Configuration (eas.json):**
```json
{
  "cli": {
    "version": ">= 3.0.0"
  },
  "build": {
    "development": {
      "developmentClient": true,
      "distribution": "internal"
    },
    "preview": {
      "distribution": "internal",
      "ios": {
        "simulator": true
      }
    },
    "production": {
      "autoIncrement": true
    }
  },
  "submit": {
    "production": {}
  }
}
```

### Building Apps

**Development Builds:**
```bash
# Create development build for testing
eas build --profile development --platform all
```

**Preview Builds:**
```bash
# Create preview builds for stakeholder review
eas build --profile preview --platform all
```

**Production Builds:**
```bash
# Build for iOS App Store
eas build --profile production --platform ios

# Build for Google Play Store
eas build --profile production --platform android

# Build for both platforms
eas build --profile production --platform all
```

### Build Monitoring

Monitor builds through:
- Expo Dashboard: https://expo.dev/
- Build logs and status updates
- Download links for testing builds

## App Store Deployment

### iOS App Store

**Prerequisites:**
- Apple Developer Account ($99/year)
- App Store Connect access
- iOS distribution certificate
- App Store provisioning profile

**Preparation Steps:**
1. **Update App Configuration:**
   ```json
   {
     "expo": {
       "version": "1.0.0",
       "ios": {
         "buildNumber": "1",
         "bundleIdentifier": "com.yourschool.eduopps"
       }
     }
   }
   ```

2. **App Store Connect Setup:**
   - Create new app in App Store Connect
   - Configure app metadata
   - Upload screenshots and app description
   - Set pricing and availability

3. **Build and Submit:**
   ```bash
   # Build for App Store
   eas build --profile production --platform ios
   
   # Submit to App Store
   eas submit --profile production --platform ios
   ```

**App Store Review Process:**
- Review typically takes 24-48 hours
- Address any review feedback promptly
- Monitor app status in App Store Connect

### Google Play Store

**Prerequisites:**
- Google Play Developer Account ($25 one-time)
- Play Console access
- Android signing key

**Preparation Steps:**
1. **Update App Configuration:**
   ```json
   {
     "expo": {
       "version": "1.0.0",
       "android": {
         "versionCode": 1,
         "package": "com.yourschool.eduopps"
       }
     }
   }
   ```

2. **Play Console Setup:**
   - Create new app in Google Play Console
   - Configure store listing
   - Upload screenshots and descriptions
   - Set content rating and pricing

3. **Build and Submit:**
   ```bash
   # Build for Play Store
   eas build --profile production --platform android
   
   # Submit to Play Store
   eas submit --profile production --platform android
   ```

**Play Store Review Process:**
- Review typically takes 1-3 days
- Address policy compliance issues
- Monitor app status in Play Console

## Environment Configuration

### Production Environment Variables

Configure production settings in `app.json`:

```json
{
  "expo": {
    "extra": {
      "apiUrl": "https://your-production-domain.com",
      "environment": "production"
    }
  }
}
```

Access in code:
```typescript
import Constants from 'expo-constants';

const API_BASE_URL = Constants.expoConfig?.extra?.apiUrl || 'http://localhost:5000';
```

### Security Configuration

**API Security:**
- Use HTTPS for all API communications
- Implement proper JWT token handling
- Secure sensitive data in AsyncStorage
- Validate all API responses

**App Security:**
- Enable code obfuscation for production
- Implement certificate pinning
- Use secure storage for sensitive data
- Regular security audits

## CI/CD Pipeline

### Automated Build Pipeline

**GitHub Actions Configuration (.github/workflows/mobile.yml):**
```yaml
name: Mobile App CI/CD

on:
  push:
    branches: [main]
    paths: ['mobile/**']
  pull_request:
    branches: [main]
    paths: ['mobile/**']

jobs:
  build:
    runs-on: ubuntu-latest
    
    steps:
    - uses: actions/checkout@v3
    
    - name: Setup Node.js
      uses: actions/setup-node@v3
      with:
        node-version: '18'
        cache: 'npm'
        cache-dependency-path: mobile/package-lock.json
    
    - name: Install dependencies
      run: |
        cd mobile
        npm ci
    
    - name: Run tests
      run: |
        cd mobile
        npm test
    
    - name: Setup Expo
      uses: expo/expo-github-action@v7
      with:
        expo-version: latest
        token: ${{ secrets.EXPO_TOKEN }}
    
    - name: Build preview
      if: github.event_name == 'pull_request'
      run: |
        cd mobile
        eas build --profile preview --platform all --non-interactive
    
    - name: Build production
      if: github.ref == 'refs/heads/main'
      run: |
        cd mobile
        eas build --profile production --platform all --non-interactive
```

### Automated Testing

**Test Configuration:**
```json
{
  "scripts": {
    "test": "jest",
    "test:watch": "jest --watch",
    "test:coverage": "jest --coverage"
  }
}
```

**Test Setup:**
- Unit tests for components
- Integration tests for API calls
- E2E tests for critical flows
- Automated UI testing

## Monitoring and Analytics

### Crash Reporting

**Sentry Integration:**
```bash
npm install @sentry/react-native
```

Configuration:
```typescript
import * as Sentry from '@sentry/react-native';

Sentry.init({
  dsn: 'YOUR_SENTRY_DSN',
});
```

### Analytics

**Expo Analytics:**
```typescript
import { Analytics } from 'expo-analytics';

const analytics = new Analytics('GA_TRACKING_ID');

// Track screen views
analytics.hit('OpportunitiesScreen');

// Track events
analytics.event('Interest', 'Register', opportunityId);
```

### Performance Monitoring

**Key Metrics to Monitor:**
- App startup time
- Screen load times
- API response times
- Crash rates
- User engagement

**Monitoring Tools:**
- Expo Analytics
- Sentry Performance
- Custom logging
- User feedback systems

## Troubleshooting

### Common Issues

**Build Failures:**
```bash
# Clear Expo cache
expo r -c

# Clear npm cache
npm cache clean --force

# Reinstall dependencies
rm -rf node_modules package-lock.json
npm install
```

**API Connection Issues:**
```bash
# Check network connectivity
curl -I http://your-api-url.com/api/health

# Test local development
adb reverse tcp:5000 tcp:5000  # Android
```

**Platform-Specific Issues:**

**iOS Issues:**
- Simulator vs device behavior differences
- Code signing problems
- Provisioning profile issues

**Android Issues:**
- Gradle build failures
- Keystore problems
- Permission issues

### Debug Tools

**Expo Development Tools:**
- React Native Debugger
- Flipper integration
- Expo DevTools
- Metro bundler logs

**Device Debugging:**
```bash
# Enable USB debugging (Android)
adb devices

# iOS device logs
xcrun simctl spawn booted log stream --predicate 'process CONTAINS "EduOpps"'
```

## Maintenance and Updates

### Version Management

**Semantic Versioning:**
- MAJOR.MINOR.PATCH (1.0.0)
- Update `version` in app.json
- Update `buildNumber` (iOS) and `versionCode` (Android)

**Release Process:**
1. Update version numbers
2. Create release branch
3. Run full test suite
4. Build production apps
5. Submit to app stores
6. Monitor deployment
7. Tag release in Git

### Over-the-Air Updates

**Expo Updates:**
```bash
# Configure updates
eas update:configure

# Publish update
eas update --branch production --message "Bug fixes and improvements"
```

**Update Strategy:**
- Critical bug fixes: immediate updates
- Feature updates: scheduled releases
- Major changes: app store releases

### Monitoring and Maintenance

**Regular Tasks:**
- Monitor crash reports
- Review user feedback
- Update dependencies
- Security audits
- Performance optimization

**Analytics Review:**
- User engagement metrics
- Feature usage statistics
- Performance benchmarks
- Conversion rates

## Security Best Practices

### Data Protection
- Encrypt sensitive local data
- Use secure API communication (HTTPS)
- Implement proper session management
- Regular security assessments

### User Privacy
- Implement privacy policy
- Handle user data appropriately
- Provide data export/deletion options
- Comply with GDPR/CCPA requirements

### App Security
- Code obfuscation for production
- Certificate pinning
- Jailbreak/root detection
- Regular dependency updates

This comprehensive deployment guide ensures successful deployment and maintenance of the EduOpps mobile application across all platforms and environments.