import { DbConfig, ImportConfig, NormalizedProduct } from "../types";
import {
  importFirebirdProducts,
  listFirebirdColumns,
  listFirebirdTables,
  testFirebirdConnection
} from "./firebird";
import { importMysqlProducts, listMysqlColumns, listMysqlTables, testMysqlConnection } from "./mysql";
import { importOracleProducts, listOracleColumns, listOracleTables, testOracleConnection } from "./oracle";
import { importPostgresqlProducts, listPostgresqlColumns, listPostgresqlTables, testPostgresqlConnection } from "./postgresql";
import { importSqliteProducts, listSqliteColumns, listSqliteTables, testSqliteConnection } from "./sqlite";
import { importSqlserverProducts, listSqlserverColumns, listSqlserverTables, testSqlserverConnection } from "./sqlserver";

export async function testConnection(config: DbConfig): Promise<void> {
  switch (config.driver) {
    case "mysql":
      return testMysqlConnection(config);
    case "firebird":
      return testFirebirdConnection(config);
    case "interbase":
      return testFirebirdConnection(config);
    case "postgresql":
      return testPostgresqlConnection(config);
    case "sqlserver":
      return testSqlserverConnection(config);
    case "sqlite":
      return testSqliteConnection(config);
    case "oracle":
      return testOracleConnection(config);
  }
}

export async function listTables(config: DbConfig): Promise<string[]> {
  switch (config.driver) {
    case "mysql":
      return listMysqlTables(config);
    case "firebird":
      return listFirebirdTables(config);
    case "interbase":
      return listFirebirdTables(config);
    case "postgresql":
      return listPostgresqlTables(config);
    case "sqlserver":
      return listSqlserverTables(config);
    case "sqlite":
      return listSqliteTables(config);
    case "oracle":
      return listOracleTables(config);
  }
}

export async function listColumns(config: DbConfig, table: string): Promise<string[]> {
  switch (config.driver) {
    case "mysql":
      return listMysqlColumns(config, table);
    case "firebird":
      return listFirebirdColumns(config, table);
    case "interbase":
      return listFirebirdColumns(config, table);
    case "postgresql":
      return listPostgresqlColumns(config, table);
    case "sqlserver":
      return listSqlserverColumns(config, table);
    case "sqlite":
      return listSqliteColumns(config, table);
    case "oracle":
      return listOracleColumns(config, table);
  }
}

export async function importProducts(config: ImportConfig): Promise<NormalizedProduct[]> {
  switch (config.db.driver) {
    case "mysql":
      return importMysqlProducts(config);
    case "firebird":
      return importFirebirdProducts(config);
    case "interbase":
      return importFirebirdProducts(config);
    case "postgresql":
      return importPostgresqlProducts(config);
    case "sqlserver":
      return importSqlserverProducts(config);
    case "sqlite":
      return importSqliteProducts(config);
    case "oracle":
      return importOracleProducts(config);
  }
}
