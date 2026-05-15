import fs from "node:fs/promises";
import path from "node:path";
import { DatabaseFile, DatabaseFileSearchPayload, DatabaseFileValidationResult } from "../types";

const DATABASE_FILE_TYPES = new Map<string, string[]>([
  [".fdb", ["Firebird"]],
  [".fbk", ["Firebird"]],
  [".gdb", ["Firebird", "InterBase"]],
  [".mdf", ["SQL Server"]],
  [".ldf", ["SQL Server"]],
  [".ndf", ["SQL Server"]],
  [".bak", ["SQL Server"]],
  [".sql", ["PostgreSQL", "MySQL"]],
  [".dump", ["PostgreSQL"]],
  [".backup", ["PostgreSQL"]],
  [".frm", ["MySQL"]],
  [".ibd", ["MySQL"]],
  [".myd", ["MySQL"]],
  [".myi", ["MySQL"]],
  [".db", ["SQLite"]],
  [".sqlite", ["SQLite"]],
  [".sqlite3", ["SQLite"]],
  [".dbf", ["Oracle"]],
  [".ctl", ["Oracle"]],
  [".ora", ["Oracle"]],
  [".log", ["Oracle"]],
  [".ib", ["InterBase"]],
  [".ibk", ["InterBase"]]
]);
const FIREBIRD_EXTENSIONS = new Set([".fdb", ".gdb", ".fbk"]);
const DEFAULT_MAX_DEPTH = 3;
const DEFAULT_MAX_RESULTS = 100;
const SEARCH_TIMEOUT_MS = 15000;
const DEEP_SCAN_MAX_DEPTH = 12;
const DEEP_SCAN_MAX_RESULTS = 300;
const DEEP_SCAN_TIMEOUT_MS = 60000;
const SKIPPED_DIRECTORY_NAMES = new Set([
  "$recycle.bin",
  ".cache",
  ".git",
  "appdata",
  "cache",
  "dev",
  "library",
  "node_modules",
  "proc",
  "program files",
  "program files (x86)",
  "run",
  "snap",
  "sys",
  "system volume information",
  "tmp",
  "windows"
]);

export async function runDatabaseAutoDetect(payload: { maxDepth?: number; maxResults?: number } = {}): Promise<{ roots: string[]; files: DatabaseFile[] }> {
  const roots = await getAutoDetectRoots();
  logDatabaseSearch(`auto-detect roots=${roots.join(", ") || "(nenhuma raiz encontrada)"}`);
  const result = await runDatabaseFiles({
    directories: roots,
    maxDepth: payload.maxDepth ?? DEFAULT_MAX_DEPTH,
    maxResults: payload.maxResults ?? DEFAULT_MAX_RESULTS
  });
  return {
    roots,
    files: result.files
  };
}

export async function runDatabaseDeepScan(
  payload: { maxDepth?: number; maxResults?: number; timeoutMs?: number } = {}
): Promise<{ roots: string[]; files: DatabaseFile[] }> {
  const roots = await getDeepScanRoots();
  const maxDepth = clampNumber(payload.maxDepth, 1, 30, DEEP_SCAN_MAX_DEPTH);
  const maxResults = clampNumber(payload.maxResults, 1, 1000, DEEP_SCAN_MAX_RESULTS);
  const timeoutMs = clampNumber(payload.timeoutMs, 5000, 180000, DEEP_SCAN_TIMEOUT_MS);

  logDatabaseSearch(`deep-scan roots=${roots.join(", ") || "(nenhuma raiz encontrada)"}`);
  const result = await runDatabaseFiles({
    directories: roots,
    maxDepth,
    maxResults,
    timeoutMs
  });

  return {
    roots,
    files: result.files
  };
}

