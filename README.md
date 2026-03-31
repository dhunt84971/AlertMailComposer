# AlertMailComposer

A Windows desktop application for managing the AlertMailService system. Provides a graphical interface for creating, editing, and deleting alert email definitions, configuring SMTP mail server settings, and viewing the mail request log.

<img width="1142" height="602" alt="image" src="https://github.com/user-attachments/assets/cefd231e-a99c-4db6-a709-0ad2a2121803" />

<img width="1143" height="1079" alt="image" src="https://github.com/user-attachments/assets/406c1d84-990b-43f0-bdc6-cf14bfdf5cd3" />


## Features

- **Alert Email Management** -- Full CRUD for alert definitions in the `MailAlerts` SQL Server table. Includes SQL query editors with syntax highlighting (CodeMirror), test execution of trigger and message queries, and rendered message preview with `%%ColumnName%%` and `%%TABLE%%` token substitution.
- **Mail Server Configuration** -- Edit SMTP settings in the `MailConfig` table (server, port, credentials, sender info, service command).
- **Mail Request Log** -- View, sort, and filter email records from the `MailRequests` table with a detail view for each entry.
- **Settings** -- Configure the SQL Server connection with a test button. Settings persist in `config.json`.
- **Themes** -- Dark (default) and Light modes.

## Prerequisites

### For Development

