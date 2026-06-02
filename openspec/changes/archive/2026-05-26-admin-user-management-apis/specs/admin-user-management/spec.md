## ADDED Requirements

### Requirement: Admin can list all users with management fields

The system SHALL provide an API endpoint `GET /api/v1/admin/users` that returns a paginated list of users with complete management fields including email, email_verified, is_active, roles, and permissions. This endpoint SHALL require `requireAdmin` middleware.

#### Scenario: Successful user list retrieval

- **WHEN** an authenticated admin requests `GET /api/v1/admin/users`
- **THEN** the system returns a paginated list of users with fields: id, externalId, name, email, emailVerified, emailVerifiedAt, isActive, roles[], permissions[], createdAt, lastLoginAt

#### Scenario: Search users by name or email

- **WHEN** an admin requests `GET /api/v1/admin/users?search=john`
- **THEN** the system returns users whose name OR email contains "john" (case-insensitive)

#### Scenario: Filter users by role

- **WHEN** an admin requests `GET /api/v1/admin/users?roleId=2`
- **THEN** the system returns only users with the specified role ID

#### Scenario: Filter users by active status

- **WHEN** an admin requests `GET /api/v1/admin/users?isActive=false`
- **THEN** the system returns only inactive (disabled) users

#### Scenario: Filter users by email verification status

- **WHEN** an admin requests `GET /api/v1/admin/users?isVerified=true`
- **THEN** the system returns only users with verified email addresses

#### Scenario: Pagination support

- **WHEN** an admin requests `GET /api/v1/admin/users?page=2&limit=20`
- **THEN** the system returns the second page with up to 20 users, including pagination metadata (totalCount, totalPages, currentPage, hasNext, hasPrev)

#### Scenario: Unauthorized access denied

- **WHEN** a non-admin user requests `GET /api/v1/admin/users`
- **THEN** the system returns 403 Forbidden error

---

### Requirement: Admin can view user details with full management data

The system SHALL provide an API endpoint `GET /api/v1/admin/users/{userId}` that returns complete user details including sensitive management fields, recent login history, and activity statistics. This endpoint SHALL require `requireAdmin` middleware.

#### Scenario: Successful user detail retrieval

- **WHEN** an admin requests `GET /api/v1/admin/users/123`
- **THEN** the system returns complete user data including: basic info, email, emailVerified, emailVerifiedAt, isActive, roles[], permissions[], loginHistory (last 10), activityStats

#### Scenario: User not found

- **WHEN** an admin requests `GET /api/v1/admin/users/99999` for a non-existent user
- **THEN** the system returns 404 Not Found error with message "User not found"

#### Scenario: Unauthorized access denied

- **WHEN** a non-admin user requests `GET /api/v1/admin/users/123`
- **THEN** the system returns 403 Forbidden error

---

### Requirement: Admin can view any user's login history

The system SHALL provide an API endpoint `GET /api/v1/admin/users/{userId}/login-history` that returns the login history for any specified user. This endpoint SHALL require `requireAdmin` middleware.

#### Scenario: Successful login history retrieval

- **WHEN** an admin requests `GET /api/v1/admin/users/123/login-history`
- **THEN** the system returns a paginated list of login records with fields: loginAt, ipAddress, deviceType, os, browser, userAgent

#### Scenario: Filter login history by date range

- **WHEN** an admin requests `GET /api/v1/admin/users/123/login-history?startDate=2024-01-01&endDate=2024-01-31`
- **THEN** the system returns only login records within the specified date range

#### Scenario: User not found

- **WHEN** an admin requests login history for a non-existent user
- **THEN** the system returns 404 Not Found error

---

### Requirement: Admin can view any user's activity statistics

The system SHALL provide an API endpoint `GET /api/v1/admin/users/{userId}/activity-stats` that returns activity statistics for any specified user. This endpoint SHALL require `requireAdmin` middleware.

#### Scenario: Successful activity stats retrieval

- **WHEN** an admin requests `GET /api/v1/admin/users/123/activity-stats`
- **THEN** the system returns activity statistics including: lastLoginAt, lastActiveAt, loginCount, profileViews, lastDeviceType, lastOs, lastBrowser

#### Scenario: User not found

- **WHEN** an admin requests activity stats for a non-existent user
- **THEN** the system returns 404 Not Found error

---

### Requirement: SuperAdmin can toggle user active status

The system SHALL provide an API endpoint `PUT /api/v1/admin/users/{userId}/status` that allows toggling a user's active status (enable/disable). This endpoint SHALL require `requireSuperAdmin` middleware.

#### Scenario: Successfully disable a user

- **WHEN** a super admin requests `PUT /api/v1/admin/users/123/status` with body `{ "isActive": false }`
- **THEN** the system sets the user's is_active to false and returns the updated user data

#### Scenario: Successfully enable a user

- **WHEN** a super admin requests `PUT /api/v1/admin/users/123/status` with body `{ "isActive": true }`
- **THEN** the system sets the user's is_active to true and returns the updated user data

#### Scenario: Cannot disable own account

- **WHEN** a super admin attempts to disable their own user account
- **THEN** the system returns 400 Bad Request with message "Cannot disable your own account"

#### Scenario: User not found

- **WHEN** a super admin requests to toggle status for a non-existent user
- **THEN** the system returns 404 Not Found error

#### Scenario: Regular admin access denied

- **WHEN** a regular admin (not super admin) requests `PUT /api/v1/admin/users/123/status`
- **THEN** the system returns 403 Forbidden error
