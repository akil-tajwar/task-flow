import type { Context } from "hono";
import { pushService } from "../services/push.service";
import {
  pushSubscribeSchema,
  pushUnsubscribeSchema,
} from "../validators/push.validator";

export const pushController = {
  async subscribe(c: Context) {
    const currentUser = c.get("user");
    const input = pushSubscribeSchema.parse(await c.req.json());

    const result = await pushService.subscribe(
      currentUser.tenantId,
      currentUser.id,
      input,
    );

    return c.json(result, 201);
  },

  async unsubscribe(c: Context) {
    const currentUser = c.get("user");
    const input = pushUnsubscribeSchema.parse(await c.req.json());

    const result = await pushService.unsubscribe(input.deviceId, currentUser.id);

    return c.json(result);
  },
};