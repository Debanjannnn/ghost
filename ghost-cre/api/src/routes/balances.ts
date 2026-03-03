import { Hono } from "hono";
import { authenticate, MESSAGE_TYPES } from "../auth.js";
import { state } from "../state.js";

const app = new Hono();

app.post("/balances", async (c) => {
  try {
    const body = await c.req.json();
    const { account, timestamp, auth } = body;

    if (!account || !timestamp || !auth) {
      return c.json({ error: "Missing required fields: account, timestamp, auth" }, 400);
    }

    authenticate(
      "Retrieve Balances",
      { account, timestamp },
      auth,
      account
    );

    const userBalances = state.getUserBalances(account);
    const balances: Record<string, string> = {};
    for (const [token, amount] of userBalances) {
      balances[token] = amount.toString();
    }

    return c.json({ account: account.toLowerCase(), balances });
  } catch (err: any) {
    return c.json({ error: err.message }, 401);
  }
});

export default app;
