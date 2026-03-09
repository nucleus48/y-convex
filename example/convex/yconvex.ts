import { exposeApi } from "y-convex";
import { components } from "./_generated/api";

export const { init, push, pull } = exposeApi(components.yconvex);
