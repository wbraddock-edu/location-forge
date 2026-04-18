import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import path from "path";
import fs from "fs";
import * as schema from "@shared/schema";

const dbDir = process.env.RAILWAY_VOLUME_MOUNT_PATH || ".";
const dbPath = path.join(dbDir, "data.db");

// Ensure the database directory exists (Railway volume may not be pre-created)
fs.mkdirSync(dbDir, { recursive: true });

const sqlite = new Database(dbPath);
sqlite.pragma("journal_mode = WAL");

// Create tables
sqlite.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    display_name TEXT NOT NULL,
    created_at TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS auth_sessions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    token TEXT NOT NULL UNIQUE,
    expires_at TEXT NOT NULL,
    created_at TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS password_resets (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    token TEXT NOT NULL UNIQUE,
    expires_at TEXT NOT NULL,
    created_at TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS locations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    visitor_id TEXT NOT NULL,
    name TEXT NOT NULL,
    source_type TEXT NOT NULL,
    profile_json TEXT NOT NULL,
    created_at TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS sessions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    session_key TEXT NOT NULL UNIQUE,
    user_id INTEGER,
    state_json TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS projects (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    name TEXT NOT NULL,
    state_json TEXT NOT NULL DEFAULT '{}',
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS location_candidates (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    project_id INTEGER,
    name TEXT NOT NULL,
    normalized_name TEXT NOT NULL,
    aliases_json TEXT NOT NULL DEFAULT '[]',
    type TEXT,
    category TEXT,
    sources_json TEXT NOT NULL DEFAULT '[]',
    occurrences INTEGER DEFAULT 0,
    contexts_json TEXT NOT NULL DEFAULT '[]',
    associated_characters_json TEXT NOT NULL DEFAULT '[]',
    parent_hint TEXT,
    confidence REAL DEFAULT 0,
    reasons_json TEXT NOT NULL DEFAULT '[]',
    status TEXT NOT NULL DEFAULT 'candidate',
    extended_json TEXT NOT NULL DEFAULT '{}',
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS story_forge_imports (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    project_id INTEGER,
    payload_json TEXT NOT NULL,
    created_at TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS support_tickets (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    user_email TEXT NOT NULL,
    category TEXT NOT NULL DEFAULT 'general',
    subject TEXT NOT NULL,
    message TEXT NOT NULL,
    error_context TEXT,
    status TEXT NOT NULL DEFAULT 'open',
    priority TEXT NOT NULL DEFAULT 'normal',
    created_at TEXT NOT NULL
  );
`);

// Add user_id column to sessions if it doesn't exist (migration for existing DBs)
try {
  sqlite.exec(`ALTER TABLE sessions ADD COLUMN user_id INTEGER`);
} catch { /* column already exists */ }

// Subscription columns
try { sqlite.exec(`ALTER TABLE users ADD COLUMN trial_started_at TEXT`); } catch {}
try { sqlite.exec(`ALTER TABLE users ADD COLUMN subscription_status TEXT DEFAULT 'trial'`); } catch {}
try { sqlite.exec(`ALTER TABLE users ADD COLUMN stripe_customer_id TEXT`); } catch {}
try { sqlite.exec(`ALTER TABLE users ADD COLUMN stripe_subscription_id TEXT`); } catch {}
try { sqlite.exec(`ALTER TABLE users ADD COLUMN subscription_plan TEXT`); } catch {}
try { sqlite.exec(`ALTER TABLE users ADD COLUMN subscription_expires_at TEXT`); } catch {}
try { sqlite.exec(`ALTER TABLE users ADD COLUMN role TEXT DEFAULT 'user'`); } catch {}

// Set admin role for the owner
try { sqlite.exec(`UPDATE users SET role = 'admin' WHERE email = 'designholistically@gmail.com'`); } catch {}
// Set trial_started_at for existing users
try { sqlite.exec(`UPDATE users SET trial_started_at = created_at WHERE trial_started_at IS NULL`); } catch {}

// Migrate: copy any existing session data into projects table for that user
try {
  const existingSessions = sqlite.prepare(`SELECT user_id, state_json, updated_at FROM sessions WHERE user_id IS NOT NULL`).all() as any[];
  for (const sess of existingSessions) {
    const hasProject = sqlite.prepare(`SELECT id FROM projects WHERE user_id = ?`).get(sess.user_id);
    if (!hasProject) {
      sqlite.prepare(`INSERT INTO projects (user_id, name, state_json, created_at, updated_at) VALUES (?, ?, ?, ?, ?)`)
        .run(sess.user_id, 'My Project', sess.state_json, sess.updated_at, sess.updated_at);
    }
  }
} catch { /* migration already done or no data */ }

export const db = drizzle(sqlite, { schema });
export { sqlite };
