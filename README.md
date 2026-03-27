# RBAMS - Role-Based Access Management System

A complete Node.js + Express + Sequelize backend for role-based access control with JWT authentication.

## Features

✅ **Authentication**
- JWT-based token authentication
- Password hashing with bcrypt
- Secure password management

✅ **Authorization**
- Role-based access control (RBAC)
- Dynamic role authorization via HTTP headers
- Admin privileges: superadmin, admin, manager

✅ **User Management**
- Create, read, update, delete users
- User profile management
- Password change functionality
- Activity logging

✅ **Admin Dashboard**
- User management interface
- Role distribution statistics
- System logs
- Activity tracking

✅ **Database**
- SQLite for development
- PostgreSQL support for production
- Sequelize ORM
- Automatic schema sync

✅ **Logging**
- Winston logger with custom levels
- File and console logging
- Color-coded output
- Request tracking

## Installation

```bash
# Install dependencies
npm install

# Setup environment variables
cp .env.example .env

# Update .env with your configuration
```

## Configuration

Edit `.env` file:

```env
NODE_ENV=development
PORT=3000

# For production with PostgreSQL
DATABASE_URL=postgresql://user:password@localhost:5432/rbams

# JWT Configuration
JWT_SECRET=your_super_secret_key
JWT_EXPIRE=7d

LOG_LEVEL=debug
```

## Running the Server

```bash
# Development with nodemon
npm run dev

# Production
npm start
```

Server starts on `http://localhost:3000`

## API Routes

### Admin Routes (`/api/admin`)

**User Management:**
- `GET /api/admin/users` - List all users (with pagination & filtering)
- `GET /api/admin/users/:id` - Get single user
- `POST /api/admin/users` - Create new user
- `PUT /api/admin/users/:id` - Update user
- `DELETE /api/admin/users/:id` - Delete user

**Role Management:**
- `GET /api/admin/roles` - List all roles
- `POST /api/admin/users/:userId/roles/:roleId` - Assign role to user

**Dashboard:**
- `GET /api/admin/dashboard` - Dashboard statistics
- `GET /api/admin/logs` - System logs

### User Routes (`/api/user`)

**Profile:**
- `GET /api/user/me` - Get current user profile
- `PUT /api/user/me` - Update current user profile
- `POST /api/user/change-password` - Change password
- `GET /api/user/activity` - User activity log

## Authentication

All endpoints (except `/health`) require JWT token in Authorization header:

```bash
Authorization: Bearer <your_jwt_token>
```

## Authorization

Control access via `X-Required-Role` header:

```bash
# Single role
X-Required-Role: admin

# Multiple roles (comma-separated)
X-Required-Role: admin, superadmin, manager

# If header is omitted, checks for admin privileges by default
```

## Example Request

```bash
curl -X GET http://localhost:3000/api/admin/users \
  -H "Authorization: Bearer eyJhbGc..." \
  -H "X-Required-Role: admin"
```

## Project Structure

```
RBAMS/
├── src/
│   ├── app.js                 # Express app setup
│   ├── common/
│   │   └── response.js        # Response handlers
│   ├── config/
│   │   ├── database.js        # Sequelize config
│   │   └── logger.js          # Winston logger
│   ├── middlewares/
│   │   ├── auth.middleware.js # JWT verification
│   │   └── role.middleware.js # Role authorization
│   ├── models/
│   │   ├── index.js           # Model exports
│   │   └── user.model.js      # User model
│   └── modules/
│       ├── admin/             # Admin module
│       │   ├── controllers/
│       │   ├── routes/
│       │   └── index.js
│       └── user/              # User module
│           ├── controllers/
│           ├── routes/
│           └── index.js
├── server.js                  # Entry point
├── package.json
├── .env                       # Environment variables
└── .gitignore
```

## Database

The application uses Sequelize ORM:

- **Development:** SQLite (`rbams.db`)
- **Production:** PostgreSQL

Automatic schema synchronization on server start.

### User Model

```javascript
{
  id: UUID (primary key)
  name: String
  email: String (unique)
  password: String (hashed)
  role: ENUM("superadmin", "manager", "admin", "user")
  createdBy: UUID
  updatedBy: UUID
  timestamps: true
}
```

## Error Handling

All responses follow a consistent format:

```json
{
  "success": false,
  "message": "Error message",
  "status": 400,
  "errors": [],
  "timestamp": "2026-02-23T04:57:00.000Z"
}
```

## Logging

Logs are stored in:
- **Console:** Colored output for development
- **File:** `logs/app.log` (JSON format)

Levels: error, warn, info, success, fail, debug

## Security

- ✅ Password hashing with bcrypt (10 rounds)
- ✅ JWT token-based authentication
- ✅ Role-based access control
- ✅ Protected routes with middleware
- ✅ SQL injection prevention (Sequelize ORM)
- ✅ Request validation

## Future Enhancements

- [ ] Email verification
- [ ] Password reset functionality
- [ ] Google/OAuth integration
- [ ] Refresh tokens
- [ ] Rate limiting
- [ ] API documentation (Swagger)
- [ ] Unit and integration tests
- [ ] Docker support

## License

ISC

## Support

For issues or questions, please create an issue in the repository.
