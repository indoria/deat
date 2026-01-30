/**
 * @file auth.js
 * @summary Proposed API for the Authentication & Authorization module.
 * @description This file defines the API for `GS.auth`, which handles user authentication,
 * authorization, token management, and permission checking. This is essential for production
 * deployments with remote storage, multi-user scenarios, and integration with external
 * services requiring authentication (e.g., GitHub OAuth).
 * See: doc/window.GS.md, doc/arch/data.md
 */

/**
 * @namespace GS.auth
 * @description API for authentication, authorization, and user management.
 */
const auth = {
    // ============================================
    // Authentication
    // ============================================

    /**
     * Authenticates a user with a specific provider and credentials.
     * Supports multiple authentication methods: basic auth, OAuth, API keys, etc.
     * @param {string} provider - The authentication provider (e.g., 'github', 'local', 'oauth').
     * @param {object} credentials - Provider-specific credentials.
     *   For 'local': { username, password }
     *   For 'github': { token } or { username, password }
     *   For 'oauth': { code, state }
     * @returns {Promise<User>} The authenticated user object.
     * @fires auth.login.start
     * @fires auth.login.success
     * @fires auth.login.failure
     */
    async login(provider, credentials) {},

    /**
     * Logs out the current user and invalidates their session.
     * @returns {Promise<void>}
     * @fires auth.logout
     */
    async logout() {},

    /**
     * Gets the currently authenticated user.
     * @returns {User | null} The user object or null if not authenticated.
     */
    getCurrentUser() {},

    /**
     * Checks if a user is currently authenticated.
     * @returns {boolean} True if authenticated, false otherwise.
     */
    isAuthenticated() {},

    /**
     * Gets the current authentication token (if available).
     * @returns {string | null} The auth token or null.
     */
    getAuthToken() {},

    /**
     * Refreshes the authentication token (for token-based auth like JWT).
     * @returns {Promise<string>} The new token.
     * @fires auth.token.refresh
     */
    async refreshToken() {},

    /**
     * Sets a custom auth token manually (for pre-existing tokens).
     * @param {string} token - The authentication token.
     * @fires auth.token.set
     */
    setAuthToken(token) {},

    /**
     * Validates if the current token is still valid.
     * @returns {Promise<boolean>} True if valid, false if expired/invalid.
     */
    async validateToken() {},

    // ============================================
    // Permissions & Authorization
    // ============================================

    /**
     * Checks if the current user has permission to perform an action on a resource.
     * @param {string} resource - The resource (e.g., 'graph', 'storage', 'adapter').
     * @param {string} action - The action (e.g., 'read', 'write', 'delete', 'admin').
     * @returns {Promise<boolean>} True if permitted, false otherwise.
     * @fires auth.permission.check
     */
    async hasPermission(resource, action) {},

    /**
     * Lists all permissions available in the system.
     * @returns {Array<object>} Permission definitions.
     * @returns {string} returns[].resource - The resource.
     * @returns {string} returns[].action - The action.
     * @returns {string} returns[].description - Human-readable description.
     */
    listPermissions() {},

    /**
     * Lists all permissions granted to the current user.
     * @returns {Array<object>} Granted permissions.
     */
    getCurrentPermissions() {},

    /**
     * Checks if the current user is an administrator.
     * @returns {boolean} True if admin, false otherwise.
     */
    isAdmin() {},

    /**
     * Grants a permission to a user (admin only).
     * @param {string} userId - The user to grant permission to.
     * @param {string} resource - The resource.
     * @param {string} action - The action.
     * @returns {Promise<void>}
     * @fires auth.permission.grant
     */
    async grantPermission(userId, resource, action) {},

    /**
     * Revokes a permission from a user (admin only).
     * @param {string} userId - The user to revoke from.
     * @param {string} resource - The resource.
     * @param {string} action - The action.
     * @returns {Promise<void>}
     * @fires auth.permission.revoke
     */
    async revokePermission(userId, resource, action) {},

    /**
     * Lists all permissions granted to a specific user (admin only).
     * @param {string} userId - The user ID.
     * @returns {Promise<Array<object>>} Permissions for the user.
     */
    async getUserPermissions(userId) {},

    // ============================================
    // User Management (Admin)
    // ============================================

    /**
     * Gets a user by ID (admin only).
     * @param {string} userId - The user ID.
     * @returns {Promise<User>} The user object.
     */
    async getUser(userId) {},

    /**
     * Lists all users in the system (admin only).
     * @param {object} [options] - Pagination and filter options.
     * @returns {Promise<Array<User>>} List of users.
     */
    async listUsers(options) {},

    /**
     * Updates a user's profile (admin or self only).
     * @param {string} userId - The user to update.
     * @param {object} patch - Fields to update (e.g., { name, email, metadata }).
     * @returns {Promise<User>} The updated user.
     * @fires auth.user.update
     */
    async updateUser(userId, patch) {},

    /**
     * Disables a user account (admin only).
     * @param {string} userId - The user to disable.
     * @returns {Promise<void>}
     * @fires auth.user.disable
     */
    async disableUser(userId) {},

    /**
     * Re-enables a disabled user account (admin only).
     * @param {string} userId - The user to enable.
     * @returns {Promise<void>}
     * @fires auth.user.enable
     */
    async enableUser(userId) {},

    /**
     * Deletes a user account (admin only).
     * @param {string} userId - The user to delete.
     * @returns {Promise<void>}
     * @fires auth.user.delete
     */
    async deleteUser(userId) {},

    /**
     * Resets a user's password (admin only, or if user provides old password).
     * @param {string} userId - The user.
     * @param {object} options - Reset options.
     * @param {string} [options.oldPassword] - Current password (if not admin).
     * @param {string} [options.newPassword] - New password.
     * @returns {Promise<void>}
     * @fires auth.password.reset
     */
    async resetPassword(userId, options) {},

    // ============================================
    // Session Management
    // ============================================

    /**
     * Gets the current session information.
     * @returns {Session} Session details.
     */
    getSession() {},

    /**
     * Invalidates the current session (like logout).
     * @returns {Promise<void>}
     * @fires auth.session.invalidate
     */
    async invalidateSession() {},

    /**
     * Lists all active sessions for the current user.
     * @returns {Promise<Array<Session>>} Active sessions.
     */
    async listSessions() {},

    /**
     * Revokes a specific session by ID.
     * @param {string} sessionId - The session to revoke.
     * @returns {Promise<void>}
     */
    async revokeSession(sessionId) {},

    // ============================================
    // Configuration
    // ============================================

    /**
     * Configures authentication settings for the system.
     * @param {object} config - Configuration options.
     * @param {string} [config.provider] - Default auth provider.
     * @param {number} [config.tokenExpireMs] - Token expiration time.
     * @param {boolean} [config.requireAuth=false] - Require authentication.
     * @param {Array<string>} [config.allowedProviders] - Whitelist of providers.
     * @returns {void}
     * @fires auth.config.set
     */
    configure(config) {},

    /**
     * Gets current authentication configuration.
     * @returns {object} Auth config.
     */
    getConfig() {},
};

