import { Hono } from "hono";
import { ethers } from "ethers";
import { authenticate } from "../auth.js";
import { state } from "../state.js";
import type { LendIntent } from "../types.js";

const app = new Hono();

app.post("/lend-intent", async (c) => {
  try {
    const body = await c.req.json();
    const { account, token, amount, minRate, tranche, duration, timestamp, auth } = body;

    if (!account || !token || !amount || minRate === undefined || !tranche || !duration || !timestamp || !auth) {
      return c.json({ error: "Missing required fields" }, 400);
    }

    authenticate(
      "Submit Lend Intent",
      { account, token, amount, minRate, tranche, duration, timestamp },
      auth,
      account
    );

    const amountBn = BigInt(amount);
    const minRateNum = Number(minRate);
    const durationNum = Number(duration);

    // Validate
    if (amountBn <= 0n) return c.json({ error: "amount must be > 0" }, 400);
    if (tranche !== "senior" && tranche !== "junior") {
      return c.json({ error: "tranche must be 'senior' or 'junior'" }, 400);
    }
    if (minRateNum <= 0) return c.json({ error: "minRate must be > 0" }, 400);

    // Check balance
    const bal = state.getBalance(account, token);
    if (bal < amountBn) {
      return c.json({ error: "Insufficient balance" }, 400);
    }

    const intentHash = ethers.solidityPackedKeccak256(
      ["address", "address", "uint256", "uint256", "string", "uint256", "uint256"],
      [account, token, amountBn, minRateNum, tranche, durationNum, state.currentEpoch]
    );

    const intent: LendIntent = {
      lender: account.toLowerCase(),
      token: token.toLowerCase(),
      amount: amountBn,
      minRate: minRateNum,
      tranche: tranche as "senior" | "junior",
      duration: durationNum,
      epoch: state.currentEpoch,
      intentHash,
    };

    state.addLendIntent(intent);

    return c.json({
      success: true,
      epoch: state.currentEpoch,
      intentHash,
    });
  } catch (err: any) {
    return c.json({ error: err.message }, 401);
  }
});

export default app;
