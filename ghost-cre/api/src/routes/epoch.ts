import { Hono } from "hono";
import { state } from "../state.js";

const app = new Hono();

app.get("/epoch", (c) => {
  return c.json({
    epoch: state.currentEpoch,
    status: state.epochStatus,
  });
});

export default app;
