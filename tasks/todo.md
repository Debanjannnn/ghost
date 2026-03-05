# CRE Workflows Implementation

## Server Changes
- [x] Add PendingTransfer type to types.ts
- [x] Add pendingTransfers map + queueTransfer helper to state.ts
- [x] Make POOL_PRIVATE_KEY optional in config.ts
- [x] cancelLend: queue transfer instead of direct call
- [x] cancelBorrow: queue transfer
- [x] acceptProposal: queue transfer
- [x] rejectProposal: queue transfer
- [x] expireProposals: queue transfer
- [x] repayLoan: queue collateral return transfer
- [x] Add getPendingTransfers, executeTransfer, confirmTransfers to internal.controllers.ts
- [x] Mount new internal endpoints in ghost.routes.ts

## CRE Workflows
- [x] settle-loans/main.ts — matching engine
- [x] execute-transfers/main.ts — fund movement
- [x] check-loans/main.ts — liquidation monitoring
- [x] Update config.staging.json for all 3 workflows

## Verification
- [x] CRE workflows type-check (all 3 pass)
- [x] Server runtime test (health check ok)
- [ ] Integration test with CRE simulation
