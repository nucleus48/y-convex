import { v } from "convex/values";
import type { ComponentApi } from "../component/_generated/component";
import { action, mutation, query } from "../component/_generated/server";

export const exposeApi = (component: ComponentApi) => {
  const init = action({
    args: {
      docId: v.string(),
      stateVector: v.bytes(),
    },
    returns: v.object({ serverStateVector: v.bytes(), update: v.bytes() }),
    handler: (ctx, args) => {
      return ctx.runAction(component.lib.init, args);
    },
  });

  const push = mutation({
    args: {
      docId: v.string(),
      update: v.bytes(),
    },
    returns: v.null(),
    handler: (ctx, args) => {
      return ctx.runMutation(component.lib.push, args);
    },
  });

  const pull = query({
    args: {
      docId: v.string(),
    },
    returns: v.bytes(),
    handler: (ctx, args) => {
      return ctx.runQuery(component.lib.pull, args);
    },
  });

  return {
    init,
    push,
    pull,
  };
};
