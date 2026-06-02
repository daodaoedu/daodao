## ADDED Requirements

### Requirement: Admin can view platform-wide practice statistics

The system SHALL provide an API endpoint `GET /api/v1/admin/practices/stats` that returns aggregated statistics about practices (learning activities) across the entire platform. This endpoint SHALL require `requireAdmin` middleware.

#### Scenario: Successful practice stats retrieval

- **WHEN** an admin requests `GET /api/v1/admin/practices/stats`
- **THEN** the system returns statistics including: totalPractices, activePractices, completedPractices, averageCompletionRate, practicesByCategory, practicesByStatus

#### Scenario: Filter practice stats by date range

- **WHEN** an admin requests `GET /api/v1/admin/practices/stats?startDate=2024-01-01&endDate=2024-01-31`
- **THEN** the system returns practice statistics for the specified date range only

#### Scenario: Unauthorized access denied

- **WHEN** a non-admin user requests `GET /api/v1/admin/practices/stats`
- **THEN** the system returns 403 Forbidden error

---

### Requirement: Admin can view active users trend over time

The system SHALL provide an API endpoint `GET /api/v1/admin/user-stats/active-users/trend` that returns time-series data for DAU (Daily Active Users), WAU (Weekly Active Users), and MAU (Monthly Active Users) over a specified period. This endpoint SHALL require `requireAdmin` middleware.

#### Scenario: Successful trend data retrieval with default range

- **WHEN** an admin requests `GET /api/v1/admin/user-stats/active-users/trend`
- **THEN** the system returns daily time-series data for the last 30 days, with each data point containing: date, dau, wau, mau

#### Scenario: Custom date range for trend data

- **WHEN** an admin requests `GET /api/v1/admin/user-stats/active-users/trend?days=7`
- **THEN** the system returns daily time-series data for the last 7 days

#### Scenario: Maximum range limit enforced

- **WHEN** an admin requests `GET /api/v1/admin/user-stats/active-users/trend?days=365`
- **THEN** the system returns data for maximum 90 days with a warning in metadata

#### Scenario: Response format for charting

- **WHEN** an admin requests trend data
- **THEN** the response includes an array of data points sorted chronologically: `[{ date: "2024-01-01", dau: 156, wau: 534, mau: 892 }, ...]`

#### Scenario: Empty data for new platform

- **WHEN** an admin requests trend data but no login history exists
- **THEN** the system returns an empty array with metadata indicating no data available

#### Scenario: Unauthorized access denied

- **WHEN** a non-admin user requests `GET /api/v1/admin/user-stats/active-users/trend`
- **THEN** the system returns 403 Forbidden error
