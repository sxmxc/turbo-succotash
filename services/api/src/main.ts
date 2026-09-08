import { configFor } from "../../../packages/service-runtime/src/config.js";
import {
  buildServer,
  databasePool,
  databaseReady,
  shutdown,
} from "../../../packages/service-runtime/src/server.js";
const config = configFor("api");
const pool = databasePool(config.API_DATABASE_URL, "application");
const app = buildServer("api", () => databaseReady(pool), config.LOG_LEVEL);
app.addHook("onClose", () => pool.end());
app.get("/v1/bootstrap", async () => ({
  milestone: 1,
  gameplay: true,
  authentication: true,
}));
shutdown(() => app.close());
await app.listen({ host: config.HOST, port: config.API_PORT });
