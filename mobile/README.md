# EduOpps Mobile App

A React Native mobile application for students to browse and register interest in educational opportunities. This app reuses the core functionality from the web application's opportunities page while providing a native mobile experience.

## Features

- **Authentication**: Secure login for students
- **Opportunities Browse**: View all available educational opportunities
- **Search & Filter**: Find opportunities by keywords and filters
- **Interest Registration**: Show/remove interest in opportunities
- **Opportunity Details**: Comprehensive view of each opportunity
- **Contact Integration**: Direct email/phone contact with organizers
- **Profile Management**: View and manage student profile

## Tech Stack

- **React Native**: Cross-platform mobile development
- **Expo**: Development platform and tools
- **TypeScript**: Type-safe development
- **React Navigation**: Navigation library
- **React Query**: Data fetching and caching
- **React Native Paper**: Material Design components
- **Async Storage**: Local data persistence

## Project Structure

```
mobile/
├── src/
│   ├── components/          # Reusable UI components
│   ├── screens/            # Screen components
│   │   ├── LoginScreen.tsx
│   │   ├── OpportunitiesScreen.tsx
│   │   ├── OpportunityDetailScreen.tsx
│   │   └── ProfileScreen.tsx
│   ├── services/           # API and authentication services
│   │   ├── api.ts
│   │   └── AuthContext.tsx
│   ├── types/              # TypeScript type definitions
│   │   └── index.ts
│   └── utils/              # Utility functions
├── App.tsx                 # Main app component
├── app.json               # Expo configuration
├── package.json           # Dependencies
└── README.md              # This file
```

## Setup Instructions

### Prerequisites

1. Node.js (v16 or later)
2. npm or yarn
3. Expo CLI: `npm install -g @expo/cli`
4. Expo Go app on your mobile device (for testing)

### Installation

1. Navigate to the mobile app directory:
   ```bash
   cd mobile
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Update the API base URL in `src/services/api.ts`:
   ```typescript
   const API_BASE_URL = 'http://your-server-url:5000';
   ```

4. Start the development server:
   ```bash
   npm start
   ```

5. Scan the QR code with Expo Go app to run on your device

### Building for Production

#### Android
```bash
expo build:android
```

#### iOS
```bash
expo build:ios
```

## Code Reuse from Web App

The mobile app reuses several key concepts from the web application:

### Shared Types
- `Opportunity` interface from web app
- `SearchFilters` and `FilterOptions` types
- User authentication types

### Shared Logic
- API endpoints structure
- Authentication flow
- Data fetching patterns
- Interest registration/removal logic

### Adapted Components
- **OpportunitiesScreen**: Mobile version of web `opportunities.tsx`
- **OpportunityDetailScreen**: Mobile opportunity detail modal
- **SearchFilters**: Mobile-optimized filtering
- **AuthContext**: Adapted authentication provider

## Key Differences from Web App

### UI/UX Adaptations
- **Touch-First Interface**: Larger touch targets, swipe gestures
- **Navigation**: Bottom tabs + stack navigation instead of sidebar
- **Cards Layout**: Vertical list optimized for mobile scrolling
- **Pull-to-Refresh**: Native mobile pattern for data refresh

### Mobile-Specific Features
- **Deep Linking**: Share opportunities via native sharing
- **Contact Integration**: Direct phone/email app integration
- **Offline Support**: Cached data with React Query
- **Push Notifications**: Ready for notification integration

### Performance Optimizations
- **Lazy Loading**: Images and content loaded on demand
- **Virtual Lists**: Efficient rendering of large opportunity lists
- **Caching**: Aggressive caching with React Query
- **Bundle Splitting**: Optimized app bundle size

## API Integration

The mobile app connects to the same backend APIs as the web application:

- `GET /api/opportunities/search` - Search opportunities
- `POST /api/opportunities/:id/register` - Register interest
- `DELETE /api/opportunities/:id/unregister` - Remove interest
- `POST /api/auth/login` - User authentication
- `GET /api/auth/current-user` - Get current user info

## Development Guidelines

### State Management
- Use React Query for server state
- Local state with useState/useReducer
- Context for global app state (auth)

### Navigation
- Stack navigation for hierarchical flows
- Bottom tabs for main app sections
- Modal presentation for details

### Styling
- StyleSheet for component styles
- Consistent color scheme with web app
- Material Design principles
- Responsive design for different screen sizes

### Error Handling
- Network error recovery
- User-friendly error messages
- Offline state handling
- Loading states for all async operations

## Future Enhancements

### Planned Features
- **Push Notifications**: Opportunity deadlines and updates
- **Offline Mode**: Full offline browsing capability
- **Dark Mode**: Theme switching support
- **Biometric Auth**: Fingerprint/face recognition login
- **Document Upload**: Mobile document submission
- **Calendar Integration**: Add deadlines to device calendar

### Performance Improvements
- **Image Optimization**: WebP format, lazy loading
- **Bundle Analysis**: Reduce app size
- **Memory Management**: Optimize large lists
- **Network Optimization**: Request batching, compression

## Testing

### Development Testing
- Use Expo Go for rapid testing
- Test on both iOS and Android
- Various screen sizes and orientations

### Production Testing
- Build standalone apps for testing
- Performance testing on low-end devices
- Network condition testing (slow/offline)

## Deployment

### App Store Guidelines
- Follow Apple App Store guidelines
- Google Play Store compliance
- Content rating appropriate for educational app
- Privacy policy and terms of service

### Release Process
1. Update version in `app.json` and `package.json`
2. Build production apps
3. Test thoroughly on multiple devices
4. Submit to app stores
5. Monitor crash reports and user feedback

## Support

For technical issues or questions about the mobile app:
1. Check this README for common solutions
2. Review the web app documentation for API details
3. Contact the development team for assistance

## Contributing

When contributing to the mobile app:
1. Follow the existing code style and patterns
2. Ensure compatibility with both iOS and Android
3. Test thoroughly on multiple devices
4. Update documentation for new features
5. Consider impact on web app shared components