export async function runDatabaseFiles(payload: DatabaseFileSearchPayload): Promise<{ files: DatabaseFile[] }> {
  const roots = normalizeSearchRoots(payload);
  const startedAt = Date.now();
  const maxDepth = clampNumber(payload.maxDepth, 0, 30, DEFAULT_MAX_DEPTH);
  const maxResults = clampNumber(payload.maxResults, 1, 300, DEFAULT_MAX_RESULTS);
  const timeoutMs = clampNumber(payload.timeoutMs, 1000, 180000, SEARCH_TIMEOUT_MS);
  const files: DatabaseFile[] = [];
  const seen = new Set<string>();

  logDatabaseSearch(`iniciando busca global: roots=${roots.join(", ")} maxDepth=${maxDepth} maxResults=${maxResults} timeoutMs=${timeoutMs}`);

  for (const root of roots) {
    logDatabaseSearch(`varrendo raiz: ${root}`);
    await searchDirectory(root, {
      currentDepth: 0,
      maxDepth,
      maxResults,
      timeoutMs,
      startedAt,
      files,
      seen
    });

    if (files.length >= maxResults || isTimedOut(startedAt, timeoutMs)) {
      logDatabaseSearch(`interrompendo busca: files=${files.length} timeout=${isTimedOut(startedAt, timeoutMs)}`);
      break;
    }
  }

  logDatabaseSearch(`busca finalizada: encontrados=${files.length} tempoMs=${Date.now() - startedAt}`);

  return {
    files: files.sort((a, b) => a.path.localeCompare(b.path))
  };
}

export async function runDatabaseFileValidation(payload: { path: string }): Promise<DatabaseFileValidationResult> {
  const filePath = path.resolve(String(payload.path ?? "").trim());
  logDatabaseSearch(`validando arquivo: ${filePath}`);

  if (!filePath) {
    throw new Error("Caminho do arquivo de banco nao informado.");
  }

  const extension = path.extname(filePath).toLowerCase();
  const databaseType = getDatabaseType(filePath);
  if (!databaseType) {
    throw new Error(`Arquivo nao reconhecido como banco candidato: ${extension || "(sem extensao)"}.`);
  }

  try {
    await fs.access(filePath);
    const stat = await fs.stat(filePath);

    if (!stat.isFile()) {
      throw new Error("Caminho informado nao e um arquivo.");
    }

    return {
      exists: true,
      readable: true,
      name: path.basename(filePath),
      path: filePath,
      extension,
      databaseType,
      size: stat.size,
      modifiedAt: stat.mtime.toISOString()
    };
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(`Arquivo de banco invalido: ${error.message}`);
    }
    throw new Error("Arquivo de banco invalido.");
  }
}

export const runFirebirdAutoDetect = runDatabaseAutoDetect;
export const runFirebirdDeepScan = runDatabaseDeepScan;
export const runFirebirdFiles = runDatabaseFiles;
export const runFirebirdFileValidation = runDatabaseFileValidation;

type SearchContext = {
  currentDepth: number;
  maxDepth: number;
  maxResults: number;
  timeoutMs: number;
  startedAt: number;
  files: DatabaseFile[];
  seen: Set<string>;
};

async function searchDirectory(directory: string, context: SearchContext): Promise<void> {
  if (
    context.currentDepth > context.maxDepth ||
    context.files.length >= context.maxResults ||
    isTimedOut(context.startedAt, context.timeoutMs)
  ) {
    return;
  }

  let entries: Array<import("node:fs").Dirent>;
  try {
    logDatabaseSearch(`lendo pasta: ${directory} depth=${context.currentDepth}`);
    entries = await fs.readdir(directory, { withFileTypes: true });
  } catch (error) {
    logDatabaseSearch(`nao foi possivel ler pasta: ${directory} erro=${formatError(error)}`);
    return;
  }

  for (const entry of entries) {
    if (context.files.length >= context.maxResults || isTimedOut(context.startedAt, context.timeoutMs)) {
      return;
    }

    const entryPath = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      if (shouldSkipDirectory(entry.name)) {
        logDatabaseSearch(`ignorando pasta: ${entryPath}`);
        continue;
      }
      await searchDirectory(entryPath, { ...context, currentDepth: context.currentDepth + 1 });
      continue;
    }

    if (!entry.isFile() || !getDatabaseType(entryPath)) {
      continue;
    }

    const resolvedPath = path.resolve(entryPath);
    if (context.seen.has(resolvedPath)) {
      continue;
    }

    const file = await toDatabaseFile(resolvedPath);
    logDatabaseSearch(`arquivo encontrado: ${file.path} tipo=${file.databaseType} ext=${file.extension} size=${file.size ?? 0}`);
    context.seen.add(resolvedPath);
    context.files.push(file);
  }
}

