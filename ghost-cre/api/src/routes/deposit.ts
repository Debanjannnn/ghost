import { Hono } from "hono";
import { authenticate } from "../auth.js";
import { state } from "../state.js";
import * as pool from "../pool.js";

const app = new Hono();

app.post("/deposit", async (c) => {
  try {
    const body = await c.req.json();
    const { account, token, amount, transactionId, timestamp, auth } = body;

    if (!account || !token || !amount || !transactionId || !timestamp || !auth) {
      return c.json({ error: "Missing required fields" }, 400);
    }

    authenticate(
      "Deposit to Pool",
      { account, token, amount, transactionId, timestamp },
      auth,
      account
    );

    const amountBn = BigInt(amount);
    if (amountBn <= 0n) return c.json({ error: "amount must be > 0" }, 400);

    // Prevent double-credit
    if (state.verifiedTransfers.has(transactionId)) {
      return c.json({ error: "Transaction already credited" }, 400);
    }

    // Verify the transfer actually arrived at pool
    const verified = await pool.verifyIncomingTransfer(account, amount, token);
    if (!verified) {
      return c.json({ error: "Transfer not found on external API" }, 400);
    }

    // Credit balance
    const ok = state.recordPoolDeposit(account, token, amountBn, transactionId);
    if (!ok) {
      return c.json({ error: "Failed to record deposit" }, 500);
    }

    // Record transaction
    state.addTransaction({
      id: crypto.randomUUID(),
      type: "deposit",
      user: account.toLowerCase(),
      token: token.toLowerCase(),
      amount: amountBn,
      timestamp: Math.floor(Date.now() / 1000),
      epoch: state.currentEpoch,
    });

    const balance = state.getBalance(account, token);

    return c.json({
      success: true,
      balance: balance.toString(),
    });
  } catch (err: any) {
    return c.json({ error: err.message }, 401);
  }
});

export default app;
