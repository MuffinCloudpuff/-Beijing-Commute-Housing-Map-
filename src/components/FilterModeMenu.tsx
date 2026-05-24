import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Filter, Check } from 'lucide-react';

interface Props {
  filterMode: 'district' | 'ring';
  isMenuOpen: boolean;
  onSetFilterMode: (mode: 'district' | 'ring') => void;
  onToggleMenu: () => void;
}

export const FilterModeMenu: React.FC<Props> = ({
  filterMode,
  isMenuOpen,
  onSetFilterMode,
  onToggleMenu
}) => {
  return (
    <div className="absolute left-24 bottom-6 z-20 flex flex-col gap-2 pointer-events-auto">
      <AnimatePresence>
        {isMenuOpen && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.95 }}
            className="p-2 bg-white/90 backdrop-blur-md border border-[#E5E0D8] rounded-2xl shadow-xl flex flex-col gap-1 w-36 origin-bottom-left"
          >
            <div className="text-[10px] uppercase font-bold tracking-widest text-[#8E8A82] px-2 py-1">地图筛选区域划定标准</div>
            
            <button 
              onClick={() => { onSetFilterMode('district'); onToggleMenu(); }}
              className={`flex items-center justify-between px-3 py-2 rounded-xl text-sm font-semibold transition-colors ${filterMode === 'district' ? 'bg-[#5A5A40] text-white' : 'text-[#2D2A26] hover:bg-[#F0EDE5]'}`}
            >
              按行政区域划分 <Check className={`w-4 h-4 ${filterMode === 'district' ? 'opacity-100' : 'opacity-0'}`} />
            </button>

            <button 
              onClick={() => { onSetFilterMode('ring'); onToggleMenu(); }}
              className={`flex items-center justify-between px-3 py-2 rounded-xl text-sm font-semibold transition-colors ${filterMode === 'ring' ? 'bg-[#5A5A40] text-white' : 'text-[#2D2A26] hover:bg-[#F0EDE5]'}`}
            >
              按环线划分 <Check className={`w-4 h-4 ${filterMode === 'ring' ? 'opacity-100' : 'opacity-0'}`} />
            </button>
            
          </motion.div>
        )}
      </AnimatePresence>
      
      <button
        onClick={onToggleMenu}
        className={`w-12 h-12 bg-white/95 backdrop-blur-md rounded-full shadow-lg border flex items-center justify-center text-[#5A5A40] hover:scale-105 transition-transform active:scale-95 z-20 ${isMenuOpen ? 'border-[#5A5A40]' : 'border-[#E5E0D8]'}`}
      >
        <Filter className="w-5 h-5" />
      </button>
    </div>
  );
};
