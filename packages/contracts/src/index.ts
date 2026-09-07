import { z } from "zod";
export const protocolVersion = 1;
export const diagnosticSchema = z.object({
  service: z.enum(["identity", "api", "realtime"]),
  status: z.enum(["ok", "ready", "not_ready"]),
  version: z.string().regex(/^\d+\.\d+\.\d+$/),
  commit: z.string().min(1),
  protocol: z.literal(protocolVersion),
});
export type Diagnostic = z.infer<typeof diagnosticSchema>;
