import { Hono } from "hono";
import { authenticate } from "../auth.js";
import { state } from "../state.js";

const app = new Hono();

app.post("/transactions", async (c) => {
  try {
    const body = await c.req.json();
    const { account, timestamp, auth, limit, cursor } = body;

    if (!account || !timestamp || !auth) {
      return c.json({ error: "Missing required fields" }, 400);
    }

    authenticate(
      "List Transactions",
      { account, timestamp },
      auth,
      account
    );

    const acctLower = account.toLowerCase();
    const maxResults = Math.min(Number(limit) || 10, 100);

    // Filter transactions for user
    const userTxs = state.transactions.filter(
      (tx) => tx.user === acctLower
    );

    // Simple cursor-based pagination using index
    let startIdx = 0;
    if (cursor) {
      const idx = userTxs.findIndex((tx) => tx.id === cursor);
      if (idx >= 0) startIdx = idx + 1;
    }

    const page = userTxs.slice(startIdx, startIdx + maxResults);
    const nextCursor =
      startIdx + maxResults < userTxs.length
        ? page[page.length - 1]?.id
        : undefined;

    return c.json({
      transactions: page.map((tx) => ({
        ...tx,
        amount: tx.amount.toString(),
      })),
      cursor: nextCursor,
    });
  } catch (err: any) {
    return c.json({ error: err.message }, 401);
  }
});

export default app;
