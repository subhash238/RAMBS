# AuthLoggerService Documentation

## Overview

The `AuthLoggerService` is a common authentication logging service that handles login/logout logging for both user and admin modules. It provides a unified way to track user authentication events with detailed device and session information.

## Features

- **Unified Logging**: Handles both user and admin authentication events
- **Device Detection**: Automatically detects device type, OS, and browser
- **Session Management**: Tracks active sessions and supports forced logout
- **IP Tracking**: Handles various IP formats including proxy setups
- **Device Fingerprinting**: Generates unique device IDs for session tracking

## Database Model

The service uses the `UserLog` model with the following fields:

- `user_id`: User who performed the action (nullable for unauthenticated requests)
- `ip`: User IP address
- `device_os`: Operating system of the device
- `device_id`: Unique device identifier
- `device_name`: Device name (e.g., iPhone, Samsung Galaxy, Chrome)
- `device_model`: Device model (e.g., iPhone 14, Galaxy S23)
- `device_type`: Device type (android, ios, web)
- `login_date`: Login timestamp
- `logout_date`: Logout timestamp

## Usage

### Basic Login/Logout Logging

```javascript
const AuthLoggerService = require("../services/authLogger.service");

// Log user login
await AuthLoggerService.logLogin(user, req, 'user');

// Log admin login
await AuthLoggerService.logLogin(admin, req, 'admin');

// Log user logout
await AuthLoggerService.logLogout(user, req, 'user');

// Log admin logout
await AuthLoggerService.logLogout(admin, req, 'admin');
```

### Session Management

```javascript
// Get active sessions for a user
const activeSessions = await AuthLoggerService.getActiveSessions(userId);

// Logout all sessions for a user
const loggedOutCount = await AuthLoggerService.logoutAllSessions(userId);
```

## Integration Examples

### User Controller Integration

```javascript
const AuthLoggerService = require("../../../services/authLogger.service");

exports.login = async (req, res) => {
  try {
    // ... authentication logic ...
    
    // Log successful login
    await AuthLoggerService.logLogin(user, req, 'user');
    
    return success(res, "Login successful", { token, user });
  } catch (err) {
    return error(res, "Failed to login", 500);
  }
};

exports.logout = async (req, res) => {
  try {
    // Log logout
    await AuthLoggerService.logLogout(req.user, req, 'user');
    
    return success(res, "Logout successful");
  } catch (err) {
    return error(res, "Failed to logout", 500);
  }
};
```

### Admin Controller Integration

```javascript
const AuthLoggerService = require("../../../services/authLogger.service");

exports.adminLogin = async (req, res) => {
  try {
    // ... admin authentication logic ...
    
    // Log admin login
    await AuthLoggerService.logLogin(admin, req, 'admin');
    
    return success(res, "Admin login successful", { token, admin });
  } catch (err) {
    return error(res, "Failed to login", 500);
  }
};
```

## API Endpoints

The service provides the following API endpoints when integrated with controllers:

### User Logs Management

- `GET /api/admin/user-logs` - Get paginated user logs
- `GET /api/admin/user-logs/active/:userId` - Get active sessions for a user
- `POST /api/admin/user-logs/logout-all/:userId` - Force logout all sessions for a user
- `GET /api/admin/user-logs/history/:userId` - Get login history for a user

## Device Detection

The service automatically detects:

### Device Types
- **Android**: Android devices
- **iOS**: iPhone, iPad, iPod
- **Web**: Desktop browsers and web applications

### Operating Systems
- **Windows**: Windows desktop
- **macOS**: Apple desktop
- **Linux**: Linux distributions
- **iOS**: Apple mobile devices
- **Android**: Android devices

### Browsers
- **Chrome**: Google Chrome
- **Firefox**: Mozilla Firefox
- **Safari**: Apple Safari
- **Edge**: Microsoft Edge
- **Postman**: Postman API client

## Security Features

### IP Address Handling
- Supports proxy setups with `x-forwarded-for` header
- IPv6 to IPv4 conversion for consistency
- IP list handling (takes first non-empty entry)

### Device Fingerprinting
- Generates SHA-256 hash based on user agent and IP
- Helps identify unique devices for session tracking
- Prevents duplicate session creation on same device

### Session Management
- Tracks active sessions with `logout_date: null`
- Supports multiple concurrent sessions per user
- Handles device-specific session tracking

## Error Handling

The service includes comprehensive error handling:

```javascript
try {
  await AuthLoggerService.logLogin(user, req, 'user');
} catch (error) {
  logger.error(`Failed to log user login: ${error.message}`);
  // Continue with authentication even if logging fails
}
```

## Logging Levels

The service uses different logging levels:

- **INFO**: Successful login/logout events
- **WARN**: Multiple login attempts, missing sessions
- **ERROR**: Failed logging operations

## Best Practices

1. **Always wrap in try-catch**: Don't let logging failures break authentication
2. **Use appropriate user types**: Specify 'user' or 'admin' for better tracking
3. **Handle concurrent sessions**: The service manages multiple sessions automatically
4. **Monitor logs**: Regularly check for unusual login patterns
5. **Use forced logout**: Implement admin controls for session management

## Migration from Old System

If migrating from an existing logging system:

1. Update imports to use `AuthLoggerService`
2. Replace manual `UserLog.create()` calls with service methods
3. Remove old helper functions (`getDeviceType`, `getDeviceOS`)
4. Update controller methods to use the new service

## Future Enhancements

Potential future improvements:

- **Geolocation**: Add location tracking based on IP
- **Anomaly Detection**: Flag suspicious login patterns
- **Session Analytics**: Detailed session duration and usage statistics
- **Multi-factor Auth**: Support for MFA logging
- **Biometric Data**: Device fingerprint enhancement
