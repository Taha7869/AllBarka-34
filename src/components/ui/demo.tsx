import React from "react";
import { Footer7 } from "./footer-7";

export const DemoOne = () => {
  return (
    <div className="min-h-screen flex flex-col justify-between bg-[#FAF9F5] text-[#1A1A1A]">
      {/* Sample Page Content */}
      <main className="flex-1 flex items-center justify-center p-8">
        <div className="text-center space-y-2 max-w-md">
          <span className="text-xs uppercase font-serif tracking-widest text-[#B38926]">
            Preview Environment
          </span>
          <h1 className="text-3xl font-serif font-bold text-[#1A1A1A]">
            AllBarka Boutique Showcase
          </h1>
          <p className="text-sm text-neutral-600">
            Scroll down to examine the luxury responsive footer implementation.
          </p>
        </div>
      </main>

      {/* Redesigned Luxury Footer */}
      <Footer7 />
    </div>
  );
};

export default DemoOne;
