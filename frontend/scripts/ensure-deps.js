/* eslint-disable no-console */
"use strict";

const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");

function hasPackageInstalled(packageName) {
  const packageJsonPath = path.resolve(__dirname, "..", "node_modules", packageName, "package.json");
  return fs.existsSync(packageJsonPath);
}

function missingBuildPackages() {
  const requiredPackages = [
    "next",
    "postcss",
    "autoprefixer",
    "tailwindcss"
  ];

  return requiredPackages.filter((packageName) => !hasPackageInstalled(packageName));
}

function main() {
  // Vercel can be misconfigured to run `npm run build` as the install command.
  // This guard keeps builds resilient by ensuring required build-time deps exist.
  const missingPackages = missingBuildPackages();
  if (missingPackages.length === 0) {
    console.log("[ensure-deps] required build deps already installed; skipping npm ci.");
    return;
  }

  console.log(`[ensure-deps] missing deps (${missingPackages.join(", ")}); running npm ci.`);
  execSync("npm ci", { stdio: "inherit" });
}

main();
