import { Inngest, EventSchemas } from "inngest";
import type { Events } from "./types";

/**
 * Inngest client for Phronesis.
 *
 * This client is typed with our event definitions to provide
 * type-safe event dispatch and function definitions.
 */
export const inngest = new Inngest({
  id: "phronesis",
  name: "Phronesis",
  schemas: new EventSchemas().fromRecord<Events>(),
});
