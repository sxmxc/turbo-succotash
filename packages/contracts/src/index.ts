import { z } from "zod";
export const protocolVersion = 2;
export const diagnosticSchema = z.object({
  service: z.enum(["identity", "api", "realtime"]),
  status: z.enum(["ok", "ready", "not_ready"]),
  version: z.string().regex(/^\d+\.\d+\.\d+$/),
  commit: z.string().min(1),
  protocol: z.literal(protocolVersion),
});
export type Diagnostic = z.infer<typeof diagnosticSchema>;
export const directionSchema = z.enum(["north", "west", "south", "east"]);
export const movementIntentSchema = z.object({
  dx: z.number().min(-1).max(1),
  dy: z.number().min(-1).max(1),
});
export const movementTargetSchema = z.object({
  x: z.number().finite(),
  y: z.number().finite(),
});
export const roomChatCommandSchema = z.object({
  clientRequestId: z.string().min(1).max(80),
  text: z.string().trim().min(1).max(280),
});
export const roomChatEventSchema = z.object({
  serverMessageId: z.string().uuid(),
  clientRequestId: z.string().min(1).max(80),
  senderId: z.string().min(1),
  senderName: z.string().min(1).max(40),
  timestamp: z.iso.datetime(),
  channel: z.literal("room"),
  text: z.string().min(1).max(280),
});
