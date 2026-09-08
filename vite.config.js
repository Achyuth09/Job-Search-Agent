import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

function localApiPlugin() {
  const attach = (server) => {
    server.middlewares.use(async (req, res, next) => {
      const path = req.url?.split("?")[0];
      if (!path?.startsWith("/api/")) return next();
      try {
        const handlers = await server.ssrLoadModule("/server/handlers.ts");
        if (path === "/api/config") return handlers.handleConfig(req, res);
        if (path === "/api/search") return handlers.handleSearch(req, res);
        if (path === "/api/slack") return handlers.handleSlack(req, res);
        return next();
      } catch (error) {
        res.statusCode = 500;
        res.setHeader("Content-Type", "application/json");
        res.end(JSON.stringify({ error: String(error?.message || error) }));
      }
    });
  };

  return {
    name: "local-api",
    configureServer: attach,
    configurePreviewServer: attach,
  };
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  for (const [key, value] of Object.entries(env)) {
    if (process.env[key] === undefined) process.env[key] = value;
  }

  return {
    plugins: [react(), tailwindcss(), localApiPlugin()],
    server: {
      host: "0.0.0.0",
      port: 3000,
      strictPort: true,
      hmr: {
        port: 3000,
      },
    },
  };
});
