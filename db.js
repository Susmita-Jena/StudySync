// db.js
// A deliberately simple JSON-file "database". No ORM, no native bindings —
// just an array of records read into memory and written back to disk after
// every change. This is plenty for a single-user or small-group study app,
// and it means you can literally open data/db.json and read your own data.
//
// If you ever outgrow this (many concurrent users, need for real querying),
// swap this file for a real database client — every route only talks to the
// `db.data.*` arrays and calls `db.save()`, so the rest of the app doesn't
// need to change.

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DB_PATH = path.join(__dirname, "data", "db.json");

const DEFAULT_DATA = {
  users: [],
  tasks: [],
  moods: [],
  pomodoroSessions: [],
  waterLogs: [],
  userState: [], // { userId, xp, streak, lastCompletionDate }
};

function ensureDb() {
  const dir = path.dirname(DB_PATH);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  if (!fs.existsSync(DB_PATH)) {
    fs.writeFileSync(DB_PATH, JSON.stringify(DEFAULT_DATA, null, 2));
  }
}

ensureDb();

let cache;
try {
  cache = JSON.parse(fs.readFileSync(DB_PATH, "utf-8"));
  // backfill any keys added in later versions of this file
  for (const key of Object.keys(DEFAULT_DATA)) {
    if (!(key in cache)) cache[key] = DEFAULT_DATA[key];
  }
} catch (e) {
  console.error("Could not read data/db.json, starting fresh:", e.message);
  cache = structuredClone(DEFAULT_DATA);
}

function save() {
  fs.writeFileSync(DB_PATH, JSON.stringify(cache, null, 2));
}

export const db = {
  get data() {
    return cache;
  },
  save,
};
