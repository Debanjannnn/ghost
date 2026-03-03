// SPDX-License-Identifier: MIT
pragma solidity 0.8.26;

import {Script, console} from "forge-std/Script.sol";
import {GhostToken} from "../src/GhostToken.sol";

/// @title DeployToken
/// @notice Deploys a GhostToken ERC20 (used as the single lending token).
contract DeployToken is Script {
    function run() external {
        uint256 deployerPK = vm.envUint("PRIVATE_KEY");
        address deployer = vm.addr(deployerPK);

        string memory name = vm.envOr("TOKEN_NAME", string("GhostUSDC"));
        string memory symbol = vm.envOr("TOKEN_SYMBOL", string("gUSDC"));

        console.log("Deployer:", deployer);

        vm.startBroadcast(deployerPK);

        GhostToken token = new GhostToken(name, symbol, deployer);

        vm.stopBroadcast();

        console.log("------------------------------------");
        console.log("GhostToken deployed at:", address(token));
        console.log("------------------------------------");
    }
}
