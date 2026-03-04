import React from "react";
import Navbar from "../Navbar";

const CoreLayout = ({ children }: { children: React.ReactNode }) => {
  return (
    <div className="w-full h-full flex flex-col items-center">
      <Navbar />
      <div className="w-full max-w-6xl">{children}</div>
    </div>
  );
};

export default CoreLayout;
