#!/usr/bin/env node
"use strict";

const assert = require("assert");
const fs = require("fs");
const path = require("path");
const { execFileSync } = require("child_process");

function runNode(scriptPath, payload) {
  const args = [scriptPath];
  if (payload !== undefined) {
    args.push(payload);
  }
  return execFileSync(process.execPath, args, { encoding: "utf8" }).trim();
}

function readSample(relativePath) {
  return fs.readFileSync(path.resolve(process.cwd(), relativePath), "utf8");
}

function testWorkflow1() {
  const output = JSON.parse(runNode("openclaw/workflows/workflow1-intelligent-drafting.js", readSample("openclaw/workflows/sample-workflow1.json")));
  assert(output.transactionProposal.contractFunction === "createCampaign");
  assert(Array.isArray(output.suggestedInfluencers) && output.suggestedInfluencers.length >= 2);
  assert(output.transactionProposal.autoExecute === false);
}

function testWorkflow2() {
  const output = JSON.parse(runNode("openclaw/workflows/workflow2-proof-validation.js", readSample("openclaw/workflows/sample-workflow2.json")));
  assert(output.valid === true);
  assert(output.suggestion === "approve");
}

function testWorkflow4EmailDraft() {
  const output = JSON.parse(runNode("openclaw/workflows/workflow4-email-drafting.js", readSample("openclaw/workflows/sample-email-draft.json")));
  assert(output.mode === "advisory");
  assert(output.safety.requiresHumanApproval === true);
  assert(output.safety.noAutoSend === true);
  assert(Array.isArray(output.subjectOptions) && output.subjectOptions.length >= 1);
}

function testWorkflow5ReplyParsing() {
  const output = JSON.parse(runNode("openclaw/workflows/workflow5-reply-parsing.js", readSample("openclaw/workflows/sample-email-reply.json")));
  assert(["yes", "no", "maybe"].includes(output.interest));
  assert(typeof output.confidence === "number");
  assert(output.requiresHumanReview === true);
}

function main() {
  testWorkflow1();
  testWorkflow2();
  testWorkflow4EmailDraft();
  testWorkflow5ReplyParsing();
  console.log("OpenClaw mock flow tests passed.");
}

main();
