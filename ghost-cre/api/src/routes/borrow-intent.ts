import { Hono } from "hono";
import { ethers } from "ethers";
import { authenticate } from "../auth.js";
import { state } from "../state.js";
import type { BorrowIntent } from "../types.js";

const app = new Hono();

app.post("/borrow-intent", async (c) => {
  try {
    const body = await c.req.json();
    const {
      account, borrowToken, amount, maxRate,
      collateralToken, collateralAmount, duration,
      timestamp, auth,
    } = body;

    if (!account || !borrowToken || !amount || maxRate === undefined ||
        !collateralToken || !collateralAmount || !duration || !timestamp || !auth) {
      return c.json({ error: "Missing required fields" }, 400);
    }

    authenticate(
      "Submit Borrow Intent",
      { account, borrowToken, amount, maxRate, collateralToken, collateralAmount, duration, timestamp },
      auth,
      account
    );

    const amountBn = BigInt(amount);
    const collAmountBn = BigInt(collateralAmount);
    const maxRateNum = Number(maxRate);
    const durationNum = Number(duration);

    if (amountBn <= 0n) return c.json({ error: "amount must be > 0" }, 400);
    if (maxRateNum <= 0) return c.json({ error: "maxRate must be > 0" }, 400);
    if (collAmountBn <= 0n) return c.json({ error: "collateralAmount must be > 0" }, 400);

    // Check collateral balance
    const bal = state.getBalance(account, collateralToken);
    if (bal < collAmountBn) {
      return c.json({ error: "Insufficient collateral balance" }, 400);
    }

    const intentHash = ethers.solidityPackedKeccak256(
      ["address", "address", "uint256", "uint256", "address", "uint256", "uint256", "uint256"],
      [account, borrowToken, amountBn, maxRateNum, collateralToken, collAmountBn, durationNum, state.currentEpoch]
    );

    const intent: BorrowIntent = {
      borrower: account.toLowerCase(),
      borrowToken: borrowToken.toLowerCase(),
      amount: amountBn,
      maxRate: maxRateNum,
      collateralToken: collateralToken.toLowerCase(),
      collateralAmount: collAmountBn,
      duration: durationNum,
      epoch: state.currentEpoch,
      intentHash,
    };

    state.addBorrowIntent(intent);

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