/**
 * @typedef {object} User
 * @property {string} id - User ID (UUID).
 * @property {string} username - Username.
 * @property {string} email - Email address.
 * @property {string} name - Display name.
 * @property {object} metadata - Custom user metadata.
 * @property {string} provider - Authentication provider.
 * @property {boolean} isAdmin - Whether user is administrator.
 * @property {boolean} isEnabled - Whether account is enabled.
 * @property {string} createdAt - ISO 8601 timestamp.
 * @property {string} lastLogin - ISO 8601 timestamp of last login.
 */

/**
 * @typedef {object} Session
 * @property {string} id - Session ID.
 * @property {string} userId - Associated user ID.
 * @property {string} token - Session token.
 * @property {string} createdAt - ISO 8601 creation time.
 * @property {string} expiresAt - ISO 8601 expiration time.
 * @property {string} [revokedAt] - ISO 8601 revocation time (if revoked).
 * @property {object} metadata - Session metadata (e.g., user agent, IP).
 */

/**
 * @typedef {object} Permission
 * @property {string} resource - Resource name (e.g., 'graph', 'storage').
 * @property {string} action - Action name (e.g., 'read', 'write', 'delete').
 * @property {string} description - Human-readable description.
 * @property {string} [grantedAt] - When permission was granted.
 */
