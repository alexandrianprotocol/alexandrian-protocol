import "dotenv/config";
import { buildServer } from "./server.js";

const PORT = Number(process.env.PORT ?? 3000);
const HOST = process.env.HOST ?? "0.0.0.0";

const app = await buildServer();

try {
  await app.listen({ port: PORT, host: HOST });
  app.log.info(`Alexandrian API listening on ${HOST}:${PORT}`);
} catch (err) {
  app.log.error(err);
  process.exit(1);
}
