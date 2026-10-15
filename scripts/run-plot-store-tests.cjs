/* eslint-disable @typescript-eslint/no-require-imports */
const { spawnSync } = require("node:child_process");
const fs = require("node:fs");
const path = require("node:path");

const outputDir = ".test-dist";
fs.rmSync(outputDir, { recursive: true, force: true });
const tsc = process.platform === "win32" ? "npx.cmd" : "npx";
const compile = spawnSync(tsc, [
  "tsc",
  "--target", "ES2020",
  "--module", "commonjs",
  "--moduleResolution", "node",
  "--esModuleInterop",
  "--skipLibCheck",
  "--strict",
  "--outDir", outputDir,
  "lib/geometry.ts",
  "lib/plot-store.ts",
  "tests/plot-store.test.ts",
], { stdio: "inherit" });

if (compile.status !== 0) process.exit(compile.status ?? 1);
const nodeTest = spawnSync(process.execPath, ["--test", path.join(outputDir, "tests", "plot-store.test.js")], { stdio: "inherit" });
fs.rmSync(outputDir, { recursive: true, force: true });
process.exit(nodeTest.status ?? 1);
