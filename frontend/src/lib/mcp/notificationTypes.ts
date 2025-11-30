import {
    NotificationSchema as BaseNotificationSchema,
    ClientNotificationSchema,
    ServerNotificationSchema,
  } from "@modelcontextprotocol/sdk/types.js";
  import type { SchemaOutput } from "@modelcontextprotocol/sdk/server/zod-compat.js";
  
  export const NotificationSchema = ClientNotificationSchema.or(
    ServerNotificationSchema,
  ).or(BaseNotificationSchema);
  
  // @ts-ignore - Type instantiation is excessively deep, but the type is correct at runtime
  export type Notification = SchemaOutput<typeof NotificationSchema>;
  