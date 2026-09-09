import {
  randomBytes,
  randomUUID,
  scryptSync,
  timingSafeEqual,
} from "node:crypto";
import { configFor } from "../../../packages/service-runtime/src/config.js";
import {
  buildServer,
  databasePool,
  databaseReady,
  shutdown,
} from "../../../packages/service-runtime/src/server.js";
const config = configFor("api");
const pool = databasePool(config.API_DATABASE_URL, "application");
const app = buildServer(
  "api",
  () => databaseReady(pool, "004"),
  config.LOG_LEVEL,
);
app.addHook("onClose", () => pool.end());
type User = { id: string; name: string };
async function requireUser(cookie?: string): Promise<User> {
  if (!cookie)
    throw Object.assign(new Error("UNAUTHENTICATED"), { statusCode: 401 });
  const response = await fetch(
    `${config.IDENTITY_INTERNAL_URL}/identity/auth/get-session`,
    { headers: { cookie }, signal: AbortSignal.timeout(1800) },
  );
  const body = response.ok ? await response.json() : undefined;
  if (typeof body?.user?.id !== "string" || typeof body.user.name !== "string")
    throw Object.assign(new Error("UNAUTHENTICATED"), { statusCode: 401 });
  return body.user;
}
function view(row: Record<string, unknown>) {
  return {
    id: row.id,
    floor: row.floor_number,
    room: row.room_number,
    address: `F${String(row.floor_number).padStart(3, "0")}-R${String(row.room_number).padStart(3, "0")}`,
    templateId: row.template_id,
    name: row.name,
    private: row.is_private,
    capacity: row.capacity,
  };
}
app.get("/v1/rooms/entry", async (request) => {
  await requireUser(request.headers.cookie);
  return view(
    (
      await pool.query(
        "SELECT * FROM room WHERE floor_number=0 AND room_number=0",
      )
    ).rows[0],
  );
});
app.get("/v1/rooms", async (request) => {
  const user = await requireUser(request.headers.cookie);
  return {
    rooms: (
      await pool.query(
        "SELECT * FROM room WHERE NOT is_private OR owner_user_id=$1 ORDER BY floor_number,room_number",
        [user.id],
      )
    ).rows.map(view),
  };
});
app.get<{ Params: { destination: string } }>(
  "/v1/rooms/resolve/:destination",
  async (request, reply) => {
    await requireUser(request.headers.cookie);
    const destination = request.params.destination;
    const address = /^F(\d{3})-R(\d{3})$/.exec(destination);
    const result = address
      ? await pool.query(
          "SELECT * FROM room WHERE floor_number=$1 AND room_number=$2",
          [Number(address[1]), Number(address[2])],
        )
      : await pool.query(
          "SELECT * FROM room WHERE id::text=$1 OR (owner_user_id IS NULL AND template_id=$1) LIMIT 1",
          [destination],
        );
    if (!result.rowCount)
      return reply.code(404).send({ code: "ROOM_NOT_FOUND" });
    return view(result.rows[0]);
  },
);
app.post<{ Body: { name?: unknown; private?: unknown; password?: unknown } }>(
  "/v1/rooms",
  async (request, reply) => {
    const user = await requireUser(request.headers.cookie);
    const name =
      typeof request.body?.name === "string" ? request.body.name.trim() : "";
    const isPrivate = request.body?.private === true;
    const password =
      typeof request.body?.password === "string" ? request.body.password : "";
    if (
      !name ||
      name.length > 80 ||
      (isPrivate && (password.length < 8 || password.length > 128))
    )
      return reply.code(400).send({ code: "INVALID_ROOM" });
    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      await client.query("SELECT pg_advisory_xact_lock(285001)");
      const next = await client.query(
        "SELECT floor_number,room_number FROM room WHERE floor_number>=1 ORDER BY floor_number DESC,room_number DESC LIMIT 1",
      );
      let floor = 1,
        room = 1;
      if (next.rowCount) {
        floor = next.rows[0].floor_number;
        room = next.rows[0].room_number + 1;
        if (room > 500) {
          floor++;
          room = 1;
        }
      }
      if (!next.rowCount || room === 1)
        await client.query(
          "INSERT INTO room(id,floor_number,room_number,template_id,name,capacity) VALUES($1,$2,0,$3,$4,20) ON CONFLICT (floor_number,room_number) DO NOTHING",
          [
            randomUUID(),
            floor,
            "templates/lobby_template/default",
            `Floor ${floor} Lobby`,
          ],
        );
      const salt = isPrivate ? randomBytes(16) : null;
      const hash = salt ? scryptSync(password, salt, 32) : null;
      const created = await client.query(
        "INSERT INTO room(id,floor_number,room_number,template_id,owner_user_id,name,is_private,password_hash,password_salt,capacity) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,20) RETURNING *",
        [
          randomUUID(),
          floor,
          room,
          "templates/small_room_template/default",
          user.id,
          name,
          isPrivate,
          hash,
          salt,
        ],
      );
      await client.query("COMMIT");
      return reply.code(201).send(view(created.rows[0]));
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  },
);
app.post<{ Params: { address: string }; Body: { password?: unknown } }>(
  "/v1/rooms/:address/admission",
  async (request, reply) => {
    await requireUser(request.headers.cookie);
    const match = /^F(\d{3})-R(\d{3})$/.exec(request.params.address);
    if (!match) return reply.code(404).send({ code: "ROOM_NOT_FOUND" });
    const room = (
      await pool.query(
        "SELECT * FROM room WHERE floor_number=$1 AND room_number=$2",
        [Number(match[1]), Number(match[2])],
      )
    ).rows[0];
    if (!room) return reply.code(404).send({ code: "ROOM_NOT_FOUND" });
    if (room.is_private) {
      const password =
        typeof request.body?.password === "string" ? request.body.password : "";
      const hash = scryptSync(password, room.password_salt, 32);
      if (!timingSafeEqual(hash, room.password_hash))
        return reply.code(403).send({ code: "ROOM_PASSWORD_INVALID" });
    }
    return view(room);
  },
);
shutdown(() => app.close());
await app.listen({ host: config.HOST, port: config.API_PORT });
