/**
 * Shared sql.js WASM loader for local SQLite (T38/T39).
 */

type SqlJsInit = (typeof import("sql.js"))["default"];
export type SqlJsStatic = Awaited<ReturnType<SqlJsInit>>;

export async function loadSqlJs(): Promise<SqlJsStatic> {
  const initSqlJs = (await import("sql.js")).default;
  try {
    const wasmModule = await import("sql.js/dist/sql-wasm.wasm?url");
    const wasmUrl =
      typeof wasmModule.default === "string"
        ? wasmModule.default
        : String(wasmModule.default);
    return initSqlJs({ locateFile: () => wasmUrl });
  } catch {
    return initSqlJs();
  }
}
