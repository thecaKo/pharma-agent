import http from "node:http";
import https from "node:https";
import fs from "node:fs";
import next from "next";
import { setupSyncScheduler } from "./src/server/sync-scheduler";
import { setupAgentWebsocketServer } from "./src/server/websocket";

const dev = process.env.NODE_ENV !== "production";
const hostname = process.env.HOST ?? "0.0.0.0";
const port = Number(process.env.PORT ?? 3000);
const httpsKeyFile = process.env.HTTPS_KEY_FILE;
const httpsCertFile = process.env.HTTPS_CERT_FILE;

async function main() {
  const app = next({ dev, hostname, port });
  const handle = app.getRequestHandler();

  await app.prepare();

  const requestHandler = (request: http.IncomingMessage, response: http.ServerResponse) => {
    handle(request, response);
  };
  const server = createServer(requestHandler);

  setupAgentWebsocketServer(server);
  setupSyncScheduler();

  server.listen(port, hostname, () => {
    const protocol = isHttpsEnabled() ? "https" : "http";
    console.log(`Pharma Panel disponivel em ${protocol}://${hostname}:${port}`);
  });
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});

function createServer(requestHandler: http.RequestListener) {
  if (!isHttpsEnabled()) {
    return http.createServer(requestHandler);
  }

  return https.createServer({
    key: fs.readFileSync(String(httpsKeyFile)),
    cert: fs.readFileSync(String(httpsCertFile))
  }, requestHandler);
}

function isHttpsEnabled() {
  return Boolean(httpsKeyFile && httpsCertFile);
}
