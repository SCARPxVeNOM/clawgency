#!/usr/bin/env node
"use strict";

const fs = require("fs");
const path = require("path");

function projectRoot() {
  return path.resolve(__dirname, "..", "..");
}

function logPath() {
  return path.resolve(projectRoot(), "openclaw", "logs", "agent-audit.log");
}

function statePath() {
  return path.resolve(projectRoot(), "openclaw", "logs", "monitor-state.json");
}

function userMapPath() {
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
