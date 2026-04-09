const { User } = require("../models");
const { ROLES, ROLE_HIERARCHY, USER_LIMITS } = require("../common/roles");
const { Op } = require("sequelize");

/**
 * Validate required fields
 * @param {Object} fields - Object with field names and values
 * @returns {Array|null} - Array of missing fields or null if all present
 */
const validateRequiredFields = (fields) => {
  const missing = Object.entries(fields)
    .filter(([_, value]) => !value)
    .map(([key]) => key);
  return missing.length > 0 ? missing : null;
};

/**
 * Check if creator can create target role
 * @param {string} creatorRole - Role of the creator
 * @param {string} targetRole - Role to be created
 * @returns {boolean}
 */
const canCreateRole = (creatorRole, targetRole) => {
  const allowedRoles = ROLE_HIERARCHY[creatorRole] || [];
  return allowedRoles.includes(targetRole);
};

/**
 * Check user creation limit for a user (uses per-user limit from database)
 * @param {string} creatorId - UUID of the creator
 * @param {string} creatorRole - Role of the creator
 * @param {number} customLimit - Optional custom limit (from user's record)
 * @returns {Object} - { exceeded: boolean, count: number, limit: number }
 */
const checkUserLimit = async (creatorId, creatorRole, customLimit = null) => {
  // Superadmin has no limit
  if (creatorRole === ROLES.SUPERADMIN) {
    return { exceeded: false, count: 0, limit: null };
  }

  // Use custom limit if provided, otherwise fall back to default
  const limit = customLimit || USER_LIMITS[creatorRole] || 50;

  const count = await User.count({
    where: { createdBy: creatorId, isDeleted: false }
  });

  return {
    exceeded: count >= limit,
    count,
    limit
  };
};

/**
 * Check if operator can modify/delete target role
 * @param {string} operatorRole - Role of the operator
 * @param {string} targetRole - Role to be modified/deleted
 * @returns {boolean}
 */
const canModifyRole = (operatorRole, targetRole) => {
  const hierarchy = {
    [ROLES.SUPERADMIN]: [ROLES.SUPERADMIN, ROLES.ADMIN, ROLES.MANAGER, ROLES.USER],
    [ROLES.ADMIN]: [ROLES.MANAGER, ROLES.USER],  // Admin can update managers and users only
    [ROLES.MANAGER]: [ROLES.USER]
  };
  return hierarchy[operatorRole]?.includes(targetRole) || false;
};

/**
 * Check if operator can modify sensitive data of target user
 * @param {Object} operator - Operator user object
 * @param {Object} targetUser - Target user object
 * @returns {boolean}
 */
const canModifySensitiveData = (operator, targetUser) => {
  const isSelf = operator.id === targetUser.id;
  const isSuperAdmin = operator.role === ROLES.SUPERADMIN;
  const isAdmin = operator.role === ROLES.ADMIN;
  const isManager = operator.role === ROLES.MANAGER;
  const targetIsUser = targetUser.role === ROLES.USER;
  const targetIsManager = targetUser.role === ROLES.MANAGER;

  if (isSuperAdmin) return true;
  if (!isAdmin && !isManager) return isSelf;
  if (isManager) return isSelf || targetIsUser;
  if (isAdmin) return isSelf || targetIsManager || targetIsUser;

  return false;
};

/**
 * Check if email exists
 * @param {string} email - Email to check
 * @param {string} excludeId - User ID to exclude from check
 * @returns {Promise<Object|null>} - Existing user or null
 */
const checkEmailExists = async (email, excludeId = null) => {
  const where = { email };
  if (excludeId) where.id = { [Op.ne]: excludeId };
  return await User.findOne({ where });
};

module.exports = {
  validateRequiredFields,
  canCreateRole,
  checkUserLimit,
  canModifyRole,
  canModifySensitiveData,
  checkEmailExists,
  ROLES,
  ROLE_HIERARCHY,
  USER_LIMITS
};
