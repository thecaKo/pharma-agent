#define AppName "PharmaConnector Agent"
#define AppVersion "0.1.0"

[Setup]
AppId={{A8E84D3A-7B3C-4E2A-8E67-8D0B9D0D2C61}}
AppName={#AppName}
AppVersion={#AppVersion}
AppPublisher=PharmaConnector
DefaultDirName={autopf}\PharmaConnectorAgent
DefaultGroupName=PharmaConnector Agent
OutputDir=..\out
OutputBaseFilename=PharmaConnectorAgentSetup
Compression=lzma
SolidCompression=yes
WizardStyle=modern
PrivilegesRequired=admin
[Files]
Source: "..\stage\app\*"; DestDir: "{app}"; Flags: recursesubdirs ignoreversion

[Icons]
Name: "{group}\PharmaConnector Agent"; Filename: "{app}\PharmaConnectorAgent.exe"; Parameters: "start"
Name: "{group}\Setup local"; Filename: "http://127.0.0.1:3333/setup"

[Run]
Filename: "{app}\PharmaConnectorAgent.exe"; Parameters: "install"; Flags: runhidden waituntilterminated
Filename: "{app}\PharmaConnectorAgent.exe"; Parameters: "start"; Flags: runhidden waituntilterminated
Filename: "http://127.0.0.1:3333/setup"; Flags: postinstall shellexec nowait

[Code]
var
  AgentNamePage: TInputQueryWizardPage;
  TokenPage: TInputQueryWizardPage;
  ApiPage: TInputQueryWizardPage;
  SyncPage: TInputQueryWizardPage;

function JsonEscape(Value: string): string;
begin
  Result := Value;
  StringChangeEx(Result, '\', '\\', True);
  StringChangeEx(Result, '"', '\"', True);
  StringChangeEx(Result, #13, '\r', True);
  StringChangeEx(Result, #10, '\n', True);
end;

procedure InitializeWizard;
begin
  AgentNamePage := CreateInputQueryPage(
    wpWelcome,
    'Configuracao do agente',
    'Nome do agente',
    'Defina como este computador vai aparecer no painel.'
  );
  AgentNamePage.Add('Nome do agente:', False);
  AgentNamePage.Values[0] := 'PharmaConnector Agent';

  TokenPage := CreateInputQueryPage(
    AgentNamePage.ID,
    'Credencial',
    'Token do agente',
    'Informe o token fornecido pelo painel.'
  );
  TokenPage.Add('Token:', False);

  ApiPage := CreateInputQueryPage(
    TokenPage.ID,
    'Conexao',
    'URL do painel/API',
    'Informe o endereco base usado pelo agente.'
  );
  ApiPage.Add('URL da API:', False);
  ApiPage.Values[0] := 'https://painel.exemplo.com';

  SyncPage := CreateInputQueryPage(
    ApiPage.ID,
    'Sincronizacao',
    'Intervalo de sincronizacao',
    'Defina o intervalo em segundos.'
  );
  SyncPage.Add('Segundos:', False);
  SyncPage.Values[0] := '15';
end;

procedure CurStepChanged(CurStep: TSetupStep);
var
  ConfigPath: string;
  EnvPath: string;
  ConfigContent: string;
  EnvContent: string;
begin
  if CurStep <> ssPostInstall then
    exit;

  ConfigPath := ExpandConstant('{app}\config.local.json');
  EnvPath := ExpandConstant('{app}\.env');

  ConfigContent :=
    '{' + #13#10 +
    '  "token": "' + JsonEscape(TokenPage.Values[0]) + '",' + #13#10 +
    '  "agentName": "' + JsonEscape(AgentNamePage.Values[0]) + '",' + #13#10 +
    '  "apiUrl": "' + JsonEscape(ApiPage.Values[0]) + '",' + #13#10 +
    '  "syncIntervalSeconds": ' + SyncPage.Values[0] + ',' + #13#10 +
    '  "logLevel": "info"' + #13#10 +
    '}' + #13#10;

  EnvContent :=
    'PHARMA_AGENT_TOKEN=' + TokenPage.Values[0] + #13#10 +
    'PHARMA_API_URL=' + ApiPage.Values[0] + #13#10 +
    'PHARMA_SYNC_INTERVAL_SECONDS=' + SyncPage.Values[0] + #13#10 +
    'PHARMA_AGENT_NAME=' + AgentNamePage.Values[0] + #13#10;

  SaveStringToFile(ConfigPath, ConfigContent, False);
  SaveStringToFile(EnvPath, EnvContent, False);
end;
