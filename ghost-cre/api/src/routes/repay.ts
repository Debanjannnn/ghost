import { Hono } from "hono";
import { authenticate } from "../auth.js";
import { state } from "../state.js";
import { recordRepayment } from "../credit.js";
import * as pool from "../pool.js";

const app = new Hono();

app.post("/repay", async (c) => {
  try {
    const body = await c.req.json();
    const { account, loanHash, transactionId, timestamp, auth } = body;

    if (!account || !loanHash || !transactionId || !timestamp || !auth) {
      return c.json({ error: "Missing required fields" }, 400);
    }

    authenticate(
      "Repay Loan",
      { account, loanHash, transactionId, timestamp },
      auth,
      account
    );

    // Verify loan is active and belongs to user
    const loan = state.activeLoans.get(loanHash);
    if (!loan || !loan.active) {
      return c.json({ error: "Loan not found or already repaid" }, 400);
    }
    if (loan.borrower.toLowerCase() !== account.toLowerCase()) {
      return c.json({ error: "Loan does not belong to this account" }, 403);
    }

    // Prevent double-credit
    if (state.verifiedTransfers.has(transactionId)) {
      return c.json({ error: "Transaction already used" }, 400);
    }

    // Verify the repayment transfer arrived at pool
    const repayAmount = loan.borrowAmount.toString();
    const verified = await pool.verifyIncomingTransfer(account, repayAmount, loan.borrowToken);
    if (!verified) {
      return c.json({ error: "Repayment transfer not found on external API" }, 400);
    }

    // Mark transfer as used
    state.verifiedTransfers.add(transactionId);

    // Mark loan repaid
    loan.active = false;

    // Return collateral to borrower
    state.creditBalance(account, loan.collateralToken, loan.collateralAmount);

    // Credit lender with principal (interest handled via rate in future)
    // For now, credit back the borrow amount to lender pool
    if (loan.lender !== "aggregate") {
      state.creditBalance(loan.lender, loan.borrowToken, loan.borrowAmount);
    }

    // Update credit score
    recordRepayment(account);

    // Record transaction
    state.addTransaction({
      id: crypto.randomUUID(),
      type: "repayment",
      user: account.toLowerCase(),
      token: loan.borrowToken.toLowerCase(),
      amount: loan.borrowAmount,
      timestamp: Math.floor(Date.now() / 1000),
      epoch: state.currentEpoch,
    });

    return c.json({
      success: true,
      loanHash,
    });
  } catch (err: any) {
    return c.json({ error: err.message }, 401);
  }
});

export default app;
