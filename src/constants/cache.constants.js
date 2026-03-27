/**
 * Cache Constants
 * Centralized cache configuration for enterprise-level caching
 */

// Cache namespaces
const CACHE_NAMESPACES = {
  SETTINGS: "settings",
  USERS: "users",
  USER_ACTIVITY: "user_activity",
  SYSTEM: "system",
  PERMISSIONS: "permissions"
};

// Cache TTL strategies (in seconds)
const CACHE_TTL = {
  IMMEDIATE: 60,        // 1 min - Real-time data
  SHORT: 300,          // 5 min - Frequently changing data
  MEDIUM: 1800,        // 30 min - Moderately changing data
  LONG: 3600,          // 1 hour - Stable data
  EXTENDED: 86400,     // 24 hours - Very stable data
  PERSISTENT: 604800   // 7 days - Reference data
};

// Cache key patterns
const CACHE_PATTERNS = {
  ALL: "all",
  BY_ID: (id) => `id:${id}`,
  BY_USER: (userId) => `user:${userId}`,
  BY_ROLE: (role) => `role:${role}`,
  BY_EMAIL: (email) => `email:${email}`,
  BY_STATUS: (status) => `status:${status}`,
  PAGINATED: (page, limit) => `page:${page}:limit:${limit}`,
  SEARCH: (query) => `search:${query}`,
  DATE_RANGE: (start, end) => `date:${start}:${end}`
};

// Cache versioning
const CACHE_VERSIONS = {
  V1: "v1",
  V2: "v2",
  CURRENT: "v1"
};

// Cache invalidation strategies
const CACHE_INVALIDATION = {
  IMMEDIATE: "immediate",
  DELAYED: "delayed",
  PATTERN: "pattern",
  SELECTIVE: "selective"
};

module.exports = {
  CACHE_NAMESPACES,
  CACHE_TTL,
  CACHE_PATTERNS,
  CACHE_VERSIONS,
  CACHE_INVALIDATION
};
