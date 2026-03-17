import Fastify, { FastifyInstance } from "fastify";
import cors from "@fastify/cors";
import { authPlugin } from "./middleware/auth.js";
import { healthRoute } from "./routes/health.js";
import { kbRoute } from "./routes/kb.js";
import { domainRoute } from "./routes/domain.js";
import { searchRoute } from "./routes/search.js";

export async function buildServer(): Promise<FastifyInstance> {
  const app = Fastify({
    logger: {
      level: process.env.LOG_LEVEL ?? "info",
      transport:
        process.env.NODE_ENV !== "production"
          ? { target: "pino-pretty", options: { colorize: true } }
          : undefined,
    },
  });

  // ── CORS ───────────────────────────────────────────────────────────────────
  await app.register(cors, {
    origin: process.env.CORS_ORIGIN ?? false,
    methods: ["GET", "OPTIONS"],
  });

  // ── Auth (skips /health) ───────────────────────────────────────────────────
  await app.register(authPlugin);

  // ── Routes ─────────────────────────────────────────────────────────────────
  await app.register(healthRoute);
  await app.register(kbRoute, { prefix: "/kb" });
  await app.register(domainRoute, { prefix: "/domain" });
  await app.register(searchRoute, { prefix: "/search" });

  return app;
}
