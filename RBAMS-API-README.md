# Role-Based Access Management System (RBAMS) API Collection

## 📋 Overview
This collection contains all API endpoints for the RBAMS application including:
- User Authentication & Profile Management
- Admin User & Role Management
- Settings & Permission Management
- System Monitoring & Logs
- Maintenance Mode Controls

## 🚀 Quick Start

### 1. Environment Setup
Create an environment with the following variables:
- `base_url`: `http://localhost:3000`
- `auth_token`: Will be auto-populated after login
- `user_id`: Current user ID (auto-populated)
- `admin_id`: Admin user ID (for admin operations)

### 2. Authentication Flow
1. **Register**: `POST /api/user/register`
2. **Login**: `POST /api/user/login` (token automatically saved)
3. **Use Auth Token**: All protected endpoints use `Authorization: Bearer {{auth_token}}`

### 3. User Roles & Permissions

#### 🎯 Role Hierarchy:
- **Superadmin**: Unlimited user creation, full system access
- **Admin**: Max 50 users (with permission override)
- **Manager**: Max 50 users (with permission override)
- **User**: Basic access only

#### 🔐 Permission System:
- **Default Limits**: Admin/Manager can create 50 users
- **Permission Override**: Superadmin can grant unlimited access
- **Self-Service**: Users can update own profile

## 📚 API Modules

### 🔐 Authentication Module
- Register new users
- Login with JWT tokens
- Refresh tokens
- Logout sessions

### 👥 User Management Module
- Get all users (with pagination)
- Get user by ID
- Create new users
- Update user information
- Soft delete users
- Restore deleted users
- Get deleted users list

### 🛡️ Admin Module
- Role management (CRUD)
- Permission management
- Dashboard statistics
- System logs
- User activity tracking

### ⚙️ Settings Module
- System configuration
- Maintenance mode controls
- Application settings

## 🧪 Testing Guidelines

### 📝 Response Validation
All endpoints include:
- **Success Examples**: 200/201 status codes
- **Error Examples**: 400/401/403/404/500 status codes
- **Schema Validation**: Proper JSON structure

### 🔍 Debugging Tips
1. **Check Health**: `GET /health` for system status
2. **Verify Token**: Ensure `auth_token` is populated
3. **Check Permissions**: Verify user role for admin endpoints
4. **Monitor Logs**: Check server logs for detailed errors

### ⚡ Performance Testing
- **Rate Limiting**: 100 requests/15min per IP
- **Login Limiting**: 5 attempts/15min per IP
- **Registration Limiting**: 3 attempts/hour per IP

## 🛠️ Script Execution

### 📜 Pre-request Scripts
All requests include automatic:
- **Token Validation**: Check if auth_token is valid
- **User ID Population**: Auto-set user_id from token
- **Timestamp Logging**: Add request timestamps

### 🧪 Test Scripts
All requests include:
- **Response Validation**: Check status codes
- **Token Storage**: Auto-save new tokens
- **Error Logging**: Log failed requests
- **Performance Metrics**: Track response times

## 🔧 Custom Scripts

### 📝 Environment Variables Script
```javascript
// Auto-populate user data from login response
if (pm.response.code === 200 && pm.response.json().data) {
    const userData = pm.response.json().data;
    pm.environment.set('auth_token', userData.token);
    pm.environment.set('user_id', userData.user.id);
    pm.environment.set('user_email', userData.user.email);
    pm.environment.set('user_role', userData.user.role);
}
```

### 🧪 Health Check Script
```javascript
// Validate health check response
if (pm.response.code === 200) {
    const health = pm.response.json();
    pm.test('Server is running', () => {
        pm.expect(health.status).to.eql('OK');
    });
    pm.test('Database is connected', () => {
        pm.expect(health.services.database).to.eql('OK');
    });
}
```

### 📊 Performance Monitoring Script
```javascript
// Track response times
const responseTime = pm.response.responseTime;
if (responseTime > 1000) {
    pm.test('Response time warning', () => {
        console.warn(`Slow response: ${responseTime}ms`);
    });
}
```

## 🚨 Error Handling

### 📋 Common Error Codes
- **400**: Bad Request (validation errors)
- **401**: Unauthorized (invalid/missing token)
- **403**: Forbidden (insufficient permissions)
- **404**: Not Found (resource doesn't exist)
- **429**: Too Many Requests (rate limiting)
- **500**: Internal Server Error

### 🔧 Troubleshooting
1. **Clear Environment**: Reset all environment variables
2. **Check Server**: Verify server is running on port 3000
3. **Database Status**: Check `/health` endpoint
4. **Token Refresh**: Use refresh token endpoint

## 📞 Support

For issues or questions:
1. Check server logs for detailed errors
2. Verify all environment variables are set
3. Ensure proper user permissions for admin endpoints
4. Use the health check endpoint to verify system status

---

**Last Updated**: March 2026  
**Version**: 1.0.0  
**API Version**: v1

## 📁 Files Included
- `RBAMS-API-Collection.postman_collection.json` - Main Postman collection
- `RBAMS-API-README.md` - This documentation file

## 🌐 How to Use

1. **Import Collection**: 
   - Open Postman
   - Click "Import" 
   - Select `RBAMS-API-Collection.postman_collection.json`

2. **Setup Environment**:
   - Create new environment
   - Add variable: `base_url` = `http://localhost:3000`

3. **Test APIs**:
   - Run Health Check first
   - Login with credentials
   - Use auto-populated tokens for other requests

## 🔐 Default Credentials

### Superadmin (for testing):
- **Email**: `superadmin@example.com`
- **Password**: `superadmin123`

### Admin (for testing):
- **Email**: `admin@example.com`
- **Password**: `admin123`

### Manager (for testing):
- **Email**: `manager@example.com`
- **Password**: `manager123`

### Regular User (for testing):
- **Email**: `user@example.com`
- **Password**: `user123`
