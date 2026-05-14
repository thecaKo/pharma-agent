"use client";

import { useMemo, useState } from "react";
import { DatabaseFile } from "@/types/agent";

type Props = {
  files: DatabaseFile[];
  initialDatabaseType: string;
};

export function DatabaseFileResults({
  files,
  initialDatabaseType
}: Props) {
  const [databaseType, setDatabaseType] = useState(initialDatabaseType);
  const databaseTypes = useMemo(
    () => Array.from(new Set(files.map((file) => file.databaseType))).sort((a, b) => a.localeCompare(b)),
    [files]
  );
  const filteredFiles = databaseType === "all"
    ? files
    : files.filter((file) => file.databaseType === databaseType);

  return (
    <>
      <div className="grid" style={{ marginTop: 16 }}>
        <label>
          Filtrar por tipo
          <select value={databaseType} onChange={(event) => setDatabaseType(event.target.value)}>
            <option value="all">Todos ({files.length})</option>
            {databaseTypes.map((type) => (
              <option key={type} value={type}>
                {type} ({files.filter((file) => file.databaseType === type).length})
              </option>
            ))}
          </select>
        </label>
      </div>

      <table style={{ marginTop: 16 }}>
        <thead>
          <tr>
            <th>Arquivo</th>
            <th>Tipo provável</th>
            <th>Ext.</th>
            <th>Caminho</th>
            <th>Tamanho</th>
            <th>Modificado</th>
            <th>Ação</th>
          </tr>
        </thead>
        <tbody>
          {filteredFiles.map((file) => (
            <tr key={file.path}>
              <td>{file.name}</td>
              <td>{file.databaseType}</td>
              <td><code>{file.extension}</code></td>
              <td title={file.path}><code>{trimPath(file.path)}</code></td>
              <td>{formatBytes(file.size)}</td>
              <td>{formatDate(file.modifiedAt)}</td>
              <td>
                <button
                  type="button"
                  className="button secondary"
                  onClick={() => selectDatabaseFile(file.path)}
                >
                  Selecionar
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {!filteredFiles.length ? (
        <p className="muted" style={{ marginBottom: 0, marginTop: 12 }}>
          Nenhum arquivo encontrado para o tipo selecionado.
        </p>
      ) : null}
    </>
  );
}

function selectDatabaseFile(path: string) {
  const databaseInput = document.querySelector<HTMLInputElement>('input[name="database"]');
  const driverSelect = document.querySelector<HTMLSelectElement>('select[name="driver"]');
  databaseInput?.focus();
  if (databaseInput) {
    databaseInput.value = path;
  }

  const driver = getDriverForDatabasePath(path);
  if (driver && driverSelect) {
    driverSelect.value = driver;
  }
}

function formatBytes(value: number | undefined) {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return "-";
  }
  if (value < 1024) {
    return `${value} B`;
  }
  if (value < 1024 * 1024) {
    return `${(value / 1024).toFixed(1)} KB`;
  }
  return `${(value / 1024 / 1024).toFixed(1)} MB`;
}

function formatDate(value: string | undefined) {
  if (!value) {
    return "-";
  }
  return new Date(value).toLocaleString("pt-BR");
}

function trimPath(value: string) {
  if (value.length <= 60) {
    return value;
  }
  return `${value.slice(0, 28)}...${value.slice(-29)}`;
}

function getDriverForDatabasePath(value: string) {
  const extension = value.toLowerCase().match(/\.[^.\\/]+$/)?.[0];
  if (!extension) {
    return null;
  }

  if ([".fdb", ".fbk", ".gdb"].includes(extension)) {
    return "firebird";
  }

  if ([".ib", ".ibk"].includes(extension)) {
    return "interbase";
  }

  if ([".frm", ".ibd", ".myd", ".myi"].includes(extension)) {
    return "mysql";
  }

  if ([".db", ".sqlite", ".sqlite3"].includes(extension)) {
    return "sqlite";
  }

  if ([".mdf", ".ldf", ".ndf", ".bak"].includes(extension)) {
    return "sqlserver";
  }

  if ([".dump", ".backup"].includes(extension)) {
    return "postgresql";
  }

  if ([".dbf", ".ctl", ".ora"].includes(extension)) {
    return "oracle";
  }

  return null;
}
