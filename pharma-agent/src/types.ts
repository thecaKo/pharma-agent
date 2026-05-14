export type DbDriver = "mysql" | "firebird" | "postgresql" | "sqlserver" | "sqlite" | "oracle" | "interbase";

export type DbConfig = {
  driver: DbDriver;
  host: string;
  port: number;
  database: string;
  user: string;
  password: string;
};

export type ProductMapping = {
  table: string;
  idField?: string;
  nameField: string;
  priceField?: string;
  stockField?: string;
  imageField?: string;
};

export type ImportConfig = {
  db: DbConfig;
  mapping: ProductMapping;
};

export type NormalizedProduct = {
  externalId?: string;
  name: string;
  price?: number;
  stock?: number;
  image?: string;
};

export type ImportResult = {
  totalRows: number;
  successRows: number;
  failedRows: number;
  logs: string[];
  products: NormalizedProduct[];
};

export type ProductSyncResult = {
  totalRows: number;
  products?: NormalizedProduct[];
  created: NormalizedProduct[];
  updated: NormalizedProduct[];
  removed: string[];
  unchanged: number;
  logs: string[];
};

export type DatabaseFile = {
  name: string;
  path: string;
  extension: string;
  databaseType: string;
  size?: number;
  modifiedAt?: string;
};

export type DatabaseFileSearchPayload = {
  directory?: string;
  directories?: string[];
  maxDepth?: number;
  maxResults?: number;
  timeoutMs?: number;
};

export type DatabaseFileValidationResult = {
  exists: boolean;
  readable: boolean;
  name: string;
  path: string;
  extension: string;
  databaseType: string;
  size?: number;
  modifiedAt?: string;
};

export type FirebirdFile = DatabaseFile;
export type FirebirdFileSearchPayload = DatabaseFileSearchPayload;
export type FirebirdFileValidationResult = DatabaseFileValidationResult;

export type AgentCommand =
  | { id: string; type: "db:test"; payload: DbConfig }
  | { id: string; type: "db:schema"; payload: DbConfig }
  | { id: string; type: "db:columns"; payload: DbConfig & { table: string } }
  | { id: string; type: "database:auto-detect"; payload?: { maxDepth?: number; maxResults?: number } }
  | { id: string; type: "database:deep-scan"; payload?: { maxDepth?: number; maxResults?: number; timeoutMs?: number } }
  | { id: string; type: "database:files"; payload: DatabaseFileSearchPayload }
  | { id: string; type: "database:validate-file"; payload: { path: string } }
  | { id: string; type: "firebird:auto-detect"; payload?: { maxDepth?: number; maxResults?: number } }
  | { id: string; type: "firebird:deep-scan"; payload?: { maxDepth?: number; maxResults?: number; timeoutMs?: number } }
  | { id: string; type: "firebird:files"; payload: FirebirdFileSearchPayload }
  | { id: string; type: "firebird:validate-file"; payload: { path: string } }
  | { id: string; type: "products:import"; payload: ImportConfig }
  | { id: string; type: "products:sync"; payload: ImportConfig };

export type AgentCommandResponse<T = unknown> = {
  commandId: string;
  success: boolean;
  data?: T;
  error?: string;
};

export type RegisterAgentRequest = {
  token: string;
  agentName: string;
};

export type RegisterAgentResponse = {
  success: boolean;
  agentId?: string;
  websocketUrl?: string;
  message?: string;
};

export type LocalConfig = {
  token: string;
  agentName: string;
  agentId?: string;
  websocketUrl?: string;
  apiUrl?: string;
  syncIntervalSeconds?: number;
  logLevel?: string;
};
