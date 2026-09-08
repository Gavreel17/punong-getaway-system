import { spawn } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Increase V8 heap limit to allow bundling on low-memory servers (e.g., Render free tier)
const currentOptions = process.env.NODE_OPTIONS || "";
if (!currentOptions.includes("--max-old-space-size")) {
  process.env.NODE_OPTIONS = `${currentOptions} --max-old-space-size=2048`.trim();
}

console.log(`[Build] Running build with NODE_OPTIONS="${process.env.NODE_OPTIONS}"...`);

const isWindows = process.platform === "win32";
const npxCmd = isWindows ? "npx.cmd" : "npx";

const child = spawn(npxCmd, ["vite", "build"], {
  stdio: "inherit",
  cwd: __dirname,
  env: process.env,
  shell: true,
});

child.on("close", (code) => {
  if (code !== 0) {
    console.error(`[Build] Vite build failed with exit code ${code}`);
    process.exit(code || 1);
  }
  console.log("[Build] Vite build completed successfully.");
});
