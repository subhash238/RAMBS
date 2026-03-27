# Soft Deletion Feature

## Overview
Soft deletion has been implemented for the User table. When a user is deleted, they're not actually removed from the database but marked as deleted with `isDeleted = true`.

## How It Works

### 1. **Automatic Exclusion**
- By default, all queries automatically exclude soft-deleted users
- Deleted users won't appear in:
  - User listings
  - User lookups
  - Any admin operations

### 2. **New Fields Added to Users Table**
```
- isDeleted (BOOLEAN, default: false)
- deletedAt (DATETIME, when deleted)
- deletedBy (UUID, who deleted it)
```

### 3. **Default Behavior**
- Regular queries: Only active (non-deleted) users
- Special scope queries available for admin operations

## API Endpoints

### Delete User (Soft Delete)
```bash
DELETE /api/admin/users/:id
```
**Response:**
```json
{
  "success": true,
  "message": "User deleted successfully",
  "status": 200
}
```
- User is marked as deleted
- Data is preserved in database
- User won't appear in regular queries

### Permanent Delete (Hard Delete)
```bash
DELETE /api/admin/users/:id?permanent=true
```
**Response:**
```json
{
  "success": true,
  "message": "User permanently deleted",
  "status": 200
}
```
- Actually removes user from database
- Careful! This can't be undone
- Only for admin use

### Restore Deleted User
```bash
POST /api/admin/users/:id/restore
```
**Response:**
```json
{
  "success": true,
  "message": "User restored successfully",
  "data": {
    "user": { /* user data */ }
  },
  "status": 200
}
```
- Marks user as active again
- All data is recovered

### Get Deleted Users
```bash
GET /api/admin/users/deleted/list?page=1&limit=10
```
**Response:**
```json
{
  "success": true,
  "message": "Deleted users retrieved successfully",
  "data": {
    "users": [
      {
        "id": "uuid",
        "name": "John Doe",
        "email": "john@example.com",
        "role": "user",
        "isDeleted": true,
        "deletedAt": "2026-02-23T10:00:00Z",
        "deletedBy": "admin-uuid"
      }
    ],
    "pagination": {
      "total": 5,
      "page": 1,
      "limit": 10,
      "pages": 1
    }
  },
  "status": 200
}
```
- Lists all soft-deleted users
- Shows who deleted them and when

## Usage Examples

### JavaScript/Node.js

**Get only active users (default):**
```javascript
const users = await User.findAll();
// Only non-deleted users
```

**Get all users including deleted:**
```javascript
const users = await User.scope('withDeleted').findAll();
// Both active and deleted users
```

**Get only deleted users:**
```javascript
const deletedUsers = await User.scope('onlyDeleted').findAll();
// Only deleted users
```

**Soft delete a user:**
```javascript
user.isDeleted = true;
user.deletedAt = new Date();
user.deletedBy = adminId;
await user.save();
```

**Restore a user:**
```javascript
user.isDeleted = false;
user.deletedAt = null;
user.deletedBy = null;
await user.save();
```

## Database Behavior

### User Table Schema
```sql
CREATE TABLE users (
  ...
  isDeleted BOOLEAN DEFAULT false,
  deletedAt TIMESTAMP NULL,
  deletedBy UUID NULL,
  ...
);
```

### Automatic WHERE Clause
- All queries automatically add: `WHERE isDeleted = false`
- No need to manually filter
- Transparent to application code

### Indexes
Consider adding index for performance:
```sql
CREATE INDEX idx_users_isDeleted ON users(isDeleted);
```

## Security & Best Practices

1. **Audit Trail**
   - Who deleted the user
   - When they were deleted
   - Easy to track deletions

2. **Data Recovery**
   - Accidentally deleted users can be restored
   - No data loss
   - Reversible operation

3. **Performance**
   - Soft deletion is faster than hard deletion
   - No cascading deletes needed
   - Queries still efficient with isDeleted index

4. **Compliance**
   - Data retention policies easily implemented
   - Audit logs preserved
   - GDPR-friendly with restore capability

## Scopes Available

### Default Scope
```javascript
User.findAll() // Returns only non-deleted users
```

### With Deleted Scope
```javascript
User.scope('withDeleted').findAll() // Returns all users
```

### Only Deleted Scope
```javascript
User.scope('onlyDeleted').findAll() // Returns only deleted users
```

## Future Enhancements

- [ ] Permanent deletion after X days (scheduled cleanup)
- [ ] Soft deletion for other tables
- [ ] Deletion reason tracking
- [ ] Bulk restore/delete operations
- [ ] Audit log table for all deletions
