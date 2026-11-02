import "dotenv/config";
import { createServer } from "node:http";
import { makeExecutableSchema } from "@graphql-tools/schema";
import { createYoga } from "graphql-yoga";
import { authenticateRequest } from "./auth.js";
import { closeDatabase, databaseHealth } from "./db.js";
import { resolvers } from "./resolvers.js";
import { loadGraphqlTypeDefs } from "./schemaLoader.js";
import { handleUploadRequest } from "./uploads.js";

const schema = makeExecutableSchema({
  typeDefs: loadGraphqlTypeDefs(),
  resolvers,
});

const yoga = createYoga({
  schema,
  graphqlEndpoint: "/graphql",
  graphiql: process.env.NODE_ENV !== "production",
  context: async ({ request }) => ({
    user: await authenticateRequest(request.headers),
  }),
});

const port = Number(process.env.API_PORT ?? 4000);
const server = createServer((request, response) => {
  void handleUploadRequest(request, response)
    .then((handled) => {
      if (!handled) void yoga(request, response);
    })
    .catch((error: unknown) => {
      console.error("Request handler failed:", error);
      if (response.headersSent) response.destroy();
      else {
        response.writeHead(500, { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" });
        response.end(JSON.stringify({ error: "Internal server error." }));
      }
    });
});

server.listen(port, "0.0.0.0", () => {
  console.log(`Funbike GraphQL API listening on http://0.0.0.0:${port}/graphql`);
  const jwtSecret = process.env.JWT_SECRET ?? "";
  if (jwtSecret.toLowerCase().includes("replace-with") || Buffer.byteLength(jwtSecret, "utf8") < 32) {
    console.warn("JWT_SECRET is missing or too short; administrator login is disabled until it is configured.");
  }
  void databaseHealth().then((status) => {
    if (status === "connected") {
      console.log("MySQL connection ready.");
    } else {
      console.warn(`MySQL status: ${status}. The API is available, but catalog queries need a configured database.`);
    }
  });
});

async function shutdown(signal: string) {
  console.log(`${signal} received; stopping API.`);
  server.close(async () => {
    await closeDatabase();
    process.exit(0);
  });
}

process.once("SIGINT", () => void shutdown("SIGINT"));
process.once("SIGTERM", () => void shutdown("SIGTERM"));
