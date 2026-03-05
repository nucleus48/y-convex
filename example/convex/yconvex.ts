import { exposeApi } from "@nucleus48/y-convex";
import { components } from "./_generated/api";

export const { init, push, pull } = exposeApi(components.yconvex);
