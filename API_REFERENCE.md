# RBAMS API Quick Reference

## Server Status
✅ Server running on `http://localhost:3000`
✅ Database: SQLite (development) / PostgreSQL (production)
✅ All dependencies installed

## Getting Started

### 1. Create Initial Admin User

The first user needs to be created through direct database insertion or a dedicated seeding script. You can add a user to the database:

```javascript
// Using Node REPL
const { User } = require('./src/models');
const bcrypt = require('bcrypt');

const password = await bcrypt.hash('admin123', 10);
await User.create({
  name: 'Admin User',
  email: 'admin@example.com',
  password: password,
  role: 'superadmin'
});
```

### 2. Get JWT Token

First, you'll need a login endpoint. Here's how to add it to user routes:

```javascript
// Add to src/modules/user/routes/user.routes.js
router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  const user = await User.findOne({ where: { email } });
  
  if (!user || !(await bcrypt.compare(password, user.password))) {
    return error(res, 'Invalid credentials', 401);
  }
  
  const token = jwt.sign(
    { id: user.id, email: user.email, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRE }
  );
  
  return success(res, 'Login successful', { token });
});
```

### 3. Use Token for Requests

All API requests (except `/health`) require:

```
Authorization: Bearer <YOUR_JWT_TOKEN>
```

Optional:
```
X-Required-Role: admin,superadmin
```

## API Endpoints Summary

### Health Check
```
GET /health
```

### Admin Routes (`/api/admin`)

| Method | Endpoint | Role | Description |
|--------|----------|------|-------------|
| GET | `/users` | admin | List all users with pagination |
| POST | `/users` | admin | Create new user |
| GET | `/users/:id` | admin | Get user details |
| PUT | `/users/:id` | admin | Update user |
| DELETE | `/users/:id` | admin | Delete user |
| GET | `/roles` | admin | List all roles |
| POST | `/users/:userId/roles/:roleId` | admin | Assign role to user |
| GET | `/dashboard` | admin | Dashboard statistics |
| GET | `/logs` | admin | System logs |

### User Routes (`/api/user`)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/me` | Get current user profile |
| PUT | `/me` | Update current user profile |
| POST | `/change-password` | Change password |
| GET | `/activity` | Get user activity log |

## Example Requests

### Health Check
```bash
curl -X GET http://localhost:3000/health
```

Response:
```json
{
  "status": "OK",
  "message": "Server is running"
}
```

### List All Users
```bash
curl -X GET "http://localhost:3000/api/admin/users?page=1&limit=10" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIs..." \
  -H "X-Required-Role: admin"
```

### Create New User
```bash
curl -X POST http://localhost:3000/api/admin/users \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIs..." \
  -H "Content-Type: application/json" \
  -d '{
    "name": "John Doe",
    "email": "john@example.com",
    "password": "securepassword123",
    "role": "user"
  }'
```

### Get Current User
```bash
curl -X GET http://localhost:3000/api/user/me \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIs..."
```

### Update User Profile
```bash
curl -X PUT http://localhost:3000/api/user/me \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIs..." \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Jane Doe",
    "email": "jane@example.com"
  }'
```

### Change Password
```bash
curl -X POST http://localhost:3000/api/user/change-password \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIs..." \
  -H "Content-Type: application/json" \
  -d '{
    "currentPassword": "oldpassword123",
    "newPassword": "newpassword123",
    "confirmPassword": "newpassword123"
  }'
```

### Assign Role to User
```bash
curl -X POST http://localhost:3000/api/admin/users/user-uuid/roles/admin \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIs..." \
  -H "X-Required-Role: superadmin"
```

### Get Dashboard Stats
```bash
curl -X GET http://localhost:3000/api/admin/dashboard \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIs..." \
  -H "X-Required-Role: admin"
```

## Response Format

### Success Response
```json
{
  "success": true,
  "message": "Operation successful",
  "data": { ... },
  "status": 200,
  "timestamp": "2026-02-23T10:31:26.000Z"
}
```

### Error Response
```json
{
  "success": false,
  "message": "Error message",
  "errors": [],
  "status": 400,
  "timestamp": "2026-02-23T10:31:26.000Z"
}
```

## Common Status Codes

- **200** - OK
- **201** - Created
- **400** - Bad Request
- **401** - Unauthorized
- **403** - Forbidden
- **404** - Not Found
- **500** - Internal Server Error

## Roles

- `superadmin` - Full system access
- `admin` - Administrative access
- `manager` - Management access
- `user` - Regular user access

## Environment Variables

```env
NODE_ENV=development              # development or production
PORT=3000                         # Server port
DATABASE_URL=postgresql://...     # PostgreSQL connection (production)
JWT_SECRET=your_secret_key        # JWT signing key
JWT_EXPIRE=7d                     # Token expiration time
LOG_LEVEL=debug                   # Logging level
```

## Troubleshooting

### Server Won't Start
- Check `.env` file is properly configured
- Ensure port 3000 is available
- Check logs in `logs/app.log`

### Database Connection Error
- For SQLite: Ensure `rbams.db` file can be created
- For PostgreSQL: Verify `DATABASE_URL` format and server is running

### Authentication Failed
- Verify JWT token is in Authorization header
- Check token hasn't expired
- Ensure `JWT_SECRET` matches in `.env`

### Access Denied
- Verify `X-Required-Role` header is set correctly
- Check user's role in database
- Ensure user role includes required privilege

## Next Steps

1. ✅ Server is running
2. Create seed script for initial data
3. Add login endpoint for user authentication
4. Add refresh token functionality
5. Set up email verification
6. Add rate limiting
7. Write API tests
8. Deploy to production

## Support

Check `logs/app.log` for detailed error information.
