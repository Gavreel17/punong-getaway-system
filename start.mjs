import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const serverFile = path.resolve(__dirname, ".output/server/index.mjs");

// Bind to 0.0.0.0 so Render port scanner immediately detects the service
process.env.HOST = process.env.HOST || "0.0.0.0";
process.env.NITRO_HOST = process.env.NITRO_HOST || "0.0.0.0";
if (process.env.PORT) {
  process.env.NITRO_PORT = process.env.PORT;
}

if (!fs.existsSync(serverFile)) {
  console.error("[Server Launcher] Error: .output/server/index.mjs not found.");
  console.error("[Server Launcher] Please set your Render 'Build Command' to: npm install && npm run build");
  process.exit(1);
}

console.log(`[Server Launcher] Starting production server on ${process.env.HOST}:${process.env.PORT || 3000}...`);
await import("./.output/server/index.mjs");

