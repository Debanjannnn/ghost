// SPDX-License-Identifier: MIT
pragma solidity 0.8.26;

import {Script, console} from "forge-std/Script.sol";
import {ERC1967Proxy} from "@openzeppelin/contracts/proxy/ERC1967/ERC1967Proxy.sol";
import {PolicyEngine} from "@chainlink/policy-management/core/PolicyEngine.sol";

/// @title DeployPolicyEngine
/// @notice Deploys a Chainlink ACE PolicyEngine behind an ERC1967 proxy.
///         Initialized with defaultAllow=true (all ops permitted unless policies reject).
contract DeployPolicyEngine is Script {
    function run() external {
        uint256 deployerPK = vm.envUint("PRIVATE_KEY");
        address deployer = vm.addr(deployerPK);

        console.log("Deployer:", deployer);

        vm.startBroadcast(deployerPK);

        PolicyEngine policyEngineImpl = new PolicyEngine();

        bytes memory initData = abi.encodeWithSelector(
            PolicyEngine.initialize.selector,
            true,    // defaultAllow = true
            deployer // initialOwner
        );
        ERC1967Proxy proxy = new ERC1967Proxy(address(policyEngineImpl), initData);

        vm.stopBroadcast();

        console.log("--------------------------------------------");
        console.log("PolicyEngine impl deployed at:", address(policyEngineImpl));
        console.log("PolicyEngine proxy deployed at:", address(proxy));
        console.log("--------------------------------------------");
    }
}
