/**
 * E2E test orchestrator
 *
 * Run individual steps:
 *   bun run src/01_transfer-funds.ts
 *   bun run src/02_vault_deposit_and_lend.ts
 *   bun run src/03_vault_deposit_and_borrow.ts
 *   -- run CRE workflows (settle-loans, execute-transfers, check-loans) --
 *   bun run src/04_check_final_loan_and_withdraw.ts
 */

const step = process.argv[2];

if (!step) {
  console.log("Usage: bun run src/index.ts <step>");
  console.log("");
  console.log("Steps:");
  console.log("  1  Fund wallets (mint gUSD/gETH, send gas ETH)");
  console.log("  2  Lenders: vault deposit + lend intents");
  console.log("  3  Borrower: vault deposit + borrow intent");
  console.log("  4  Check loan + withdraw gUSD to on-chain");
  console.log("");
  console.log("Or run each directly:");
  console.log("  bun run src/01_transfer-funds.ts");
  console.log("  bun run src/02_vault_deposit_and_lend.ts");
  console.log("  bun run src/03_vault_deposit_and_borrow.ts");
  console.log("  bun run src/04_check_final_loan_and_withdraw.ts");
  process.exit(0);
}

const scripts: Record<string, string> = {
  "1": "./01_transfer-funds.ts",
  "2": "./02_vault_deposit_and_lend.ts",
  "3": "./03_vault_deposit_and_borrow.ts",
  "4": "./04_check_final_loan_and_withdraw.ts",
};

const script = scripts[step];
if (!script) {
  console.error(`Unknown step: ${step}. Use 1-4.`);
  process.exit(1);
}

await import(script);
