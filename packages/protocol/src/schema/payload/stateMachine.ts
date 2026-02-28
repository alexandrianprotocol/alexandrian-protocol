/**
 * State Machine KB payload schema (minimal)
 */
import { z } from "zod";

export const stateMachinePayloadSchema = z.object({
  type: z.literal("stateMachine"),
  states: z.array(z.unknown()),
  transitions: z.array(z.unknown()),
  invariants: z.array(z.unknown()),
});

export type StateMachinePayload = z.infer<typeof stateMachinePayloadSchema>;
