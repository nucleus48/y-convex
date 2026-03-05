import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  update: defineTable({
    docId: v.string(),
    update: v.bytes(),
  }).index("by_doc_id", ["docId"]),
  snapshot: defineTable({
    docId: v.string(),
    fileId: v.id("_storage"),
  }).index("by_doc_id", ["docId"]),
});
