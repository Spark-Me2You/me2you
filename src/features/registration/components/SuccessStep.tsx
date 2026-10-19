/**
 * SuccessStep Component
 * Registration completion confirmation
 */

import React from 'react';

interface SuccessStepProps {
  userName?: string;
}

export const SuccessStep: React.FC<SuccessStepProps> = ({ userName }) => {
  return (
    <div className="mx-auto flex w-full max-w-[400px] flex-col p-4">
      <div className="flex min-h-screen flex-col items-center px-6 pt-24 pb-8 text-center">
        <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-[#d3e405] text-[2.5rem] text-white">
          ✓
        </div>

        <h2 className="m-0 mb-4 font-jersey text-[2.5rem] tracking-[4px] text-black">
          Welcome{userName ? `, ${userName}` : ''}!
        </h2>

        <p className="m-0 font-averia text-[1.1rem] leading-[1.6] tracking-[0.8px] text-[#333]">
          Your me2you profile has been created successfully.
          <br /><br />
          Head to the SPARK Space kiosk to start connecting with others!
        </p>
      </div>
    </div>
  );
};
