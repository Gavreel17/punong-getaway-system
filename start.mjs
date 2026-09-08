import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { execSync } from "node:child_process";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const serverFile = path.resolve(__dirname, ".output/server/index.mjs");

// Bind to 0.0.0.0 so Render port scanner immediately detects the service
process.env.HOST = process.env.HOST || "0.0.0.0";
process.env.NITRO_HOST = process.env.NITRO_HOST || "0.0.0.0";
if (process.env.PORT) {
  process.env.NITRO_PORT = process.env.PORT;
}

if (!fs.existsSync(serverFile)) {
  console.log("[Server Launcher] .output/server/index.mjs not found.");
  console.log("[Server Launcher] Auto-building production bundle before starting...");
  try {
    execSync("node build.mjs", { stdio: "inherit", cwd: __dirname });
    console.log("[Server Launcher] Build completed successfully.");
  } catch (err) {
    console.error("[Server Launcher] Build failed:", err);
    process.exit(1);
  }
}

if (!fs.existsSync(serverFile)) {
  console.error("[Server Launcher] Error: .output/server/index.mjs still not found after build.");
  process.exit(1);
}

console.log(`[Server Launcher] Starting production server on ${process.env.HOST}:${process.env.PORT || 3000}...`);
await import("./.output/server/index.mjs");


