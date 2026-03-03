import { Hono } from "hono";
import { config } from "../config.js";
import { state } from "../state.js";
import { runAuction } from "../auction.js";
import { recordDefault } from "../credit.js";
import * as pool from "../pool.js";

const app = new Hono();

const ETH_PRICE_USD = 2000n;

function serializeBigInts(obj: any): any {
  if (typeof obj === "bigint") return obj.toString();
  if (Array.isArray(obj)) return obj.map(serializeBigInts);
  if (obj && typeof obj === "object") {
    const out: any = {};
    for (const [k, v] of Object.entries(obj)) {
      out[k] = serializeBigInts(v);
    }
    return out;
  }
  return obj;
}

function checkApiKey(c: any): boolean {
  const key = c.req.header("x-api-key");
  if (!config.API_KEY || key !== config.API_KEY) {
    return false;
  }
  return true;
}

app.post("/internal/run-auction", async (c) => {
  if (!checkApiKey(c)) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  // Swap buffers: move current intents to previous, clear current
  state.swapBuffers();
  state.epochStatus = "settling";

  const { lends, borrows } = state.previousIntents;
  const result = runAuction(lends, borrows);

  // Disburse matched loans via external API
  for (const loan of result.loans) {
    try {
      // Transfer borrow amount from pool to borrower
      await pool.transferFromPool(
        loan.borrower,
        loan.borrowToken,
        loan.borrowAmount.toString()
      );

      // Lock collateral: debit from borrower balance (stays in pool, tracked in loan)
      state.debitBalance(loan.borrower, loan.collateralToken, loan.collateralAmount);

      // Debit lend capital from lender balances
      // (lenders already have balance credited from deposit)
      // Loans are created by auction from available lend capital

      // Register loan
      state.activeLoans.set(loan.loanHash, loan);

      state.addTransaction({
        id: crypto.randomUUID(),
        type: "borrow",
        user: loan.borrower.toLowerCase(),
        token: loan.borrowToken.toLowerCase(),
        amount: loan.borrowAmount,
        timestamp: Math.floor(Date.now() / 1000),
        epoch: state.currentEpoch,
      });
    } catch (err: any) {
      console.error(`Failed to disburse loan ${loan.loanHash}:`, err.message);
    }
  }

  // Advance epoch
  state.advanceEpoch();

  return c.json(serializeBigInts(result));
});

app.post("/internal/check-loans", async (c) => {
  if (!checkApiKey(c)) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  const loans: any[] = [];
  const unhealthy: any[] = [];

  for (const [hash, loan] of state.activeLoans) {
    if (!loan.active) continue;

    const collValueUsd = loan.collateralAmount * ETH_PRICE_USD;
    const debtValueUsd = loan.borrowAmount;
    const healthRatioBps =
      debtValueUsd > 0n ? (collValueUsd * 10000n) / debtValueUsd : 99999n;

    const loanInfo = {
      ...serializeBigInts(loan),
      healthRatioBps: healthRatioBps.toString(),
    };

    loans.push(loanInfo);

    if (healthRatioBps < 15000n) {
      unhealthy.push(loanInfo);
    }
  }

  // Auto-liquidate unhealthy loans: seize collateral in state, redistribute to lenders
  for (const loanInfo of unhealthy) {
    const loan = state.activeLoans.get(loanInfo.loanHash);
    if (!loan || !loan.active) continue;

    loan.active = false;

    // Collateral already locked in pool — redistribute to lenders via state
    if (loan.lender !== "aggregate") {
      state.creditBalance(loan.lender, loan.collateralToken, loan.collateralAmount);
    }

    recordDefault(loan.borrower);

    state.addTransaction({
      id: crypto.randomUUID(),
      type: "liquidation",
      user: loan.borrower.toLowerCase(),
      token: loan.collateralToken.toLowerCase(),
      amount: loan.collateralAmount,
      timestamp: Math.floor(Date.now() / 1000),
      epoch: state.currentEpoch,
    });
  }

  return c.json({ loans, unhealthy });
});

export default app;
