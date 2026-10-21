
/* eslint-disable @typescript-eslint/no-require-imports */
const { spawnSync } = require("node:child_process");
const fs = require("node:fs");
const path = require("node:path");

const outputDir = ".test-dist-editor-session";
fs.rmSync(outputDir, { recursive: true, force: true });

const isWindows = process.platform === "win32";
const tsc = isWindows ? "npx.cmd" : "npx";

const compile = spawnSync(
  tsc,
  [
    "tsc",
    "--target", "ES2020",
    "--module", "commonjs",
    "--moduleResolution", "node",
    "--esModuleInterop",
    "--skipLibCheck",
    "--strict",
    "--outDir", outputDir,
    "lib/editor-session.ts",
    "tests/editor-session.test.ts",
  ],
  { stdio: "inherit", shell: isWindows },
);

if (compile.error) {
  console.error("Could not start TypeScript compilation:", compile.error.message);
  fs.rmSync(outputDir, { recursive: true, force: true });
  process.exit(1);
}

if (compile.status !== 0) {
  fs.rmSync(outputDir, { recursive: true, force: true });
  process.exit(compile.status ?? 1);
}

const nodeTest = spawnSync(
  process.execPath,
  ["--test", path.join(outputDir, "tests", "editor-session.test.js")],
  { stdio: "inherit" },
);

fs.rmSync(outputDir, { recursive: true, force: true });

if (nodeTest.error) {
  console.error("Could not start editor-session tests:", nodeTest.error.message);
  process.exit(1);
}

process.exit(nodeTest.status ?? 1);
