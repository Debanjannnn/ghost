// SPDX-License-Identifier: MIT
pragma solidity 0.8.26;

import {Script, console} from "forge-std/Script.sol";
import {ERC1967Proxy} from "@openzeppelin/contracts/proxy/ERC1967/ERC1967Proxy.sol";
import {PolicyEngine} from "@chainlink/policy-management/core/PolicyEngine.sol";
import {GhostToken} from "../src/GhostToken.sol";

interface IVault {
    function register(address token, address policyEngine) external;
    function deposit(address token, uint256 amount) external;
}

/// @title SetupAll
/// @notice Deploys 2 tokens (gUSD + gETH), PolicyEngine, registers on external vault,
///         mints to participants, deposits to vault.
///         Requires: PRIVATE_KEY, EXTERNAL_VAULT_ADDRESS
///         Optional: ALICE_ADDRESS, BOB_ADDRESS, CHARLIE_ADDRESS
contract SetupAll is Script {
    function run() external {
        uint256 deployerPK = vm.envUint("PRIVATE_KEY");
        address deployer = vm.addr(deployerPK);
        address externalVault = vm.envAddress("EXTERNAL_VAULT_ADDRESS");

        address alice = vm.envOr("ALICE_ADDRESS", deployer);
        address bob = vm.envOr("BOB_ADDRESS", deployer);
        address charlie = vm.envOr("CHARLIE_ADDRESS", deployer);

        console.log("Deployer:", deployer);
        console.log("External Vault:", externalVault);

        vm.startBroadcast(deployerPK);

        // 1. Deploy tokens
        GhostToken gUSD = new GhostToken("GhostUSD", "gUSD", deployer);
        GhostToken gETH = new GhostToken("GhostETH", "gETH", deployer);
        console.log("1) gUSD:", address(gUSD));
        console.log("   gETH:", address(gETH));

        // 2. Deploy PolicyEngine (behind proxy)
        PolicyEngine peImpl = new PolicyEngine();
        bytes memory initData = abi.encodeWithSelector(PolicyEngine.initialize.selector, true, deployer);
        ERC1967Proxy proxy = new ERC1967Proxy(address(peImpl), initData);
        console.log("2) PolicyEngine proxy:", address(proxy));

        // 3. Register both tokens on external vault
        IVault(externalVault).register(address(gUSD), address(proxy));
        IVault(externalVault).register(address(gETH), address(proxy));
        console.log("3) Registered gUSD + gETH on external vault");

        // 4. Mint to participants
        uint256 usdMint = 100_000 ether;
        uint256 ethMint = 100 ether;
        gUSD.mint(alice, usdMint);
        gUSD.mint(bob, usdMint);
        gUSD.mint(charlie, usdMint);
        gETH.mint(charlie, ethMint);
        console.log("4) Minted tokens");

        // 5. Approve external vault for deployer
        gUSD.approve(externalVault, type(uint256).max);
        gETH.approve(externalVault, type(uint256).max);
        console.log("5) Approved external vault");

        // 6. Deposit some tokens to vault (so deployer has private balance)
        IVault(externalVault).deposit(address(gUSD), 10_000 ether);
        IVault(externalVault).deposit(address(gETH), 10 ether);
        console.log("6) Deposited 10k gUSD + 10 gETH to vault");

        vm.stopBroadcast();

        console.log("");
        console.log("============================================");
        console.log("  GHOST SETUP COMPLETE");
        console.log("============================================");
        console.log("gUSD:               ", address(gUSD));
        console.log("gETH:               ", address(gETH));
        console.log("PolicyEngine proxy: ", address(proxy));
        console.log("External Vault:     ", externalVault);
        console.log("Alice:              ", alice);
        console.log("Bob:                ", bob);
        console.log("Charlie:            ", charlie);
        console.log("============================================");
    }
}
