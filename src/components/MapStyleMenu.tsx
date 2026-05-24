import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Layers, Check } from 'lucide-react';

interface Props {
  mapStyle: string;
  showSatellite: boolean;
  showSubway?: boolean;
  isMenuOpen: boolean;
  onSetMapStyle: (style: string) => void;
  onToggleSatellite: () => void;
  onToggleSubway?: () => void;
  onToggleMenu: () => void;
}

export const MapStyleMenu: React.FC<Props> = ({
  mapStyle,
  showSatellite,
  showSubway,
  isMenuOpen,
  onSetMapStyle,
  onToggleSatellite,
  onToggleSubway,
  onToggleMenu
}) => {
  return (
    <div className="absolute left-6 bottom-6 z-20 flex flex-col gap-2 pointer-events-auto">
      <AnimatePresence>
        {isMenuOpen && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.95 }}
            className="p-2 bg-white/90 backdrop-blur-md border border-[#E5E0D8] rounded-2xl shadow-xl flex flex-col gap-1 w-32 origin-bottom-left"
          >
            <div className="text-[10px] uppercase font-bold tracking-widest text-[#8E8A82] px-2 py-1">地图样式</div>
            
            <button 
              onClick={() => onSetMapStyle('normal')}
              className={`flex items-center justify-between px-3 py-2 rounded-xl text-sm font-semibold transition-colors ${mapStyle === 'normal' && !showSatellite ? 'bg-[#5A5A40] text-white' : 'text-[#2D2A26] hover:bg-[#F0EDE5]'}`}
            >
              标准 <Check className={`w-4 h-4 ${mapStyle === 'normal' && !showSatellite ? 'opacity-100' : 'opacity-0'}`} />
            </button>

            <button 
              onClick={() => onSetMapStyle('macaron')}
              className={`flex items-center justify-between px-3 py-2 rounded-xl text-sm font-semibold transition-colors ${mapStyle === 'macaron' && !showSatellite ? 'bg-[#5A5A40] text-white' : 'text-[#2D2A26] hover:bg-[#F0EDE5]'}`}
            >
              马卡龙 <Check className={`w-4 h-4 ${mapStyle === 'macaron' && !showSatellite ? 'opacity-100' : 'opacity-0'}`} />
            </button>

            <button 
              onClick={() => onSetMapStyle('fresh')}
              className={`flex items-center justify-between px-3 py-2 rounded-xl text-sm font-semibold transition-colors ${mapStyle === 'fresh' && !showSatellite ? 'bg-[#5A5A40] text-white' : 'text-[#2D2A26] hover:bg-[#F0EDE5]'}`}
            >
              清爽 <Check className={`w-4 h-4 ${mapStyle === 'fresh' && !showSatellite ? 'opacity-100' : 'opacity-0'}`} />
            </button>

            <button 
              onClick={() => onSetMapStyle('light')}
              className={`flex items-center justify-between px-3 py-2 rounded-xl text-sm font-semibold transition-colors ${mapStyle === 'light' && !showSatellite ? 'bg-[#5A5A40] text-white' : 'text-[#2D2A26] hover:bg-[#F0EDE5]'}`}
            >
              极简 <Check className={`w-4 h-4 ${mapStyle === 'light' && !showSatellite ? 'opacity-100' : 'opacity-0'}`} />
            </button>
            
            <div className="h-[1px] bg-[#E5E0D8] mx-2 my-1" />
            
            <button 
              onClick={onToggleSatellite}
              className={`flex items-center justify-between px-3 py-2 rounded-xl text-sm font-semibold transition-colors ${showSatellite ? 'bg-blue-500 text-white' : 'text-[#2D2A26] hover:bg-[#F0EDE5]'}`}
            >
              卫星图 <Check className={`w-4 h-4 ${showSatellite ? 'opacity-100' : 'opacity-0'}`} />
            </button>
            {onToggleSubway && (
              <button 
                onClick={onToggleSubway}
                className={`flex items-center justify-between px-3 py-2 rounded-xl text-sm font-semibold transition-colors mt-1 ${showSubway ? 'bg-[#5A5A40] text-white' : 'text-[#2D2A26] hover:bg-[#F0EDE5]'}`}
              >
                地铁线路图 <Check className={`w-4 h-4 ${showSubway ? 'opacity-100' : 'opacity-0'}`} />
              </button>
            )}
            
          </motion.div>
        )}
      </AnimatePresence>
      
      <button
        onClick={onToggleMenu}
        className="w-12 h-12 bg-white/95 backdrop-blur-md rounded-full shadow-lg border border-[#E5E0D8] flex items-center justify-center text-[#5A5A40] hover:scale-105 transition-transform active:scale-95 z-20"
      >
        <Layers className="w-5 h-5" />
      </button>
    </div>
  );
};
