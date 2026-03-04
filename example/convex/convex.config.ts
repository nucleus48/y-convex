import { defineApp } from "convex/server";
import yConvex from "@nucleus48/y-convex/convex.config.js";

const app = defineApp();
app.use(yConvex);

export default app;
