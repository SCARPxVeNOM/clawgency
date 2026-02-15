#!/usr/bin/env node
"use strict";

const fs = require("fs");
const os = require("os");
const path = require("path");

function projectRoot() {
  return path.resolve(__dirname, "..", "..");
}

function env(name, fallback = "") {
  const value = process.env[name];
  if (typeof value !== "string") {
    return fallback;
  }
  const trimmed = value.trim();
  return trimmed || fallback;
}

function runtimeRoot() {
  const explicitRoot = env("OPENCLAW_RUNTIME_DIR");
  if (explicitRoot) {
    return path.resolve(explicitRoot);
  }

  if (process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME) {
    return path.resolve(os.tmpdir(), "clawgency-openclaw");
  }

  return path.resolve(projectRoot(), "openclaw");
}

function logPath() {
  const explicitFile = env("OPENCLAW_AUDIT_LOG_FILE");
  if (explicitFile) {
    return path.resolve(explicitFile);
  }
  return path.resolve(runtimeRoot(), "logs", "agent-audit.log");
}

function statePath() {
  const explicitFile = env("OPENCLAW_MONITOR_STATE_FILE");
  if (explicitFile) {
    return path.resolve(explicitFile);
  }
  return path.resolve(runtimeRoot(), "logs", "monitor-state.json");
}

function userMapPath() {
  const explicitFile = env("OPENCLAW_USER_MAP_FILE");
  if (explicitFile) {
    return path.resolve(explicitFile);
  }
  return path.resolve(projectRoot(), "openclaw", "config", "user-map.json");
}

function ensureDir(filePath) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
}

function writeAuditLog(entry) {
  const payload = {
    timestamp: new Date().toISOString(),
    ...entry
  };
  const file = logPath();
  ensureDir(file);
  fs.appendFileSync(file, `${JSON.stringify(payload)}\n`);
}

function readJsonFile(filePath, fallback = null) {
  try {
    return JSON.parse(fs.readFileSync(filePath, "utf8"));
  } catch {
    return fallback;
  }
}

function writeJsonFile(filePath, value) {
  ensureDir(filePath);
  fs.writeFileSync(filePath, JSON.stringify(value, null, 2));
}

function readUserMap() {
  return readJsonFile(userMapPath(), {});
}

module.exports = {
  projectRoot,
  logPath,
  statePath,
  writeAuditLog,
  readJsonFile,
  writeJsonFile,
  readUserMap
};
