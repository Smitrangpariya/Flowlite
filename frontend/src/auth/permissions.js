/**
 * Centralized permission definitions.
 * Single source of truth for role-based UI gating.
 */
export const PERMISSIONS = {
  CREATE_TEAM_BOARD: ["ADMIN", "MANAGER", "PRODUCT_MANAGER"],
  CREATE_PERSONAL_BOARD: ["USER", "ADMIN", "MANAGER", "TEAM_LEAD", "TEAM_MEMBER", "PRODUCT_MANAGER"],
};

/**
 * Check if a user has a specific permission.
 * @param {object} user - User object with a `role` property
 * @param {string} permission - Key from PERMISSIONS map
 * @returns {boolean}
 */
export function hasPermission(user, permission) {
  return PERMISSIONS[permission]?.includes(user?.role) ?? false;
}