| Tool | Version | Purpose |
|------|---------|---------|
| [Node.js](https://nodejs.org/) | 18 or later | Runtime and npm package manager |
| [Git](https://git-scm.com/) | any | Source control |

### For Building the Installer

| Tool | Version | Purpose |
|------|---------|---------|
| [Node.js](https://nodejs.org/) | 18 or later | Runtime and npm package manager |
| [Inno Setup 6](https://jrsoftware.org/isdl.php) | 6.x | Compiles the Windows installer |

> **Note:** Building and packaging must be performed on **Windows**. The Electron app targets `win-x64` only.

### For Running the Application

| Requirement | Details |
|-------------|---------|
| Windows | 10 or later (64-bit) |
| SQL Server | An accessible SQL Server instance with the `MailAlertDB` database (created by the AlertMailServiceInstaller) |

## Project Structure

```
AlertMailComposer/
├── src/
│   ├── main/                  # Electron main process
│   │   ├── main.js            # App entry point, window management
│   │   ├── preload.js         # IPC bridge (contextBridge)
│   │   ├── config.js          # config.json read/write
│   │   └── db/
│   │       ├── connection.js  # SQL Server connection pool
│   │       ├── alertEmails.js # MailAlerts CRUD + query execution
│   │       ├── mailConfig.js  # MailConfig CRUD
│   │       └── mailLog.js     # MailRequests read
│   ├── renderer/              # Electron renderer process (UI)
│   │   ├── index.html         # App shell with navigation
│   │   ├── app.js             # Navigation, theme, toast, modal
│   │   ├── codemirror-setup.js       # CodeMirror ES module source
│   │   ├── codemirror-bundle.js      # Bundled by esbuild (generated)
│   │   ├── init-editors.js           # CodeMirror editor initialization
│   │   ├── styles/
│   │   │   └── theme.css      # CSS custom properties for dark/light
│   │   └── views/
│   │       ├── AlertEmails/   # Alert list (AG Grid) + edit form
│   │       ├── MailConfig/    # SMTP configuration form
│   │       ├── MailLog/       # Mail log grid + detail modal
│   │       └── Settings/      # DB connection + theme settings
│   └── shared/                # (reserved for shared types)
├── test/
│   ├── config.test.js         # Config module tests
│   └── validation.test.js     # Email, SQL, escapeHtml tests
├── installer/
│   └── setup.iss              # Inno Setup installer script
├── build.bat                  # One-step build script
├── package.json               # npm config + electron-builder config
├── vitest.config.js           # Test runner configuration
├── config.json                # Local dev connection settings (git-ignored)
└── README.md
```

## Development Setup

### 1. Clone and install

```bash
git clone <repository-url> AlertMailComposer
cd AlertMailComposer
npm install
```

### 2. Configure the database connection

Create a `config.json` in the project root (this file is git-ignored):

```json
{
  "database": {
    "server": "localhost",
    "database": "MailAlertDB",
    "username": "mailalert_user",
    "password": "your_password",
    "trustServerCertificate": true
  },
  "theme": "dark"
}
```

Or skip this step and configure the connection from the Settings view inside the app.

### 3. Run in development mode

```bash
npm start
```

This bundles the CodeMirror editor and launches the Electron app.

### 4. Run tests

```bash
npm test
```

## Building the Application

### Option A: One-step build (recommended)

Run the build script from a Windows command prompt:

```cmd
build.bat
```

This performs all steps in sequence:

1. `npm install` -- installs dependencies
2. `npx vitest run` -- runs the test suite (build aborts on failure)
3. `npx esbuild ...` -- bundles the CodeMirror editor
4. `npx electron-builder --win --dir` -- packages the Electron app into `dist\win-unpacked\`
5. `iscc installer\setup.iss` -- compiles the Inno Setup installer

**Output:**

| Artifact | Location |
|----------|----------|
| Installer | `dist\installer\AlertMailComposerSetup.exe` |
| Unpacked app | `dist\win-unpacked\` |

### Option B: Step-by-step manual build

If you prefer to run each step individually:

```cmd
REM 1. Install dependencies
npm install

REM 2. Run tests
npm test

REM 3. Bundle CodeMirror
npx esbuild src/renderer/codemirror-setup.js --bundle --outfile=src/renderer/codemirror-bundle.js --format=iife --platform=browser

REM 4. Package the Electron app
npx electron-builder --win --dir

REM 5. Verify the output exists
dir dist\win-unpacked\AlertMailComposer.exe

REM 6. Compile the Inno Setup installer
iscc installer\setup.iss
```

> If `iscc` is not on your PATH, use the full path to the Inno Setup compiler, e.g.:
> ```cmd
> "C:\Program Files (x86)\Inno Setup 6\ISCC.exe" installer\setup.iss
> ```

### Option C: Run without installer

You can run the packaged application directly without creating an installer:

```cmd
dist\win-unpacked\AlertMailComposer.exe
```

The app will open to the Settings view where you can enter the database connection details.

## Installing the Application

### From the installer

1. Run `AlertMailComposerSetup.exe`
2. Choose the installation directory
3. Enter the SQL Server connection details when prompted:
   - **SQL Server** -- hostname or IP address of the SQL Server instance (e.g., `localhost`, `192.168.1.50`, `SERVERNAME\INSTANCE`)
   - **Database** -- name of the AlertMailService database (default: `MailAlertDB`)
   - **Username** -- SQL Server login for the application (default: `mailalert_user`)
   - **Password** -- password for the SQL Server login
4. Complete the installation
5. Launch AlertMailComposer from the Start Menu or Desktop shortcut

The installer writes these settings to `config.json` in the application's `resources` directory. The app reads this file on first launch and copies it to the user data directory. You can change these settings at any time from the Settings view inside the application.

### Integration with AlertMailServiceInstaller

AlertMailComposer connects to the same `MailAlertDB` database created by the AlertMailServiceInstaller. Use the same SQL Server address, database name, and application credentials (`mailalert_user`) that were configured during the AlertMailService installation.

## Application Icon

To set a custom application icon, place an `icon.ico` file in the `assets/` directory before building. The icon should be a multi-resolution `.ico` file (256x256, 128x128, 64x64, 48x48, 32x32, 16x16).

Then add these lines back to `package.json` under `build.win`:
```json
"icon": "assets/icon.ico"
```

And in `installer/setup.iss`, add this line in the `[Setup]` section:
```ini
SetupIconFile=..\assets\icon.ico
```

## Technology Stack

| Component | Technology |
|-----------|-----------|
| Desktop framework | Electron 41.x |
| Database driver | mssql 12.x (tedious -- pure JavaScript) |
| Data grid | AG Grid Community |
| SQL editor | CodeMirror 6 |
| Build/package | electron-builder + esbuild |
| Installer | Inno Setup 6 |
| Testing | Vitest |
