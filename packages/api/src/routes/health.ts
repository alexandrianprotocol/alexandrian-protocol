import { FastifyPluginAsync } from "fastify";
import { readFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const { version } = JSON.parse(
  readFileSync(join(__dirname, "../../package.json"), "utf-8")
) as { version: string };

const START = Date.now();

export const healthRoute: FastifyPluginAsync = async (fastify) => {
  fastify.get("/health", async (_req, reply) => {
    return reply.send({
      status: "ok",
      version,
      uptime: Math.floor((Date.now() - START) / 1000),
      subgraphConfigured: !!process.env.SUBGRAPH_URL,
      ipfsGateway: process.env.IPFS_GATEWAY ?? "https://gateway.pinata.cloud/ipfs",
    });
  });
};
