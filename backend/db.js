// db.js
// Uses sql.js (SQLite compiled to WebAssembly) instead of a native addon like
// better-sqlite3. This means NO native compilation step (no node-gyp, no
// Visual Studio Build Tools / Xcode required) - it just works the same way
// on Windows, macOS, and Linux out of the box.
//
// sql.js keeps the database in memory; we persist it to SmartFarmCrop.db on
// disk after every write, and reload it from disk on startup, so data still
// survives restarts.

const path = require('path');
const fs = require('fs');
const initSqlJs = require('sql.js');

const DB_PATH = path.join(__dirname, 'SmartFarmCrop.db');
const SCHEMA_PATH = path.join(__dirname, 'init.sql');

let sqljsDb = null; // the underlying sql.js Database instance, set by initDb()

function persist() {
  const data = sqljsDb.export();
  fs.writeFileSync(DB_PATH, Buffer.from(data));
}

/**
 * Wraps a raw SQL string so it can be used the same way as a
 * better-sqlite3 prepared statement: stmt.run(params), stmt.get(params),
 * stmt.all(params). Params can be a plain object with @name / :name / $name
 * keys (matching the SQL in routes/quotes.js) or omitted entirely.
 */
function prepare(sql) {
  function bindParams(stmt, params) {
    if (params === undefined || params === null) return;
    if (Array.isArray(params)) {
      stmt.bind(params);
      return;
    }
    if (typeof params !== 'object') {
      // A single scalar value (e.g. .get(id)) binds to a single positional "?".
      stmt.bind([params]);
      return;
    }
    // sql.js requires named-parameter keys to include their SQL prefix
    // (e.g. "@crop_name"), but callers pass plain object keys
    // ("crop_name") to match the @-style placeholders used in our SQL -
    // so re-prefix them here rather than making every call site remember to.
    const prefixed = {};
    for (const key of Object.keys(params)) {
      const already = key.startsWith('@') || key.startsWith(':') || key.startsWith('$');
      prefixed[already ? key : `@${key}`] = params[key];
    }
    stmt.bind(prefixed);
  }

  return {
    run(params) {
      const stmt = sqljsDb.prepare(sql);
      bindParams(stmt, params);
      stmt.step();
      stmt.free();
      const idRes = sqljsDb.exec('SELECT last_insert_rowid() AS id');
      const lastInsertRowid = idRes.length ? idRes[0].values[0][0] : undefined;
      const changes = sqljsDb.getRowsModified();
      persist();
      return { lastInsertRowid, changes };
    },
    get(params) {
      const stmt = sqljsDb.prepare(sql);
      bindParams(stmt, params);
      let row;
      if (stmt.step()) row = stmt.getAsObject();
      stmt.free();
      return row;
    },
    all(params) {
      const stmt = sqljsDb.prepare(sql);
      bindParams(stmt, params);
      const rows = [];
      while (stmt.step()) rows.push(stmt.getAsObject());
      stmt.free();
      return rows;
    },
  };
}

/**
 * Must be awaited once before the server starts handling requests.
 * Loads sql.js's WASM binary, opens (or creates) SmartFarmCrop.db, and runs
 * init.sql to make sure the `crops` table exists and is seeded. Idempotent -
 * safe to run every server start.
 */
async function initDb() {
  const SQL = await initSqlJs({
    locateFile: (file) => path.join(__dirname, 'node_modules', 'sql.js', 'dist', file),
  });

  if (fs.existsSync(DB_PATH)) {
    sqljsDb = new SQL.Database(fs.readFileSync(DB_PATH));
  } else {
    sqljsDb = new SQL.Database();
  }

  const schema = fs.readFileSync(SCHEMA_PATH, 'utf8');
  sqljsDb.exec(schema);
  persist();
}

/** Returns the query interface. Throws if initDb() hasn't resolved yet. */
function getDb() {
  if (!sqljsDb) {
    throw new Error('Database not initialised yet - initDb() must be awaited before use.');
  }
  return { prepare };
}

module.exports = { initDb, getDb };
