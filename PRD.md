# Product Requirements Document: AlertMailComposer

## 1. Overview

**Product Name:** AlertMailComposer
**Version:** 1.0.0
**Platform:** Windows (Desktop)
**Technology:** Electron
**Target Database:** SQL Server (MailAlertDB)

AlertMailComposer is a standalone Electron-based desktop application for managing the AlertMailService system. It provides a graphical interface for creating, editing, and deleting alert email definitions stored in the `MailAlerts` SQL Server table, editing SMTP/mail server configuration in the `MailConfig` table, viewing the `MailRequests` log, and configuring the application's database connection settings.

## 2. Goals

- Provide an intuitive UI for managing alert email definitions without direct SQL access.
- Allow configuration of SMTP mail server settings through the application.
- Provide visibility into the MailRequestServer email log with on-demand refresh.
- Support test execution and preview of trigger and message SQL queries.
- Validate user input with syntax checking to prevent invalid entries.
- Store connection settings in a file so the AlertMailServiceInstaller can pre-configure them during installation.
- Offer selectable light and dark themes, with dark mode as the default.

## 3. System Context

AlertMailComposer interacts with the same SQL Server database used by MailAlertServer and MailRequestServer. The database contains three tables:

### 3.1 MailAlerts Table (Alert Definitions)

| Column | Type | Description |
|--------|------|-------------|
| ID | int (identity) | Primary key |
| Enabled | bit (default 1) | Enable/disable the alert |
| Query | varchar(3000) | Trigger SQL query; must return a `SendMail` column (1 or 0) |
| Subject | varchar(100) | Email subject line |
| Message | varchar(3000) | Email body template; supports `%%ColumnName%%` and `%%TABLE:col1,col2%%` / `%%TABLE%%` tokens |
| Recipients | varchar(1000) | Semicolon-separated TO addresses |
| RecipientsCC | varchar(1000) | Semicolon-separated CC addresses |
| RecipientsBCC | varchar(1000) | Semicolon-separated BCC addresses |
| LastTrue | bit | Tracks whether alert condition was true on last check |
| LastTrueTime | datetime | Timestamp when condition last evaluated true |
| LastCheckTime | datetime | Timestamp of last check |
| MinutesResend | int | Resend interval in minutes (0 = send once) |
| MessageQuery | varchar(3000) | Optional query returning data for message template substitution |
| LastStatus | varchar(300) | Status of last execution |

### 3.2 MailConfig Table (SMTP Configuration)

| Column | Type | Description |
|--------|------|-------------|
| ID | int (identity) | Primary key |
| ServerURL | varchar(100) | SMTP server hostname |
| ServerPort | int | SMTP port |
| Username | varchar(50) | SMTP username |
| Password | varchar(150) | SMTP password |
| SenderName | varchar(50) | Display name for From field |
| SenderAddress | varchar(50) | From email address |
| ServiceCommand | varchar(50) | Runtime command for MailRequestServer |

### 3.3 MailRequests Table (Email Log/Queue)

| Column | Type | Description |
|--------|------|-------------|
| ID | int (identity) | Primary key |
| Subject | varchar(100) | Email subject |
| Message | varchar(max) | Email body |
| RecipientTo | varchar(1000) | TO addresses |
| RecipientCC | varchar(1000) | CC addresses |
| RecipientBCC | varchar(1000) | BCC addresses |
| Sent | bit (default 0) | 0 = pending, 1 = sent/attempted |
| CreatedTime | datetime | When request was created |
| SentTime | datetime | When email was sent |
| LastStatus | varchar(500) | Delivery status |

## 4. Functional Requirements

### 4.1 Database Connection Settings

- **FR-4.1.1:** The application shall provide a settings view for configuring the SQL Server connection: Server, Database, Username, Password, and TrustServerCertificate.
- **FR-4.1.2:** Connection settings shall be saved to a JSON configuration file (`config.json`) in the application directory.
- **FR-4.1.3:** The configuration file format shall be designed so the AlertMailServiceInstaller can write it during installation.
- **FR-4.1.4:** The application shall provide a "Test Connection" button that validates connectivity to the configured SQL Server and database.
- **FR-4.1.5:** On startup, the application shall load settings from `config.json` and attempt to connect. If the connection fails or settings are missing, the settings view shall be presented.

### 4.2 Alert Mail Management (CRUD)

- **FR-4.2.1:** The application shall display a list/table of all alert email definitions from the `MailAlerts` table, showing key columns: ID, Enabled, Subject, LastCheckTime, LastStatus.
- **FR-4.2.2:** The user shall be able to create a new alert email definition by filling in a form with all editable fields: Enabled, Query, Subject, Message, Recipients, RecipientsCC, RecipientsBCC, MinutesResend, and MessageQuery.
- **FR-4.2.3:** The user shall be able to select an existing alert and edit any of its editable fields.
- **FR-4.2.4:** The user shall be able to delete an alert email definition with a confirmation prompt.
- **FR-4.2.5:** The user shall be able to toggle the Enabled flag directly from the alert list.
- **FR-4.2.6:** The alert list shall be refreshable on demand.
- **FR-4.2.7:** Read-only status fields (LastTrue, LastTrueTime, LastCheckTime, LastStatus) shall be displayed but not editable.

### 4.3 Query Test Execution and Preview

