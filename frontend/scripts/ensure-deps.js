/* eslint-disable no-console */
"use strict";

const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");

function hasNextInstalled() {
  const nextPkg = path.resolve(__dirname, "..", "node_modules", "next", "package.json");
  return fs.existsSync(nextPkg);
}

function main() {
  // Vercel can be misconfigured to run `npm run build` as the install command.
  // This guard makes builds resilient by installing deps if `next` isn't present.
  if (hasNextInstalled()) {
    console.log("[ensure-deps] next already installed; skipping npm ci.");
    return;
  }

  console.log("[ensure-deps] next not found; running npm ci.");
  execSync("npm ci", { stdio: "inherit" });
}

main();

