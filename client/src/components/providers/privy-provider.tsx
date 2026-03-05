"use client";

import { PrivyProvider as Provider } from "@privy-io/react-auth";

export default function PrivyProviderWrapper({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <Provider
      appId={process.env.NEXT_PUBLIC_PRIVY_APP_ID!}
      config={{
        appearance: {
          theme: "dark",
          accentColor: "#4f46e5",
        },
        loginMethods: ["wallet"],
      }}
    >
      {children}
    </Provider>
  );
}
