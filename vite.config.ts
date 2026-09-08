import { defineConfig } from "@lovable.dev/vite-tanstack-config";

export default defineConfig({
  vite: {
    server: {
      port: 8080,
      host: true,
    },
    build: {
      sourcemap: false,
      minify: "esbuild",
      rollupOptions: {
        maxParallelFileOps: 2,
        cache: false,
      },
    },
  },
  tanstackStart: {
    server: { entry: "server" },
  },
  nitro: {
    preset: "node-server",
    minify: false,
    sourceMap: false,
  },
});

