## ADDED Requirements

### Requirement: Admin can query email sending history

The system SHALL provide an API endpoint `GET /api/v1/admin/email/history` that returns a paginated list of email sending records from the `email_logs` table. This endpoint SHALL require `requireAdmin` middleware.

#### Scenario: Successful email history retrieval

- **WHEN** an admin requests `GET /api/v1/admin/email/history`
- **THEN** the system returns a paginated list of email records with fields: id, userId, recipientEmail, emailType, subject, status (sent/failed/pending), sentAt, createdAt

#### Scenario: Filter by email type

- **WHEN** an admin requests `GET /api/v1/admin/email/history?emailType=verification`
- **THEN** the system returns only email records with the specified email type

#### Scenario: Filter by status

- **WHEN** an admin requests `GET /api/v1/admin/email/history?status=failed`
- **THEN** the system returns only email records with failed status

#### Scenario: Filter by recipient

- **WHEN** an admin requests `GET /api/v1/admin/email/history?recipient=user@example.com`
- **THEN** the system returns only email records sent to the specified email address

#### Scenario: Filter by date range

- **WHEN** an admin requests `GET /api/v1/admin/email/history?startDate=2024-01-01&endDate=2024-01-31`
- **THEN** the system returns only email records sent within the specified date range

#### Scenario: Filter by user ID

- **WHEN** an admin requests `GET /api/v1/admin/email/history?userId=123`
- **THEN** the system returns only email records associated with the specified user

#### Scenario: Pagination support

- **WHEN** an admin requests `GET /api/v1/admin/email/history?page=2&limit=50`
- **THEN** the system returns the second page with up to 50 records, including pagination metadata

#### Scenario: Sort by sent date

- **WHEN** an admin requests `GET /api/v1/admin/email/history?sortBy=sentAt&sortOrder=desc`
- **THEN** the system returns email records sorted by sent date in descending order (newest first)

#### Scenario: Unauthorized access denied

- **WHEN** a non-admin user requests `GET /api/v1/admin/email/history`
- **THEN** the system returns 403 Forbidden error

---

### Requirement: Admin can view email sending statistics summary

The system SHALL provide summary statistics within the email history response metadata to help diagnose email delivery issues.

#### Scenario: Statistics included in response

- **WHEN** an admin requests email history with any filters
- **THEN** the response metadata includes: totalRecords, sentCount, failedCount, pendingCount, successRate (percentage)

#### Scenario: Statistics reflect applied filters

- **WHEN** an admin requests `GET /api/v1/admin/email/history?emailType=verification`
- **THEN** the statistics in metadata reflect only verification emails, not all emails
