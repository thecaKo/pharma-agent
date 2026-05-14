import express from "express";
import { Server } from "node:http";
import { runDatabaseAutoDetect, runDatabaseDeepScan } from "../commands/firebird-files";
import { loadConfig, saveConfig } from "../config/local-config";
import { connectToPanel } from "../panel/client";
import { registerAgent } from "../panel/register";
import { LocalConfig } from "../types";
import { renderFirebirdDetection, renderHealth, renderSetupForm } from "./views";

type SetupServerOptions = {
  port: number;
  host: string;
};

export function startSetupServer(options: SetupServerOptions): Server {
  const app = express();

  app.use(express.urlencoded({ extended: false }));
  app.use(express.json());

  app.get("/", (_request, response) => {
    response.redirect("/setup");
  });

  app.get("/databases", (_request, response) => {
    response.redirect("/firebird");
  });

  app.get("/health", async (_request, response, next) => {
    try {
      response.type("html").send(renderHealth(await loadConfig()));
    } catch (error) {
      next(error);
    }
  });

  app.get("/setup", async (_request, response, next) => {
    try {
      response.type("html").send(renderSetupForm(await loadConfig()));
    } catch (error) {
      next(error);
    }
  });

  app.get("/firebird", async (request, response, next) => {
    try {
      const mode = request.query.mode === "deep" ? "deep" : "quick";
      const result = mode === "deep" ? await runDatabaseDeepScan() : await runDatabaseAutoDetect();
      response.type("html").send(renderFirebirdDetection(result));
    } catch (error) {
      response.type("html").send(renderFirebirdDetection({
        roots: [],
        files: [],
        error: error instanceof Error ? error.message : "Falha ao detectar bancos locais."
      }));
    }
  });

  app.post("/setup", async (request, response, next) => {
    try {
      const config = readSetupBody(request.body);
      const registration = await registerAgent(config);

      if (registration.success && registration.agentId) {
        const registeredConfig: LocalConfig & { agentId: string } = {
          ...config,
          agentId: registration.agentId,
          websocketUrl: registration.websocketUrl
        };
        await saveConfig(registeredConfig);
        connectToPanel(registeredConfig);
      }

      response.type("html").send(renderSetupForm(config, registration));
    } catch (error) {
      next(error);
    }
  });

  const server = app.listen(options.port, options.host, () => {
    console.log(`Setup local disponivel em http://${options.host}:${options.port}/setup`);
  });

  return server;
}

function readSetupBody(body: Record<string, unknown>): LocalConfig {
  return {
    agentName: readRequired(body.agentName, "nome do agente"),
    token: readRequired(body.token, "token")
  };
}

function readRequired(value: unknown, label: string): string {
  const normalized = typeof value === "string" ? value.trim() : "";
  if (!normalized) {
    throw new Error(`Campo obrigatorio ausente: ${label}`);
  }
  return normalized;
}
