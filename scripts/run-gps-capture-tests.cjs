
/* eslint-disable @typescript-eslint/no-require-imports */
const { spawnSync } = require("node:child_process");
const fs = require("node:fs");
const path = require("node:path");

const outputDir = ".test-dist-gps-capture";
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
    "lib/geometry.ts",
    "lib/gps-projection.ts",
    "lib/gps-capture.ts",
    "tests/gps-capture.test.ts",
  ],
  { stdio: "inherit", shell: isWindows },
);

if (compile.error) {
  console.error("Failed to start TypeScript compiler:", compile.error.message);
  fs.rmSync(outputDir, { recursive: true, force: true });
  process.exit(1);
}

if (compile.status !== 0) {
  fs.rmSync(outputDir, { recursive: true, force: true });
  process.exit(compile.status ?? 1);
}

const nodeTest = spawnSync(
  process.execPath,
  ["--test", path.join(outputDir, "tests", "gps-capture.test.js")],
  { stdio: "inherit" },
);

fs.rmSync(outputDir, { recursive: true, force: true });

if (nodeTest.error) {
  console.error("Failed to start GPS capture tests:", nodeTest.error.message);
  process.exit(1);
}

process.exit(nodeTest.status ?? 1);
