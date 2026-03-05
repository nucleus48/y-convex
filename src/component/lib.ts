import { v } from "convex/values";
import * as Y from "yjs";
import { internal } from "./_generated/api";
import {
  action,
  internalAction,
  internalMutation,
  internalQuery,
  mutation,
  query,
  type ActionCtx,
} from "./_generated/server";

const UPDATES_TRIM_THRESHOLD = 100;

export const init = action({
  args: {
    docId: v.string(),
    stateVector: v.bytes(),
  },
  returns: v.object({
    update: v.bytes(),
    serverStateVector: v.bytes(),
  }),
  handler: async (ctx, args) => {
    const { mergedUpdate, updates } = await getDocData(ctx, args.docId);

    if (updates.length >= UPDATES_TRIM_THRESHOLD) {
      await ctx.scheduler.runAfter(0, internal.lib.snapshotUpdates, {
        docId: args.docId,
      });
    }

    const update = Y.diffUpdate(mergedUpdate, new Uint8Array(args.stateVector));
    const serverStateVector = Y.encodeStateVectorFromUpdate(mergedUpdate);

    return {
      update: update.buffer as ArrayBuffer,
      serverStateVector: serverStateVector.buffer as ArrayBuffer,
    };
  },
});

export const push = mutation({
  args: {
    docId: v.string(),
    update: v.bytes(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const decoded = Y.decodeUpdate(new Uint8Array(args.update));

    if (decoded.structs.length) {
      await ctx.db.insert("update", args);
    }
  },
});

export const pull = query({
  args: {
    docId: v.string(),
  },
  returns: v.bytes(),
  handler: async (ctx, args) => {
    const updates = await ctx.db
      .query("update")
      .withIndex("by_doc_id", (q) => q.eq("docId", args.docId))
      .take(UPDATES_TRIM_THRESHOLD);

    const update = Y.mergeUpdates(updates.map((u) => new Uint8Array(u.update)));

    return update.buffer as ArrayBuffer;
  },
});

export const getData = internalQuery({
  args: {
    docId: v.string(),
  },
  returns: v.object({
    snapshots: v.array(
      v.object({
        _id: v.id("snapshot"),
        _creationTime: v.number(),
        docId: v.string(),
        fileId: v.id("_storage"),
      }),
    ),
    updates: v.array(
      v.object({
        _id: v.id("update"),
        _creationTime: v.number(),
        docId: v.string(),
        update: v.bytes(),
      }),
    ),
  }),
  handler: async (ctx, args) => {
    const [snapshots, updates] = await Promise.all([
      ctx.db
        .query("snapshot")
        .withIndex("by_doc_id", (q) => q.eq("docId", args.docId))
        .collect(),
      ctx.db
        .query("update")
        .withIndex("by_doc_id", (q) => q.eq("docId", args.docId))
        .collect(),
    ]);

    return { snapshots, updates };
  },
});

export const createSnapshot = internalMutation({
  args: {
    docId: v.string(),
    timestamp: v.number(),
    fileId: v.id("_storage"),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const [updatesToDelete, existingSnapshots] = await Promise.all([
      ctx.db
        .query("update")
        .withIndex("by_doc_id", (q) =>
          q.eq("docId", args.docId).lte("_creationTime", args.timestamp),
        )
        .collect(),
      ctx.db
        .query("snapshot")
        .withIndex("by_doc_id", (q) => q.eq("docId", args.docId))
        .collect(),
    ]);

    await Promise.all([
      ctx.db.insert("snapshot", {
        docId: args.docId,
        fileId: args.fileId,
      }),
      ...updatesToDelete.map((u) => ctx.db.delete("update", u._id)),
      ...existingSnapshots.map(async (s) => {
        await ctx.db.delete(s._id);
        await ctx.storage.delete(s.fileId);
      }),
    ]);
  },
});

export const snapshotUpdates = internalAction({
  args: {
    docId: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const { mergedUpdate, updates } = await getDocData(ctx, args.docId);

    const file = new Blob([mergedUpdate.buffer as ArrayBuffer]);
    const fileId = await ctx.storage.store(file);

    try {
      await ctx.runMutation(internal.lib.createSnapshot, {
        timestamp: updates[updates.length - 1]._creationTime,
        docId: args.docId,
        fileId,
      });
    } catch (e) {
      await ctx.storage.delete(fileId);
      throw e;
    }
  },
});

const getDocData = async (ctx: ActionCtx, docId: string) => {
  const { snapshots, updates } = await ctx.runQuery(internal.lib.getData, {
    docId,
  });

  const snapshotBuffers = await Promise.all(
    snapshots.map(async (s) => {
      const file = await ctx.storage.get(s.fileId);
      if (!file) return new Uint8Array();
      return new Uint8Array(await file.arrayBuffer());
    }),
  );

  const mergedUpdate = Y.mergeUpdates([
    ...snapshotBuffers,
    ...updates.map((u) => new Uint8Array(u.update)),
  ]);

  return { mergedUpdate, updates };
};