async function toDatabaseFile(filePath: string): Promise<DatabaseFile> {
  const stat = await fs.stat(filePath);
  const extension = path.extname(filePath).toLowerCase();
  const databaseType = getDatabaseType(filePath) ?? "Banco";
  return {
    name: path.basename(filePath),
    path: filePath,
    extension,
    databaseType,
    size: stat.size,
    modifiedAt: stat.mtime.toISOString()
  };
}

function normalizeSearchRoots(payload: DatabaseFileSearchPayload): string[] {
  const rawRoots = [
    ...(payload.directories ?? []),
    ...(payload.directory ? [payload.directory] : [])
  ];
  const roots = rawRoots.map((directory) => path.resolve(String(directory).trim())).filter(Boolean);
  return Array.from(new Set(roots.length ? roots : [process.cwd()]));
}

function clampNumber(value: number | undefined, min: number, max: number, fallback: number): number {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return fallback;
  }
  return Math.min(max, Math.max(min, Math.trunc(value)));
}

function shouldSkipDirectory(name: string): boolean {
  return SKIPPED_DIRECTORY_NAMES.has(name.toLowerCase());
}

function getDatabaseType(filePath: string): string | null {
  const extension = path.extname(filePath).toLowerCase();
  const types = DATABASE_FILE_TYPES.get(extension);
  if (!types) {
    return null;
  }

  if (extension === ".log" && !looksLikeOracleLog(filePath)) {
    return null;
  }

  return types.join(" / ");
}

function looksLikeOracleLog(filePath: string): boolean {
  const normalized = filePath.toLowerCase();
  return normalized.includes("oracle") || normalized.includes("oradata") || normalized.includes("redo");
}

function isTimedOut(startedAt: number, timeoutMs: number): boolean {
  return Date.now() - startedAt > timeoutMs;
}

async function getAutoDetectRoots(): Promise<string[]> {
  const candidates = process.platform === "win32" ? getWindowsRootCandidates() : getUnixRootCandidates();
  const existing: string[] = [];

  for (const candidate of candidates) {
    try {
      const stat = await fs.stat(candidate);
      if (stat.isDirectory()) {
        existing.push(path.resolve(candidate));
      }
    } catch {
      // Ignore missing common paths.
    }
  }

  return Array.from(new Set(existing));
}

function getWindowsRootCandidates(): string[] {
  const driveRoots = "CDEFG".split("").map((drive) => `${drive}:\\`);
  return [
    process.cwd(),
    ...driveRoots,
    "C:\\Sistema",
    "C:\\Sistemas",
    "C:\\Dados",
    "C:\\Firebird",
    "C:\\Softpharma",
    "C:\\Farmacia",
    "C:\\ProgramData"
  ];
}

function getUnixRootCandidates(): string[] {
  return [
    process.cwd(),
    path.resolve(process.cwd(), "..", "..", "test-firebird"),
    "/var/lib/firebird",
    "/firebird",
    "/opt",
    "/srv",
    "/mnt",
    "/media"
  ];
}

async function getDeepScanRoots(): Promise<string[]> {
  const quickRoots = await getAutoDetectRoots();
  const broadRoots = process.platform === "win32" ? await getWindowsDriveRoots() : ["/"];
  const candidates = [...quickRoots, ...broadRoots];
  const existing: string[] = [];

  for (const candidate of candidates) {
    try {
      const stat = await fs.stat(candidate);
      if (stat.isDirectory()) {
        existing.push(path.resolve(candidate));
      }
    } catch {
      // Ignore inaccessible roots.
    }
  }

  return Array.from(new Set(existing));
}

async function getWindowsDriveRoots(): Promise<string[]> {
  const letters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");
  const roots: string[] = [];

  for (const letter of letters) {
    const root = `${letter}:\\`;
    try {
      const stat = await fs.stat(root);
      if (stat.isDirectory()) {
        roots.push(root);
      }
    } catch {
      // Drive does not exist or is inaccessible.
    }
  }

  return roots;
}

function logDatabaseSearch(message: string): void {
  console.log(`[database:files] ${message}`);
}

function formatError(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
