#!/usr/bin/env node
"use strict";

const assert = require("assert");
const { execSync } = require("child_process");

function run(command) {
  return execSync(command, { encoding: "utf8" }).trim();
}

function testWorkflow1() {
  const output = JSON.parse(
    run("node openclaw/workflows/workflow1-intelligent-drafting.js openclaw/workflows/sample-workflow1.json")
  );
  assert(output.transactionProposal.contractFunction === "createCampaign");
  assert(Array.isArray(output.suggestedInfluencers) && output.suggestedInfluencers.length >= 2);
  assert(output.transactionProposal.autoExecute === false);
}

function testWorkflow2() {
  const output = JSON.parse(
    run("node openclaw/workflows/workflow2-proof-validation.js openclaw/workflows/sample-workflow2.json")
  );
  assert(output.valid === true);
  assert(output.suggestion === "approve");
}

function main() {
  testWorkflow1();
  testWorkflow2();
  console.log("OpenClaw mock flow tests passed.");
}

main();
