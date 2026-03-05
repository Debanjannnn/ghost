"use client";

import { usePrivy } from "@privy-io/react-auth";

const ConnectWalletButton = () => {
  const { login, logout, authenticated, user } = usePrivy();

  const walletAddress = user?.wallet?.address;

  if (authenticated) {
    return (
      <button
        onClick={logout}
        className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-4 rounded-2xl transition-colors cursor-pointer text-lg"
      >
        {walletAddress
          ? `${walletAddress.slice(0, 6)}...${walletAddress.slice(-4)}`
          : "Disconnect"}
      </button>
    );
  }

  return (
    <button
      onClick={login}
      className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-4 rounded-2xl transition-colors cursor-pointer text-lg"
    >
      Connect Wallet
    </button>
  );
};

export default ConnectWalletButton;
