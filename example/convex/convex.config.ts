import { defineApp } from "convex/server";
import yconvex from "@nucleus48/y-convex/convex.config";

const app = defineApp();
app.use(yconvex);

export default app;