- **FR-4.3.1:** The alert edit form shall provide a "Test Trigger Query" button that executes the trigger SQL query (`Query` field) against the database and displays the result set, highlighting whether the `SendMail` column returned 1 or 0.
- **FR-4.3.2:** The alert edit form shall provide a "Test Message Query" button that executes the message SQL query (`MessageQuery` field) against the database and displays the result set in a tabular format.
- **FR-4.3.3:** A "Preview Message" function shall execute the MessageQuery, apply the template substitution tokens (`%%ColumnName%%` and `%%TABLE%%`/`%%TABLE:col1,col2%%`) to the Message field, and display the rendered email body preview.
- **FR-4.3.4:** Query test execution shall use a read-only transaction (or equivalent safeguard) to prevent unintended data modifications.
- **FR-4.3.5:** Query execution errors shall be displayed clearly to the user with the error message from SQL Server.

### 4.4 Input Validation and Syntax Checking

- **FR-4.4.1:** The Query field shall be validated to check for basic SQL syntax (e.g., must contain a SELECT statement, should not contain INSERT/UPDATE/DELETE/DROP/ALTER/TRUNCATE/EXEC statements).
- **FR-4.4.2:** The MessageQuery field shall be validated with the same rules as the Query field.
- **FR-4.4.3:** The Subject field shall be validated for maximum length (100 characters) and non-empty when saving.
- **FR-4.4.4:** The Recipients field shall be validated to ensure it contains at least one properly formatted email address. RecipientsCC and RecipientsBCC shall validate format if non-empty.
- **FR-4.4.5:** Email addresses shall be validated using standard email format rules.
- **FR-4.4.6:** The Message field shall be validated for maximum length (3000 characters).
- **FR-4.4.7:** The Query and MessageQuery fields shall be validated for maximum length (3000 characters).
- **FR-4.4.8:** MinutesResend shall be validated as a non-negative integer.
- **FR-4.4.9:** Validation errors shall be displayed inline next to the relevant field, alerting the user before save is attempted.

### 4.5 Mail Server Configuration

- **FR-4.5.1:** The application shall provide a dedicated view for editing the `MailConfig` table record.
- **FR-4.5.2:** Editable fields: ServerURL, ServerPort, Username, Password, SenderName, SenderAddress.
- **FR-4.5.3:** The ServiceCommand field shall be displayed as a dropdown with options: "" (Normal), "Mark All Sent", "Pause", "Stop Service".
- **FR-4.5.4:** ServerPort shall be validated as a positive integer.
- **FR-4.5.5:** ServerURL shall be validated as non-empty.
- **FR-4.5.6:** SenderAddress shall be validated as a properly formatted email address.
- **FR-4.5.7:** The Password field shall be masked by default with a toggle to reveal.

### 4.6 Mail Request Log Viewer

- **FR-4.6.1:** The application shall provide a view displaying records from the `MailRequests` table, showing: ID, Subject, RecipientTo, Sent, CreatedTime, SentTime, LastStatus.
- **FR-4.6.2:** The log shall be refreshable on demand via a refresh button.
- **FR-4.6.3:** The user shall be able to select a log entry to view full details including the Message body.
- **FR-4.6.4:** The log view shall support sorting by column.
- **FR-4.6.5:** The log view shall support filtering by Sent status (All, Pending, Sent/Attempted).

### 4.7 Theme Support

- **FR-4.7.1:** The application shall support Light and Dark display themes.
- **FR-4.7.2:** Dark mode shall be the default theme on first launch.
- **FR-4.7.3:** The user shall be able to switch themes from the application UI (e.g., settings or toolbar toggle).
- **FR-4.7.4:** The selected theme preference shall persist across sessions (stored in `config.json`).

## 5. Non-Functional Requirements

- **NFR-5.1:** The application shall be built as a standalone Electron desktop application targeting Windows.
- **NFR-5.2:** The application shall use parameterized SQL queries to prevent SQL injection.
- **NFR-5.3:** The application shall handle database connection failures gracefully with clear error messages.
- **NFR-5.4:** The configuration file (`config.json`) shall be human-readable and writable by the AlertMailServiceInstaller.
- **NFR-5.5:** The application shall not require administrative privileges to run (database connectivity only).
- **NFR-5.6:** The UI shall be responsive and not block during database operations (async operations).

## 6. User Interface Structure

The application shall use a navigation layout with the following primary views:

1. **Alert Emails** (default view) - List and edit alert email definitions.
2. **Mail Configuration** - Edit SMTP server settings.
3. **Mail Log** - View MailRequests log entries.
4. **Settings** - Configure database connection and theme.

Navigation shall be accessible via a sidebar or top navigation bar.

## 7. Configuration File Format

The `config.json` file shall use the following structure:

```json
{
  "database": {
    "server": "localhost",
    "database": "MailAlertDB",
    "username": "mailalert_user",
    "password": "password",
    "trustServerCertificate": true
  },
  "theme": "dark"
}
```

This format allows the AlertMailServiceInstaller to generate the file with the database connection details during installation. The application reads this file on startup and writes to it when settings are changed.

## 8. Installer Integration

- **INT-8.1:** The AlertMailComposer build output shall be structured for inclusion in the AlertMailServiceInstaller.
- **INT-8.2:** The AlertMailServiceInstaller shall generate the `config.json` file with the database connection settings provided during installation.
- **INT-8.3:** No changes shall be made to the existing MailAlertServer, MailRequestServer, or AlertMailServiceInstaller codebases at this time.

## 9. Technology Stack

| Component | Technology |
|-----------|-----------|
| Desktop Framework | Electron |
| Frontend | HTML/CSS/JavaScript (or TypeScript) |
| Database Driver | mssql (npm package - tedious driver) |
| Build/Package | electron-builder |
| Theme | CSS variables for light/dark mode |

## 10. Out of Scope

- Modifications to MailAlertServer, MailRequestServer, or AlertMailServiceInstaller.
- Email sending from this application (that is handled by MailRequestServer).
- User authentication/authorization within the application.
- Remote/web-based access; this is a local desktop application only.
- Database schema creation or migration (handled by the installer).
