import {
  Server,
  createRouter,
  createEndpoint,
  matchMaker,
} from "@colyseus/core";
import { WebSocketTransport } from "@colyseus/ws-transport";
import { configFor } from "../../../packages/service-runtime/src/config.js";
import {
  diagnostic,
  dependencyReady,
  shutdown,
} from "../../../packages/service-runtime/src/server.js";
import { createGameRoom } from "./lobby.js";

const config = configFor("realtime");

let listening = false;
matchMaker.controller.DEFAULT_CORS_HEADERS["Access-Control-Allow-Origin"] =
  config.PUBLIC_ORIGIN;
matchMaker.controller.getCorsHeaders = () => ({
  "Access-Control-Allow-Origin": config.PUBLIC_ORIGIN,
});

const realtime = new Server({
  transport: new WebSocketTransport(),
  gracefullyShutdown: false,
  greet: false,
});

realtime
  .define(
    "room",
    createGameRoom(
      config.IDENTITY_INTERNAL_URL,
      config.API_INTERNAL_URL,
      config.REALTIME_INTERNAL_TOKEN,
    ),
  )
  .filterBy(["address"]);
// Protocol 2 clients joined the singleton `lobby` room without an address.
// Keep that route as a Floor 0 compatibility alias throughout the 0.2.x line.
realtime.define(
  "lobby",
  createGameRoom(
    config.IDENTITY_INTERNAL_URL,
    config.API_INTERNAL_URL,
    config.REALTIME_INTERNAL_TOKEN,
  ),
);
realtime.router = createRouter({
  health: createEndpoint("/healthz", { method: "GET" }, async () =>
    Response.json(diagnostic("realtime", "ok")),
  ),
  ready: createEndpoint("/readyz", { method: "GET" }, async () => {
    try {
      if (!listening) throw new Error("Transport not listening");
      await Promise.all([
        dependencyReady(config.API_INTERNAL_URL, "api"),
        dependencyReady(config.IDENTITY_INTERNAL_URL, "identity"),
      ]);
      return Response.json(diagnostic("realtime", "ready"));
    } catch {
      return Response.json(diagnostic("realtime", "not_ready"), {
        status: 503,
      });
    }
  }),
});
// Colyseus owns its HTTP router; do not attach competing Fastify request listeners.
// No joinable rooms until authenticated admission is implemented in Milestone 1.
shutdown(async () => {
  listening = false;
  await realtime.gracefullyShutdown(false);
});

await realtime.listen(config.REALTIME_PORT, config.HOST);
listening = true;
console.log(
  JSON.stringify({
    level: "info",
    message: "Realtime transport listening",
    port: config.REALTIME_PORT,
  }),
);
