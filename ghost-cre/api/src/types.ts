export interface LendIntent {
  lender: string;
  token: string;
  amount: bigint;
  minRate: number; // basis points
  tranche: "senior" | "junior";
  duration: number; // epochs
  epoch: number;
  intentHash: string;
}

export interface BorrowIntent {
  borrower: string;
  borrowToken: string;
  amount: bigint;
  maxRate: number; // basis points
  collateralToken: string;
  collateralAmount: bigint;
  duration: number;
  epoch: number;
  intentHash: string;
}

export interface Loan {
  loanHash: string;
  borrower: string;
  lender: string;
  borrowToken: string;
  borrowAmount: bigint;
  collateralToken: string;
  collateralAmount: bigint;
  rate: number; // basis points
  tranche: "senior" | "junior";
  epoch: number;
  active: boolean;
}

export interface EpochResult {
  epochId: number;
  clearingRate: number;
  totalMatched: bigint;
  seniorMatched: bigint;
  juniorMatched: bigint;
  loans: Loan[];
  unmatchedLends: LendIntent[];
  unmatchedBorrows: BorrowIntent[];
}

export interface TrancheData {
  seniorMatched: bigint;
  juniorMatched: bigint;
}

export interface Transaction {
  id: string;
  type: "deposit" | "withdraw" | "lend" | "borrow" | "repayment" | "liquidation";
  user: string;
  token: string;
  amount: bigint;
  timestamp: number;
  epoch: number;
  txHash?: string;
}

export interface PoolDeposit {
  user: string;
  token: string;
  amount: bigint;
  externalTxId: string;
  timestamp: number;
  purpose: "lend" | "collateral";
}
