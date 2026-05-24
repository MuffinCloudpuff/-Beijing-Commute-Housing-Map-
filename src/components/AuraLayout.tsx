import React from 'react';
import { motion } from 'motion/react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const AuraLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return (
    <div className="relative h-screen w-screen bg-[#F5F2ED] text-[#4A453E] font-sans overflow-hidden selection:bg-[#5A5A40]/20 flex flex-col">
      {/* Background elements */}
      <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
         <div className="absolute inset-0 opacity-20" style={{ backgroundImage: 'radial-gradient(#5A5A40 1px, transparent 1px)', backgroundSize: '20px 20px' }}></div>
      </div>

      {/* Main Content Area */}
      <div className="relative z-10 w-full flex-1 flex flex-col min-h-0">
        {children}
      </div>
    </div>
  );
};

export const GlassPanel: React.FC<{ children: React.ReactNode; className?: string }> = ({ children, className }) => {
  return (
    <div className={cn("relative overflow-hidden rounded-2xl bg-white/70 backdrop-blur-[10px] border border-[#5A5A40]/10 shadow-sm", className)}>
      <div className="relative z-10">
        {children}
      </div>
    </div>
  );
};
