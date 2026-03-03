import { ethers } from "ethers";
import type { LendIntent, BorrowIntent, Loan, EpochResult } from "./types.js";
import { state } from "./state.js";

// Hardcoded ETH price for hackathon
const ETH_PRICE_USD = 2000n;
const COLLATERAL_RATIO_BPS = 15000n; // 150% in basis points (10000 = 100%)

export function runAuction(
  lends: LendIntent[],
  borrows: BorrowIntent[]
): EpochResult {
  const epochId = state.currentEpoch;

  if (lends.length === 0 || borrows.length === 0) {
    return {
      epochId,
      clearingRate: 0,
      totalMatched: 0n,
      seniorMatched: 0n,
      juniorMatched: 0n,
      loans: [],
      unmatchedLends: [...lends],
      unmatchedBorrows: [...borrows],
    };
  }

  // Sort lends by minRate ASC (cheapest capital first)
  const sortedLends = [...lends].sort((a, b) => a.minRate - b.minRate);
  // Sort borrows by maxRate DESC (highest willingness to pay first)
  const sortedBorrows = [...borrows].sort((a, b) => b.maxRate - a.maxRate);

  // Collect all unique candidate rates
  const candidateRates = new Set<number>();
  for (const l of sortedLends) candidateRates.add(l.minRate);
  for (const b of sortedBorrows) candidateRates.add(b.maxRate);
  const rates = [...candidateRates].sort((a, b) => a - b);

  // Find clearing rate that maximizes matched volume
  let bestRate = 0;
  let bestMatched = 0n;

  for (const r of rates) {
    // Supply: sum of lends where minRate <= r
    let supply = 0n;
    for (const l of sortedLends) {
      if (l.minRate <= r) supply += l.amount;
    }
    // Demand: sum of borrows where maxRate >= r
    let demand = 0n;
    for (const b of sortedBorrows) {
      if (b.maxRate >= r) demand += b.amount;
    }
    const matched = supply < demand ? supply : demand;
    if (matched > bestMatched) {
      bestMatched = matched;
      bestRate = r;
    }
  }

  // Match at clearing rate
  const eligibleLends = sortedLends.filter((l) => l.minRate <= bestRate);
  const eligibleBorrows = sortedBorrows.filter((b) => b.maxRate >= bestRate);

  // Split into tranches: senior first, then junior
  const seniorLends = eligibleLends.filter((l) => l.tranche === "senior");
  const juniorLends = eligibleLends.filter((l) => l.tranche === "junior");

  let remaining = bestMatched;
  let seniorMatched = 0n;
  let juniorMatched = 0n;

  // Fill senior first
  for (const l of seniorLends) {
    if (remaining <= 0n) break;
    const fill = l.amount < remaining ? l.amount : remaining;
    seniorMatched += fill;
    remaining -= fill;
  }

  // Then junior
  for (const l of juniorLends) {
    if (remaining <= 0n) break;
    const fill = l.amount < remaining ? l.amount : remaining;
    juniorMatched += fill;
    remaining -= fill;
  }

  // Create loans by matching borrows with available supply
  const loans: Loan[] = [];
  let borrowRemaining = bestMatched;
  let seniorPool = seniorMatched;
  let juniorPool = juniorMatched;

  for (const b of eligibleBorrows) {
    if (borrowRemaining <= 0n) break;

    // Check collateral ratio >= 150%
    // collateralValue = collateralAmount * ETH_PRICE >= borrowAmount * COLLATERAL_RATIO / 10000
    const collValue = b.collateralAmount * ETH_PRICE_USD;
    const requiredColl = (b.amount * COLLATERAL_RATIO_BPS) / 10000n;
    if (collValue < requiredColl) {
      continue; // skip undercollateralized
    }

    const fillAmount = b.amount < borrowRemaining ? b.amount : borrowRemaining;

    // Assign tranche based on which pool funds this loan
    let tranche: "senior" | "junior";
    if (seniorPool >= fillAmount) {
      tranche = "senior";
      seniorPool -= fillAmount;
    } else if (seniorPool > 0n) {
      // Split: assign based on majority funder
      tranche = seniorPool >= fillAmount - seniorPool ? "senior" : "junior";
      juniorPool -= (fillAmount - seniorPool);
      seniorPool = 0n;
    } else {
      tranche = "junior";
      juniorPool -= fillAmount;
    }

    const loanHash = ethers.solidityPackedKeccak256(
      ["address", "address", "uint256", "uint256", "uint256"],
      [b.borrower, b.borrowToken, fillAmount, bestRate, epochId]
    );

    const loan: Loan = {
      loanHash,
      borrower: b.borrower,
      lender: "aggregate", // multi-lender pool
      borrowToken: b.borrowToken,
      borrowAmount: fillAmount,
      collateralToken: b.collateralToken,
      collateralAmount: b.collateralAmount,
      rate: bestRate,
      tranche,
      epoch: epochId,
      active: true,
    };

    loans.push(loan);
    state.activeLoans.set(loanHash, loan);
    borrowRemaining -= fillAmount;
  }

  // Determine unmatched
  const matchedLendAddrs = new Set<string>();
  const matchedBorrowAddrs = new Set<string>();

  // Simple: if total matched > 0, mark eligible as matched
  let lendRemaining = bestMatched;
  const unmatchedLends: LendIntent[] = [];
  for (const l of eligibleLends) {
    if (lendRemaining > 0n) {
      const fill = l.amount < lendRemaining ? l.amount : lendRemaining;
      lendRemaining -= fill;
      if (fill < l.amount) {
        unmatchedLends.push({ ...l, amount: l.amount - fill });
      }
    } else {
      unmatchedLends.push(l);
    }
  }
  // Add ineligible lends
  for (const l of sortedLends) {
    if (l.minRate > bestRate) unmatchedLends.push(l);
  }

  let bRemaining = bestMatched;
  const unmatchedBorrows: BorrowIntent[] = [];
  for (const b of eligibleBorrows) {
    if (bRemaining > 0n) {
      const fill = b.amount < bRemaining ? b.amount : bRemaining;
      bRemaining -= fill;
      if (fill < b.amount) {
        unmatchedBorrows.push({ ...b, amount: b.amount - fill });
      }
    } else {
      unmatchedBorrows.push(b);
    }
  }
  for (const b of sortedBorrows) {
    if (b.maxRate < bestRate) unmatchedBorrows.push(b);
  }

  return {
    epochId,
    clearingRate: bestRate,
    totalMatched: bestMatched,
    seniorMatched,
    juniorMatched,
    loans,
    unmatchedLends,
    unmatchedBorrows,
  };
}
