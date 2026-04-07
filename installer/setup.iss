;----------------------------------------------------------------------
; AlertMailComposer - Inno Setup Installer Script
;
; Builds an installer that:
;   1. Copies the pre-built Electron application to Program Files
;   2. Prompts for SQL Server connection details
;   3. Writes config.json into the app resources directory
;   4. Creates a Start Menu shortcut and optional Desktop shortcut
;----------------------------------------------------------------------

#define MyAppName "AlertMailComposer"
#define MyAppVersion "1.0.1"
#define MyAppPublisher "AlertMailService"
#define MyAppExeName "AlertMailComposer.exe"

[Setup]
AppId={{A1B2C3D4-E5F6-7890-ABCD-EF1234567890}
AppName={#MyAppName}
AppVersion={#MyAppVersion}
AppPublisher={#MyAppPublisher}
DefaultDirName={autopf}\{#MyAppName}
DefaultGroupName={#MyAppName}
OutputDir=..\dist\installer
OutputBaseFilename=AlertMailComposerSetup
Compression=lzma
SolidCompression=yes
PrivilegesRequired=lowest
ArchitecturesInstallIn64BitMode=x64compatible
SetupIconFile=..\assets\icon.ico
UninstallDisplayIcon={app}\{#MyAppExeName}
WizardStyle=modern

[Languages]
Name: "english"; MessagesFile: "compiler:Default.isl"

[Tasks]
Name: "desktopicon"; Description: "{cm:CreateDesktopIcon}"; GroupDescription: "{cm:AdditionalIcons}"; Flags: unchecked

[Files]
; Copy the entire electron-builder output directory
Source: "..\dist\win-unpacked\*"; DestDir: "{app}"; Flags: ignoreversion recursesubdirs createallsubdirs

[Icons]
Name: "{group}\{#MyAppName}"; Filename: "{app}\{#MyAppExeName}"; IconFilename: "{app}\resources\app\assets\icon.ico"
Name: "{group}\Uninstall {#MyAppName}"; Filename: "{uninstallexe}"
Name: "{autodesktop}\{#MyAppName}"; Filename: "{app}\{#MyAppExeName}"; IconFilename: "{app}\resources\app\assets\icon.ico"; Tasks: desktopicon

[Run]
Filename: "{app}\{#MyAppExeName}"; Description: "Launch AlertMailComposer"; Flags: nowait postinstall skipifsilent

[Code]
var
  DBPage: TInputQueryWizardPage;
  DBCredPage: TInputQueryWizardPage;
  DBOptionsPage: TWizardPage;
  EncryptCheckbox: TNewCheckBox;
  TrustCertCheckbox: TNewCheckBox;

procedure InitializeWizard;
begin
  { --- Database Server and Name Page --- }
  DBPage := CreateInputQueryPage(wpSelectDir,
    'Database Connection', 'SQL Server connection settings',
    'Enter the SQL Server instance and database name used by the AlertMailService.' + #13#10 +
    'This is the same database used by MailAlertServer and MailRequestServer.');
  DBPage.Add('SQL Server:', False);
  DBPage.Add('Database:', False);
  DBPage.Values[0] := 'localhost';
  DBPage.Values[1] := 'MailAlertDB';

  { --- Database Credentials Page --- }
  DBCredPage := CreateInputQueryPage(DBPage.ID,
    'Database Credentials', 'SQL Server login for AlertMailComposer',
    'Enter the SQL Server username and password that AlertMailComposer will use to connect.' + #13#10 +
    'This should be the same application user configured during AlertMailService installation.');
  DBCredPage.Add('Username:', False);
  DBCredPage.Add('Password:', True);
  DBCredPage.Values[0] := 'mailalert_user';

  { --- Connection Options Page --- }
  DBOptionsPage := CreateCustomPage(DBCredPage.ID,
    'Connection Options', 'Configure encryption and certificate settings for the SQL Server connection.');

  EncryptCheckbox := TNewCheckBox.Create(DBOptionsPage);
  EncryptCheckbox.Parent := DBOptionsPage.Surface;
  EncryptCheckbox.Left := 0;
  EncryptCheckbox.Top := 16;
  EncryptCheckbox.Width := DBOptionsPage.SurfaceWidth;
  EncryptCheckbox.Caption := 'Encrypt Connection';
  EncryptCheckbox.Checked := False;

  TrustCertCheckbox := TNewCheckBox.Create(DBOptionsPage);
  TrustCertCheckbox.Parent := DBOptionsPage.Surface;
  TrustCertCheckbox.Left := 0;
  TrustCertCheckbox.Top := EncryptCheckbox.Top + EncryptCheckbox.Height + 12;
  TrustCertCheckbox.Width := DBOptionsPage.SurfaceWidth;
  TrustCertCheckbox.Caption := 'Trust Server Certificate';
  TrustCertCheckbox.Checked := True;
end;

function NextButtonClick(CurPageID: Integer): Boolean;
begin
  Result := True;

  { Validate Database page }
  if CurPageID = DBPage.ID then
  begin
    if Trim(DBPage.Values[0]) = '' then
    begin
      MsgBox('SQL Server address is required.', mbError, MB_OK);
      Result := False;
      Exit;
    end;
    if Trim(DBPage.Values[1]) = '' then
    begin
      MsgBox('Database name is required.', mbError, MB_OK);
      Result := False;
      Exit;
    end;
  end;

  { Validate Credentials page }
  if CurPageID = DBCredPage.ID then
  begin
    if Trim(DBCredPage.Values[0]) = '' then
    begin
      MsgBox('Username is required.', mbError, MB_OK);
      Result := False;
      Exit;
    end;
  end;
end;

function EscapeJsonString(const S: String): String;
var
  I: Integer;
begin
  Result := '';
  for I := 1 to Length(S) do
  begin
    case S[I] of
      '"':  Result := Result + '\"';
      '\':  Result := Result + '\\';
      Chr(8):   Result := Result + '\b';
      Chr(9):   Result := Result + '\t';
      Chr(10):  Result := Result + '\n';
      Chr(13):  Result := Result + '\r';
    else
      Result := Result + S[I];
    end;
  end;
end;

procedure WriteConfigFile;
var
  ConfigPath: String;
  Lines: TArrayOfString;
  EncryptValue: String;
  TrustCertValue: String;
begin
  { Write config.json to the resources directory where the app reads it }
  ConfigPath := ExpandConstant('{app}\resources\config.json');

  if EncryptCheckbox.Checked then
    EncryptValue := 'true'
  else
    EncryptValue := 'false';

  if TrustCertCheckbox.Checked then
    TrustCertValue := 'true'
  else
    TrustCertValue := 'false';

  SetArrayLength(Lines, 12);
  Lines[0]  := '{';
  Lines[1]  := '  "database": {';
  Lines[2]  := '    "server": "' + EscapeJsonString(Trim(DBPage.Values[0])) + '",';
  Lines[3]  := '    "database": "' + EscapeJsonString(Trim(DBPage.Values[1])) + '",';
  Lines[4]  := '    "username": "' + EscapeJsonString(Trim(DBCredPage.Values[0])) + '",';
  Lines[5]  := '    "password": "' + EscapeJsonString(DBCredPage.Values[1]) + '",';
  Lines[6]  := '    "encrypt": ' + EncryptValue + ',';
  Lines[7]  := '    "trustServerCertificate": ' + TrustCertValue;
  Lines[8]  := '  },';
  Lines[9]  := '  "theme": "dark"';
  Lines[10] := '}';
  Lines[11] := '';

  if not ForceDirectories(ExtractFilePath(ConfigPath)) then
    MsgBox('Warning: Could not create resources directory.', mbError, MB_OK)
  else if not SaveStringsToFile(ConfigPath, Lines, False) then
    MsgBox('Warning: Could not write config.json. You can configure the database connection from within the application.', mbError, MB_OK);
end;

procedure CurStepChanged(CurStep: TSetupStep);
begin
  if CurStep = ssPostInstall then
  begin
    WriteConfigFile;
  end;
end;
