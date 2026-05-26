import React from 'react';
import { ChevronDown, Plus, MessageSquare, Trash2, Square, ImagePlus, Loader2 } from 'lucide-react';
import { Room } from './types';
import { GlassPanel } from '../AuraLayout';

interface FloorPlanSidebarProps {
  rooms: Room[];
  isExtracting: boolean;
  onSwitchApp: () => void;
  addRoom: () => void;
  handleImageUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  updateRoom: (id: string, attrs: Partial<Room>) => void;
  setRooms: (rooms: Room[]) => void;
  fileInputRef: React.RefObject<HTMLInputElement>;
}

export const FloorPlanSidebar: React.FC<FloorPlanSidebarProps> = ({
  rooms,
  isExtracting,
  onSwitchApp,
  addRoom,
  handleImageUpload,
  updateRoom,
  setRooms,
  fileInputRef,
}) => {
  return (
    <div className="w-full md:w-[420px] h-[45vh] md:h-full bg-[#FDFBF7] shadow-xl z-20 flex flex-col border-r border-[#E5E0D8]">
      {/* Header */}
      <div className="p-6 md:p-8 pb-4 shrink-0 bg-[#FDFBF7] border-b border-[#E5E0D8] shadow-sm z-10 flex flex-col gap-2">
        <button 
          onClick={onSwitchApp}
          className="group flex flex-col text-left hover:bg-[#F0EDE5] -ml-2 p-2 rounded-xl transition-colors w-max"
        >
          <h1 className="text-3xl font-bold tracking-tighter text-[#2D2A26] font-serif flex items-center gap-2">
            户型安排
            <ChevronDown className="w-5 h-5 text-[#8E8A82] group-hover:text-[#2D2A26] transition-colors" />
          </h1>
          <p className="text-[#8E8A82] font-mono text-xs uppercase tracking-widest pl-1 mt-1">
            智能空间布局规划
          </p>
        </button>
      </div>

      {/* Scrollable Content Area */}
      <div className="flex-1 min-h-0 overflow-y-auto relative bg-[#FDFBF7] p-4 md:p-6">
        <GlassPanel className="p-4 flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <label className="text-[10px] uppercase font-bold tracking-widest text-[#8E8A82]">
              添加或识别空间
            </label>
          </div>
          
          <div className="flex gap-2">
             <button
              onClick={addRoom}
              className="flex-1 flex items-center justify-center gap-2 bg-[#F0EDE5] hover:bg-[#E5E0D8] text-[#5A5A40] border border-[#E5E0D8] py-3 rounded-2xl text-sm font-medium transition-all active:scale-95 shadow-sm"
            >
              <Square className="w-4 h-4" />
              <span>手动添加房间</span>
            </button>

            <label className={`flex-1 flex items-center justify-center gap-2 border py-3 rounded-2xl text-sm font-medium transition-all shadow-sm ${isExtracting ? 'bg-[#E5E0D8] text-[#8E8A82] border-transparent cursor-not-allowed' : 'bg-[#5A5A40] hover:bg-[#4A4A35] text-white border-transparent cursor-pointer active:scale-95'}`}>
              {isExtracting ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <ImagePlus className="w-4 h-4" />
              )}
              <span>{isExtracting ? "AI识别中..." : "上传AI识图"}</span>
              <input
                type="file"
                accept="image/*"
                className="hidden"
                ref={fileInputRef}
                onChange={handleImageUpload}
                disabled={isExtracting}
              />
            </label>
          </div>

          <p className="text-[10px] text-[#A39E93] leading-relaxed mt-2">
            您可直接上传图纸或手绘户型图，AI将自动识别房间区域并在画布上生成对应方块。您可以随意拖拽、缩放画布中的房间。
          </p>
        </GlassPanel>

        {rooms.length > 0 && (
           <div className="mt-6 flex flex-col gap-3">
            <h3 className="text-sm font-bold tracking-wide text-[#2D2A26] flex items-center gap-2">
              <div className="w-4 h-[1px] bg-[#E5E0D8]" />
              已规划空间 ({rooms.length})
              <div className="flex-1 h-[1px] bg-[#E5E0D8]" />
            </h3>

            <div className="flex flex-col gap-2">
              {rooms.map((room) => (
                <div key={room.id} className="flex items-center gap-3 bg-white p-3 rounded-xl border border-[#E5E0D8] shadow-sm">
                  <div 
                    className="w-4 h-4 rounded-full border border-black/10 shadow-inner shrink-0" 
                    style={{ backgroundColor: room.color }} 
                  />
                  <input 
                    value={room.name}
                    onChange={(e) => updateRoom(room.id, { name: e.target.value })}
                    className="flex-1 text-sm font-semibold text-[#2D2A26] bg-transparent outline-none focus:border-b border-[#5A5A40]"
                  />
                  <div className="text-xs font-mono text-[#8E8A82] shrink-0">
                    {(room.width / 100).toFixed(1)}m x {(room.height / 100).toFixed(1)}m
                  </div>
                  <button onClick={() => setRooms(rooms.filter(r => r.id !== room.id))} className="text-[#8E8A82] hover:text-red-400 p-1">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
