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
  () => databaseReady(pool, "007"),
  config.LOG_LEVEL,
);
app.addHook("onClose", () => pool.end());
type User = { id: string; name: string };
const allowedTints = new Set([0xefd6a2, 0xaadbc4, 0xc3b3e5]);
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
function pair(left: string, right: string) {
  return left < right ? ([left, right] as const) : ([right, left] as const);
}
function directMessageView(row: Record<string, unknown>) {
  return {
    serverMessageId: row.id,
    clientRequestId: row.client_request_id,
    senderId: row.sender_user_id,
    senderName: row.sender_display_name,
    recipientId: row.recipient_user_id,
    timestamp: row.created_at,
    deliveredAt: row.delivered_at,
    readAt: row.read_at,
    channel: "direct" as const,
    text: row.content,
  };
}
async function canMessage(senderId: string, recipientId: string) {
  const [low, high] = pair(senderId, recipientId);
  const result = await pool.query(
    "SELECT 1 FROM friendship WHERE user_low_id=$1 AND user_high_id=$2 AND status='accepted'",
    [low, high],
  );
  return Boolean(result.rowCount);
}
function requireRealtime(request: { headers: Record<string, unknown> }) {
  if (
    request.headers["x-realtime-internal-token"] !==
    config.REALTIME_INTERNAL_TOKEN
  )
    throw Object.assign(new Error("UNAUTHENTICATED"), { statusCode: 401 });
}
async function socialView(userId: string) {
  const result = await pool.query(
    `SELECT CASE WHEN user_low_id=$1 THEN user_high_id ELSE user_low_id END AS user_id,
            status, requested_by_user_id, display_name,
            (online = true AND user_presence.updated_at > now() - interval '40 seconds') AS online,
            room_address
       FROM friendship
       LEFT JOIN user_presence ON user_presence.user_id=CASE WHEN user_low_id=$1 THEN user_high_id ELSE user_low_id END
      WHERE user_low_id=$1 OR user_high_id=$1
      ORDER BY friendship.updated_at DESC`,
    [userId],
  );
  return result.rows.map((row) => ({
    userId: row.user_id,
    name: row.display_name ?? "Unknown player",
    status: row.status,
    requestedByUserId: row.requested_by_user_id,
    online: row.online === true,
    roomAddress: row.online === true ? row.room_address : undefined,
  }));
}
async function allocateApartment(user: User) {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await client.query("SELECT pg_advisory_xact_lock(285001)");
    const existing = await client.query(
      "SELECT * FROM room WHERE owner_user_id=$1 AND is_apartment=true",
      [user.id],
    );
    if (existing.rowCount) {
      await client.query("COMMIT");
      return existing.rows[0];
    }
    const next = await client.query(
      "SELECT floor_number,room_number FROM room WHERE floor_number>=1 ORDER BY floor_number DESC,room_number DESC LIMIT 1",
    );
    let floor = 1;
    let room = 1;
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
    const created = await client.query(
      "INSERT INTO room(id,floor_number,room_number,template_id,owner_user_id,name,capacity,is_apartment) VALUES($1,$2,$3,$4,$5,$6,20,true) RETURNING *",
      [
        randomUUID(),
        floor,
        room,
        "templates/appartment_template/default",
        user.id,
        `${user.name}'s Apartment`,
      ],
    );
    await client.query("COMMIT");
    return created.rows[0];
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}
app.get("/v1/appearance", async (request) => {
  const user = await requireUser(request.headers.cookie);
  const result = await pool.query(
    "SELECT shirt_tint FROM avatar_appearance WHERE user_id=$1",
    [user.id],
  );
  return { shirtTint: result.rows[0]?.shirt_tint ?? 0xefd6a2 };
});
app.put<{ Body: { shirtTint?: unknown } }>(
  "/v1/appearance",
  async (request, reply) => {
    const user = await requireUser(request.headers.cookie);
    const shirtTint = request.body?.shirtTint;
    if (typeof shirtTint !== "number" || !allowedTints.has(shirtTint))
      return reply.code(400).send({ code: "INVALID_APPEARANCE" });
    await pool.query(
      `INSERT INTO avatar_appearance(user_id,shirt_tint) VALUES($1,$2)
       ON CONFLICT (user_id) DO UPDATE SET shirt_tint=EXCLUDED.shirt_tint,updated_at=now()`,
      [user.id, shirtTint],
    );
    return { shirtTint };
  },
);
app.get("/v1/social/friends", async (request) => {
  const user = await requireUser(request.headers.cookie);
  return { friends: await socialView(user.id) };
});
app.get("/v1/direct-messages", async (request) => {
  const user = await requireUser(request.headers.cookie);
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await client.query(
      `UPDATE direct_message
          SET delivered_at=COALESCE(delivered_at,now())
        WHERE recipient_user_id=$1 AND delivered_at IS NULL`,
      [user.id],
    );
    const result = await client.query(
      `SELECT * FROM (
         SELECT * FROM direct_message
          WHERE sender_user_id=$1 OR recipient_user_id=$1
          ORDER BY created_at DESC LIMIT 200
       ) recent ORDER BY created_at`,
      [user.id],
    );
    const ids = result.rows.map((row) => row.id);
    const reactionRows = ids.length
      ? (
          await client.query(
            "SELECT message_id,user_id,emoji FROM direct_message_reaction WHERE message_id=ANY($1::uuid[])",
            [ids],
          )
        ).rows
      : [];
    await client.query("COMMIT");
    const reactions: Record<string, Record<string, string[]>> = {};
    for (const row of reactionRows) {
      const message = (reactions[row.message_id] ??= {});
      (message[row.emoji] ??= []).push(row.user_id);
    }
    return { messages: result.rows.map(directMessageView), reactions };
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
});
app.post<{ Params: { userId: string } }>(
  "/v1/social/friends/:userId",
  async (request, reply) => {
    const user = await requireUser(request.headers.cookie);
    const target = request.params.userId;
    if (!target || target === user.id)
      return reply.code(400).send({ code: "INVALID_FRIEND" });
    const [low, high] = pair(user.id, target);
    const existing = await pool.query(
      "SELECT * FROM friendship WHERE user_low_id=$1 AND user_high_id=$2",
      [low, high],
    );
    if (!existing.rowCount)
      await pool.query(
        "INSERT INTO friendship(user_low_id,user_high_id,requested_by_user_id,status) VALUES($1,$2,$3,'pending')",
        [low, high, user.id],
      );
    else if (
      existing.rows[0].status === "pending" &&
      existing.rows[0].requested_by_user_id === target
    )
      await pool.query(
        "UPDATE friendship SET status='accepted',updated_at=now() WHERE user_low_id=$1 AND user_high_id=$2",
        [low, high],
      );
    return reply.code(201).send({ friends: await socialView(user.id) });
  },
);
app.post<{ Params: { userId: string } }>(
  "/v1/social/friends/:userId/accept",
  async (request, reply) => {
    const user = await requireUser(request.headers.cookie);
    const [low, high] = pair(user.id, request.params.userId);
    const result = await pool.query(
      `UPDATE friendship SET status='accepted',updated_at=now()
      WHERE user_low_id=$1 AND user_high_id=$2 AND status='pending' AND requested_by_user_id<>$3`,
      [low, high, user.id],
    );
    if (!result.rowCount)
      return reply.code(404).send({ code: "FRIEND_REQUEST_NOT_FOUND" });
    return { friends: await socialView(user.id) };
  },
);
app.put<{
  Body: {
    userId?: unknown;
    name?: unknown;
    roomId?: unknown;
    address?: unknown;
    online?: unknown;
  };
}>("/internal/presence", async (request, reply) => {
  requireRealtime(request);
  const body = request.body;
  if (
    typeof body?.userId !== "string" ||
    typeof body.name !== "string" ||
    typeof body.roomId !== "string" ||
    typeof body.address !== "string" ||
    typeof body.online !== "boolean"
  )
    return reply.code(400).send({ code: "INVALID_PRESENCE" });
  await pool.query(
    `INSERT INTO user_presence(user_id,display_name,room_id,room_address,online) VALUES($1,$2,$3,$4,$5)
       ON CONFLICT (user_id) DO UPDATE SET display_name=EXCLUDED.display_name,room_id=EXCLUDED.room_id,room_address=EXCLUDED.room_address,online=EXCLUDED.online,updated_at=now()`,
    [body.userId, body.name, body.roomId, body.address, body.online],
  );
  return { ok: true };
});
app.post<{ Body: { senderId?: unknown; recipientId?: unknown } }>(
  "/internal/social/can-message",
  async (request, reply) => {
    requireRealtime(request);
    const { senderId, recipientId } = request.body ?? {};
    if (typeof senderId !== "string" || typeof recipientId !== "string")
      return reply.code(400).send({ allowed: false });
    return { allowed: await canMessage(senderId, recipientId) };
  },
);
app.post<{
  Body: {
    clientRequestId?: unknown;
    senderId?: unknown;
    senderName?: unknown;
    recipientId?: unknown;
    text?: unknown;
    delivered?: unknown;
  };
}>("/internal/direct-messages", async (request, reply) => {
  requireRealtime(request);
  const body = request.body ?? {};
  if (
    typeof body.clientRequestId !== "string" ||
    body.clientRequestId.length < 1 ||
    body.clientRequestId.length > 80 ||
    typeof body.senderId !== "string" ||
    typeof body.senderName !== "string" ||
    body.senderName.length < 1 ||
    body.senderName.length > 40 ||
    typeof body.recipientId !== "string" ||
    body.recipientId === body.senderId ||
    typeof body.text !== "string" ||
    body.text.trim().length < 1 ||
    body.text.trim().length > 280 ||
    typeof body.delivered !== "boolean"
  )
    return reply.code(400).send({ code: "INVALID_DIRECT_MESSAGE" });
  if (!(await canMessage(body.senderId, body.recipientId)))
    return reply.code(403).send({ code: "DIRECT_MESSAGE_NOT_ALLOWED" });
  const result = await pool.query(
    `INSERT INTO direct_message(
       id,client_request_id,sender_user_id,sender_display_name,recipient_user_id,content,delivered_at
     ) VALUES($1,$2,$3,$4,$5,$6,CASE WHEN $7 THEN now() ELSE NULL END)
     ON CONFLICT (sender_user_id,client_request_id) DO UPDATE
       SET client_request_id=EXCLUDED.client_request_id
     RETURNING *`,
    [
      randomUUID(),
      body.clientRequestId,
      body.senderId,
      body.senderName,
      body.recipientId,
      body.text.trim(),
      body.delivered,
    ],
  );
  return reply.code(201).send(directMessageView(result.rows[0]));
});
app.put<{ Params: { messageId: string }; Body: { readerId?: unknown } }>(
  "/internal/direct-messages/:messageId/read",
  async (request, reply) => {
    requireRealtime(request);
    if (typeof request.body?.readerId !== "string")
      return reply.code(400).send({ code: "INVALID_READER" });
    const result = await pool.query(
      `UPDATE direct_message
          SET delivered_at=COALESCE(delivered_at,now()),read_at=COALESCE(read_at,now())
        WHERE id::text=$1 AND recipient_user_id=$2
        RETURNING sender_user_id,read_at`,
      [request.params.messageId, request.body.readerId],
    );
    if (!result.rowCount)
      return reply.code(404).send({ code: "DIRECT_MESSAGE_NOT_FOUND" });
    return {
      messageId: request.params.messageId,
      senderId: result.rows[0].sender_user_id,
      readerId: request.body.readerId,
      readAt: result.rows[0].read_at,
    };
  },
);
app.put<{
  Params: { messageId: string };
  Body: { userId?: unknown; emoji?: unknown; active?: unknown };
}>("/internal/direct-messages/:messageId/reaction", async (request, reply) => {
  requireRealtime(request);
  const { userId, emoji, active } = request.body ?? {};
  if (
    typeof userId !== "string" ||
    typeof emoji !== "string" ||
    emoji.length < 1 ||
    emoji.length > 16 ||
    typeof active !== "boolean"
  )
    return reply.code(400).send({ code: "INVALID_REACTION" });
  const participant = await pool.query(
    "SELECT sender_user_id,recipient_user_id FROM direct_message WHERE id::text=$1 AND (sender_user_id=$2 OR recipient_user_id=$2)",
    [request.params.messageId, userId],
  );
  if (!participant.rowCount)
    return reply.code(404).send({ code: "DIRECT_MESSAGE_NOT_FOUND" });
  if (active)
    await pool.query(
      "INSERT INTO direct_message_reaction(message_id,user_id,emoji) VALUES($1,$2,$3) ON CONFLICT DO NOTHING",
      [request.params.messageId, userId, emoji],
    );
  else
    await pool.query(
      "DELETE FROM direct_message_reaction WHERE message_id::text=$1 AND user_id=$2 AND emoji=$3",
      [request.params.messageId, userId, emoji],
    );
  return {
    ok: true,
    recipientId:
      participant.rows[0].sender_user_id === userId
        ? participant.rows[0].recipient_user_id
        : participant.rows[0].sender_user_id,
  };
});
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
        "SELECT * FROM room WHERE (NOT is_private OR owner_user_id=$1) AND NOT is_apartment ORDER BY floor_number,room_number",
        [user.id],
      )
    ).rows.map(view),
  };
});
app.get<{ Params: { destination: string } }>(
  "/v1/rooms/resolve/:destination",
  async (request, reply) => {
    const user = await requireUser(request.headers.cookie);
    const destination = request.params.destination;
    if (destination === "player_appartment")
      return view(await allocateApartment(user));
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
    if (
      !result.rowCount ||
      (result.rows[0].is_apartment && result.rows[0].owner_user_id !== user.id)
    )
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
    const user = await requireUser(request.headers.cookie);
    const match = /^F(\d{3})-R(\d{3})$/.exec(request.params.address);
    if (!match) return reply.code(404).send({ code: "ROOM_NOT_FOUND" });
    const room = (
      await pool.query(
        "SELECT * FROM room WHERE floor_number=$1 AND room_number=$2",
        [Number(match[1]), Number(match[2])],
      )
    ).rows[0];
    if (!room || (room.is_apartment && room.owner_user_id !== user.id))
      return reply.code(404).send({ code: "ROOM_NOT_FOUND" });
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
