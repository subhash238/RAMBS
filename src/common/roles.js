/**
 * Role Constants
 * Centralized role definitions for the application
 */

const ROLES = {
  SUPERADMIN: "superadmin",
  ADMIN: "admin",
  MANAGER: "manager",
  USER: "user"
};

const ROLE_HIERARCHY = {
  [ROLES.SUPERADMIN]: [ROLES.SUPERADMIN, ROLES.ADMIN, ROLES.MANAGER, ROLES.USER],
  [ROLES.ADMIN]: [ROLES.ADMIN, ROLES.MANAGER, ROLES.USER],
  [ROLES.MANAGER]: [ROLES.USER]
};

const USER_LIMITS = {
  [ROLES.ADMIN]: 50,
  [ROLES.MANAGER]: 50
};

module.exports = {
  ROLES,
  ROLE_HIERARCHY,
  USER_LIMITS
};
