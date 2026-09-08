import fs from "node:fs";
import { execSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const serverFile = path.resolve(__dirname, ".output/server/index.mjs");

if (!fs.existsSync(serverFile)) {
  console.log("[Server Launcher] .output/server/index.mjs not found. Running build...");
  try {
    execSync("npm run build", { stdio: "inherit", cwd: __dirname });
    console.log("[Server Launcher] Build completed successfully.");
  } catch (err) {
    console.error("[Server Launcher] Build command failed:", err);
    process.exit(1);
  }
}

if (!fs.existsSync(serverFile)) {
  console.error("[Server Launcher] Error: .output/server/index.mjs still not found after build.");
  process.exit(1);
}

console.log("[Server Launcher] Starting production server from .output/server/index.mjs...");
await import("./.output/server/index.mjs");
