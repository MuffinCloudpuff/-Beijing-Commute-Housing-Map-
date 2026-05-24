import React from "react";
import { motion, AnimatePresence } from "motion/react";
import { Footprints, Bike, Train, Bus, Car } from "lucide-react";
import { RouteResult, TravelMode } from "../types/navigation";
import { formatDuration, formatDistance } from "../utils/formatters";

interface Props {
  result: RouteResult;
  mode: TravelMode;
  destName: string;
  isExpanded: boolean;
  onToggleExpand: () => void;
  index: number;
}

export const RouteResultItem: React.FC<Props> = ({
  result,
  mode,
  destName,
  isExpanded,
  onToggleExpand,
  index,
}) => {
  const color = result.color;
  const hasError = !!result.error || result.distance === -1;

  return (
    <div
      className={`p-4 rounded-2xl border transition-all ${isExpanded ? "bg-white shadow-xl scale-[1.02] z-10 relative" : "bg-[#FDFBF7] hover:bg-white border-transparent hover:border-[#E5E0D8]"}`}
      style={{ borderColor: isExpanded ? color : undefined }}
      onClick={onToggleExpand}
    >
      <div className="flex items-center gap-4 mb-2 cursor-pointer">
        <div
          className="w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold text-white shrink-0 shadow-sm"
          style={{ backgroundColor: hasError ? "#d1d5db" : color }}
        >
          {index + 1}
        </div>
        <span
          className={`font-bold text-base truncate ${hasError ? "text-[#8E8A82]" : "text-[#2D2A26]"}`}
        >
          {destName}
        </span>
      </div>

      {hasError ? (
        <p
          className={`text-xs ml-9 ${result.error === "已排除该区域" ? "text-[#8E8A82]" : "text-red-500"}`}
        >
          {result.error}
        </p>
      ) : (
        <div className="flex flex-col ml-9">
          <div className="flex items-center justify-between">
            <div className="flex flex-col gap-0.5">
              <span
                className="text-lg font-bold text-[#5A5A40] leading-none"
                style={{ color }}
              >
                {formatDuration(result.duration)}
              </span>
              <span className="text-[10px] text-[#8E8A82] font-medium leading-none">
                {formatDistance(result.distance)}
              </span>
            </div>
            {mode === "transit" && result.cost !== undefined && (
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-green-50 text-green-700 border border-green-200 text-xs font-bold transition-all shadow-sm shrink-0">
                ¥{result.cost} 票价
              </div>
            )}
          </div>

          <AnimatePresence>
            {isExpanded &&
              result.segmentsData &&
              result.segmentsData.length > 0 && (
                <motion.div
                  initial={{ height: 0, opacity: 0, marginTop: 0 }}
                  animate={{ height: "auto", opacity: 1, marginTop: 12 }}
                  exit={{ height: 0, opacity: 0, marginTop: 0 }}
                  className="overflow-hidden border-t border-[#E5E0D8] pt-3 flex flex-col gap-3"
                >
                  {result.segmentsData.map((seg, i) => (
                    <div key={i} className="flex gap-2">
                      <div className="flex flex-col items-center">
                        <div className="w-5 h-5 rounded-full bg-[#F5F2ED] flex items-center justify-center text-[#8E8A82]">
                          {seg.type === "walk" && (
                            <Footprints className="w-3 h-3" />
                          )}
                          {seg.type === "bike" && <Bike className="w-3 h-3" />}
                          {seg.type === "subway" && (
                            <Train className="w-3 h-3" />
                          )}
                          {seg.type === "bus" && <Bus className="w-3 h-3" />}
                          {seg.type === "drive" && <Car className="w-3 h-3" />}
                        </div>
                        {i !== result.segmentsData!.length - 1 && (
                          <div className="w-[2px] h-full bg-[#F5F2ED] mt-1" />
                        )}
                      </div>
                      <div className="flex flex-col pb-3 pt-0.5 gap-0.5">
                        <span className="text-xs font-bold text-[#2D2A26]">
                          {seg.instruction}
                        </span>
                        <span className="text-[10px] text-[#8E8A82] font-medium flex gap-2">
                          <span>{Math.round(seg.distance)}米</span>
                          {seg.duration > 0 && (
                            <span>{formatDuration(seg.duration)}</span>
                          )}
                        </span>
                      </div>
                    </div>
                  ))}
                </motion.div>
              )}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
};
