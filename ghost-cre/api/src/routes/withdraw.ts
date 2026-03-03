import { Hono } from "hono";
import { authenticate } from "../auth.js";
import { state } from "../state.js";
import * as pool from "../pool.js";

const app = new Hono();

app.post("/withdraw", async (c) => {
  try {
    const body = await c.req.json();
    const { account, token, amount, timestamp, auth } = body;

    if (!account || !token || !amount || !timestamp || !auth) {
      return c.json({ error: "Missing required fields" }, 400);
    }

    authenticate(
      "Withdraw Tokens",
      { account, token, amount, timestamp },
      auth,
      account
    );

    const amountBn = BigInt(amount);
    if (amountBn <= 0n) return c.json({ error: "amount must be > 0" }, 400);

    // Check balance
    const bal = state.getBalance(account, token);
    if (bal < amountBn) {
      return c.json({ error: "Insufficient balance" }, 400);
    }

    // Debit balance
    const ok = state.debitBalance(account, token, amountBn);
    if (!ok) {
      return c.json({ error: "Debit failed" }, 500);
    }

    // Transfer from pool to user via external API
    await pool.transferFromPool(account, token, amount);

    // Record transaction
    state.addTransaction({
      id: crypto.randomUUID(),
      type: "withdraw",
      user: account.toLowerCase(),
      token: token.toLowerCase(),
      amount: amountBn,
      timestamp: Math.floor(Date.now() / 1000),
      epoch: state.currentEpoch,
    });

    return c.json({
      success: true,
      message: "Tokens returned to your external API balance",
      amount: amountBn.toString(),
      token,
    });
  } catch (err: any) {
    return c.json({ error: err.message }, 401);
  }
});

export default app;
