import "dotenv/config";
import { createServer, type IncomingHttpHeaders } from "node:http";
import express, { type NextFunction, type Request, type Response } from "express";
import { ApolloServer } from "@apollo/server";
import { expressMiddleware } from "@as-integrations/express5";
import { makeExecutableSchema } from "@graphql-tools/schema";
import { authenticateRequest } from "./auth.js";
import { closeDatabase, databaseHealth } from "./db.js";
import { resolvers } from "./resolvers.js";
import { loadGraphqlTypeDefs } from "./schemaLoader.js";
import { handleUploadRequest } from "./uploads.js";

const schema = makeExecutableSchema({
  typeDefs: loadGraphqlTypeDefs(),
  resolvers,
});

const apolloServer = new ApolloServer({
  schema,
  csrfPrevention: true,
  introspection: process.env.NODE_ENV !== "production",
});

function toWebHeaders(headers: IncomingHttpHeaders): Headers {
  const result = new Headers();
  for (const [name, value] of Object.entries(headers)) {
    if (value === undefined) continue;
    result.set(name, Array.isArray(value) ? value.join(", ") : value);
  }
  return result;
}

const app = express();
app.disable("x-powered-by");

// Keep image upload streams out of express.json(); GraphQL and file transfer
// share the same origin and port, while upload authorization stays unchanged.
app.use((request, response, next) => {
  void handleUploadRequest(request, response)
    .then((handled) => {
      if (!handled) next();
    })
    .catch(next);
});

await apolloServer.start();
app.use(
  "/graphql",
  express.json({ limit: "1mb" }),
  expressMiddleware(apolloServer, {
    context: async ({ req }) => ({
      user: await authenticateRequest(toWebHeaders(req.headers)),
    }),
  }),
);

app.use((error: unknown, _request: Request, response: Response, _next: NextFunction) => {
  console.error("Request handler failed:", error);
  if (response.headersSent) return response.end();
  return response.status(500).json({ error: "Internal server error." });
});

const port = Number(process.env.API_PORT ?? 4000);
const httpServer = createServer(app);
httpServer.listen(port, "0.0.0.0", () => {
  console.log(`Funbike Apollo Server listening on http://0.0.0.0:${port}/graphql`);
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

let shuttingDown = false;
async function shutdown(signal: string) {
  if (shuttingDown) return;
  shuttingDown = true;
  console.log(`${signal} received; stopping API.`);
  httpServer.close(async () => {
    await apolloServer.stop();
    await closeDatabase();
    process.exit(0);
  });
}

process.once("SIGINT", () => void shutdown("SIGINT"));
process.once("SIGTERM", () => void shutdown("SIGTERM"));
