import React, { useState, useEffect, useRef } from "react";
import { GlassPanel } from "./AuraLayout";
import { loadAMap } from "../utils/amap";
import {
  MapPin,
  Navigation2,
  Plus,
  Compass,
  Train,
  Car,
  Footprints,
  Bike,
  X,
  Loader2,
  ImagePlus,
  Download,
  Upload,
  Home,
  ChevronDown,
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { TravelMode, LocationPoint, RouteResult } from "../types/navigation";
import { cn } from "../utils/classNames";
import { DEST_COLORS } from "../constants/navigation";
import { RouteResultItem } from "./RouteResultItem";
import { MapStyleMenu } from "./MapStyleMenu";
import {
  processImageFiles,
  importJsonContent,
  exportDestinationsToFile,
} from "../utils/fileHandlers";
import { useBeijingDistricts } from "../hooks/useBeijingDistricts";
import { useBeijingRings } from "../hooks/useBeijingRings";
import { useMapOverlays } from "../hooks/useMapOverlays";
import { useRouteCalculation } from "../hooks/useRouteCalculation";
import { useSubwayLines } from "../hooks/useSubwayLines";
import { useCommuteSearch } from "../hooks/useCommuteSearch";
import { FilterModeMenu } from "./FilterModeMenu";

export const NavigationApp: React.FC<{
  apiKey: string;
  securityCode: string;
  onSwitchApp: () => void;
}> = ({ apiKey, securityCode, onSwitchApp }) => {
  const [isLoaded, setIsLoaded] = useState(false);
  const [amap, setAmap] = useState<any>(null);
  const [error, setError] = useState("");

  const [origin, setOrigin] = useState<LocationPoint | null>(null);
  const [destinations, setDestinations] = useState<LocationPoint[]>([]);
  const [mode, setMode] = useState<TravelMode>("transit");

  const [results, setResults] = useState<Record<string, RouteResult>>({});
  const [isCalculating, setIsCalculating] = useState(false);
  const [expandedDestId, setExpandedDestId] = useState<string | null>(null);
  const [lastCalcParams, setLastCalcParams] = useState<{
    originId: string;
    mode: TravelMode;
  } | null>(null);

  const [isExtractingLocations, setIsExtractingLocations] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const jsonInputRef = useRef<HTMLInputElement>(null);

  const [mapStyle, setMapStyle] = useState("macaron");
  const [showSatellite, setShowSatellite] = useState(false);
  const [showSubway, setShowSubway] = useState(false);
  const [isMapStyleMenuOpen, setIsMapStyleMenuOpen] = useState(false);
  const satelliteLayerRef = useRef<any>(null);

  const [filterMode, setFilterMode] = useState<"district" | "ring">("district");
  const [isFilterModeMenuOpen, setIsFilterModeMenuOpen] = useState(false);

  // Commute Search States
  const [maxCycleMins, setMaxCycleMins] = useState(15);
  const [maxCommuteMins, setMaxCommuteMins] = useState(45);

  const [excludedDistricts, setExcludedDistricts] = useState<string[]>([]);
  const [excludedRings, setExcludedRings] = useState<string[]>([]);
  const districtPolygonsRef = useRef<any[]>([]);
  const ringPolygonsRef = useRef<any[]>([]);

  const searchInputRef = useRef<HTMLInputElement>(null);
  const destInputRef = useRef<HTMLInputElement>(null);
  const originAutoCompleteRef = useRef<any>(null);
  const destAutoCompleteRef = useRef<any>(null);

  // Map and routing state
  const mapRef = useRef<HTMLDivElement>(null);
  const [mapInstance, setMapInstance] = useState<any>(null);
  const markersRef = useRef<any[]>([]);
  const polylineRefs = useRef<any[]>([]);

  useEffect(() => {
    loadAMap(apiKey, securityCode)
      .then((AMap) => {
        setAmap(AMap);
        setIsLoaded(true);
      })
      .catch((e) => {
        setError("地图服务加载失败。请检查您的密钥。");
        console.error(e);
      });
  }, [apiKey, securityCode]);

  useEffect(() => {
    if (isLoaded && amap && mapRef.current && !mapInstance) {
      const map = new amap.Map(mapRef.current, {
        zoom: 11,
        mapStyle: "amap://styles/macaron",
        viewMode: "3D",
      });
      setMapInstance(map);

      // Try to locate user automatically
      amap.plugin("AMap.Geolocation", function () {
        const geolocation = new amap.Geolocation({
          enableHighAccuracy: true,
          timeout: 10000,
          buttonPosition: "RB",
        });
        map.addControl(geolocation);
        geolocation.getCurrentPosition();
      });
    }
  }, [isLoaded, amap, mapRef, mapInstance]);

  useBeijingDistricts(
    amap,
    mapInstance,
    filterMode,
    excludedDistricts,
    setExcludedDistricts,
    districtPolygonsRef,
  );
  useBeijingRings(
    amap,
    mapInstance,
    filterMode,
    excludedRings,
    setExcludedRings,
    ringPolygonsRef,
  );
  const { subwayData } = useSubwayLines(amap, mapInstance, showSubway);

  const {
    calculateCommuteRange,
    clearCommuteOverlays,
    commuteOverlaysCount,
    isCalculating: isCommuteCalculating,
  } = useCommuteSearch(amap, mapInstance, subwayData);

  useEffect(() => {
    if (!mapInstance || !amap) return;

    mapInstance.setMapStyle(`amap://styles/${mapStyle}`);

    if (showSatellite) {
      if (!satelliteLayerRef.current) {
        satelliteLayerRef.current = new amap.TileLayer.Satellite();
      }
      satelliteLayerRef.current.setMap(mapInstance);
    } else {
      if (satelliteLayerRef.current) {
        satelliteLayerRef.current.setMap(null);
      }
    }
  }, [mapStyle, showSatellite, mapInstance, amap]);

  // Handle autocomplete
  useEffect(() => {
    if (!isLoaded || !amap) return;

    const placeSearch = new amap.PlaceSearch({
      pageSize: 1,
      pageIndex: 1,
    });

    if (searchInputRef.current && !originAutoCompleteRef.current) {
      const autocomplete = new amap.AutoComplete({
        input: searchInputRef.current,
      });
      originAutoCompleteRef.current = autocomplete;

      autocomplete.on("select", (e: any) => {
        if (e.poi && e.poi.location) {
          setOrigin({
            id: Math.random().toString(36).substr(2, 9),
            name: e.poi.name,
            lat: e.poi.location.lat,
            lng: e.poi.location.lng,
          });
          if (searchInputRef.current) searchInputRef.current.value = "";
        } else {
          placeSearch.search(e.poi.name, (status: string, result: any) => {
            if (status === "complete" && result.info === "OK") {
              const poi = result.poiList.pois[0];
              setOrigin({
                id: Math.random().toString(36).substr(2, 9),
                name: poi.name,
                lat: poi.location.lat,
                lng: poi.location.lng,
              });
              if (searchInputRef.current) searchInputRef.current.value = "";
            }
          });
        }
      });
    }

    if (destInputRef.current && !destAutoCompleteRef.current) {
      const autocomplete = new amap.AutoComplete({
        input: destInputRef.current,
      });
      destAutoCompleteRef.current = autocomplete;

      autocomplete.on("select", (e: any) => {
        if (e.poi && e.poi.location) {
          setDestinations((prev) => [
            ...prev,
            {
              id: Math.random().toString(36).substr(2, 9),
              name: e.poi.name,
              lat: e.poi.location.lat,
              lng: e.poi.location.lng,
            },
          ]);
          if (destInputRef.current) destInputRef.current.value = "";
        } else {
          placeSearch.search(e.poi.name, (status: string, result: any) => {
            if (status === "complete" && result.info === "OK") {
              const poi = result.poiList.pois[0];
              setDestinations((prev) => [
                ...prev,
                {
                  id: Math.random().toString(36).substr(2, 9),
                  name: poi.name,
                  lat: poi.location.lat,
                  lng: poi.location.lng,
                },
              ]);
              if (destInputRef.current) destInputRef.current.value = "";
            }
          });
        }
      });
    }
  }, [isLoaded, amap]);

  const locateMe = () => {
    if (!isLoaded || !amap) return;

    amap.plugin("AMap.Geolocation", function () {
      const geolocation = new amap.Geolocation({
        enableHighAccuracy: true,
        timeout: 10000,
        buttonPosition: "RB",
      });
      geolocation.getCurrentPosition((status: string, result: any) => {
        if (status === "complete") {
          setOrigin({
            id: "my-loc",
            name: "我的位置",
            lat: result.position.lat,
            lng: result.position.lng,
          });
          if (searchInputRef.current) searchInputRef.current.value = "我的位置";
        } else {
          setError("获取当前位置失败。");
        }
      });
    });
  };

  const removeDestination = (id: string) => {
    setDestinations((prev) => prev.filter((d) => d.id !== id));
    setResults((prev) => {
      const newMap = { ...prev };
      delete newMap[id];
      return newMap;
    });
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      await processImageFiles(
        amap,
        files,
        setIsExtractingLocations,
        setDestinations,
        fileInputRef,
      );
    }
  };

  const handleDrop = async (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      if (
        files[0].type === "application/json" ||
        files[0].name.endsWith(".json")
      ) {
        const reader = new FileReader();
        reader.onload = (event) => {
          try {
            const content = event.target?.result as string;
            importJsonContent(
              content,
              setOrigin,
              setDestinations,
              searchInputRef,
            );
          } catch (err) {
            console.error("Failed to read JSON file", err);
          }
        };
        reader.readAsText(files[0]);
      } else {
        await processImageFiles(
          amap,
          files,
          setIsExtractingLocations,
          setDestinations,
          fileInputRef,
        );
      }
    }
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
  };

  const exportDestinations = () => {
    exportDestinationsToFile(origin, destinations);
  };

  const handleJsonUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const content = event.target?.result as string;
        importJsonContent(content, setOrigin, setDestinations, searchInputRef);
      } catch (err) {
        console.error("Failed to read JSON file", err);
      }
    };
    reader.readAsText(file);
    if (jsonInputRef.current) jsonInputRef.current.value = "";
  };

  const { checkLocationExcluded } = useMapOverlays(
    amap,
    mapInstance,
    origin,
    destinations,
    results,
    filterMode,
    excludedDistricts,
    excludedRings,
    districtPolygonsRef,
    ringPolygonsRef,
    markersRef,
    polylineRefs,
  );

  const { calculateRoutes } = useRouteCalculation(
    amap,
    origin,
    destinations,
    mode,
    results,
    setResults,
    setDestinations,
    checkLocationExcluded,
    lastCalcParams,
    setLastCalcParams,
    setIsCalculating,
  );

  if (!isLoaded) {
    return (
      <div className="flex flex-col items-center justify-center p-20 gap-4">
        <Loader2 className="w-8 h-8 text-[#5A5A40] animate-spin" />
        <p className="text-[#8E8A82] text-sm font-medium tracking-wide">
          正在初始化地图核心组件
        </p>
      </div>
    );
  }

  return (
    <div className="absolute inset-0 flex flex-col md:flex-row w-full bg-[#FDFBF7]">
      {/* Left Sidebar */}
      <div className="w-full md:w-[420px] h-[45vh] md:h-full bg-[#FDFBF7] shadow-xl z-20 flex flex-col border-r border-[#E5E0D8]">
        {/* Header (always visible) */}
        <div className="p-6 md:p-8 pb-4 shrink-0 bg-[#FDFBF7] border-b border-[#E5E0D8] shadow-sm z-10 flex flex-col gap-2">
          <button 
            onClick={onSwitchApp}
            className="group flex flex-col text-left hover:bg-[#F0EDE5] -ml-2 p-2 rounded-xl transition-colors w-max"
          >
            <h1 className="text-3xl font-bold tracking-tighter text-[#2D2A26] font-serif flex items-center gap-2">
              智慧找房
              <ChevronDown className="w-5 h-5 text-[#8E8A82] group-hover:text-[#2D2A26] transition-colors" />
            </h1>
            <p className="text-[#8E8A82] font-mono text-xs uppercase tracking-widest pl-1 mt-1">
              多点空间距离矩阵
            </p>
          </button>
        </div>

        {/* Scrollable Content Area */}
        <div className="flex-1 min-h-0 overflow-y-auto relative bg-[#FDFBF7]">
          {/* Core Setup & Summary View */}
          <div className="flex flex-col p-4 md:p-6 gap-6 h-max pb-20 md:pb-6">
            {error && (
              <div className="bg-red-50 text-red-600 p-4 rounded-2xl border border-red-100 text-sm">
                {error}
              </div>
            )}

            {/* Control Panel */}
            <GlassPanel className="p-1 gap-1 flex flex-col">
              <div className="p-4 pb-2">
                <label className="text-[10px] uppercase font-bold tracking-widest text-[#8E8A82] mb-3 block">
                  起点位置
                </label>
                <div className="flex flex-col gap-3">
                  <div className="relative flex group">
                    <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-[#D4A373] group-focus-within:text-[#5A5A40] transition-colors" />
                    <input
                      ref={searchInputRef}
                      readOnly={!!origin}
                      placeholder="搜索起始位置..."
                      className="w-full bg-white/80 border border-[#E5E0D8] rounded-2xl py-3.5 pl-12 pr-10 text-sm text-[#2D2A26] focus:outline-none focus:bg-white transition-colors focus:ring-1 focus:ring-[#5A5A40]/30 placeholder:text-[#8E8A82]"
                    />
                    {origin && (
                      <button
                        onClick={() => {
                          setOrigin(null);
                          if (searchInputRef.current)
                            searchInputRef.current.value = "";
                        }}
                        className="absolute right-4 top-1/2 -translate-y-1/2 text-[#8E8A82] hover:text-[#5A5A40] p-1 bg-white rounded-full"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                  {!origin && (
                    <button
                      onClick={locateMe}
                      className="flex items-center justify-center gap-2 bg-[#F0EDE5] hover:bg-[#E5E0D8] text-[#5A5A40] border border-[#E5E0D8] py-3 rounded-2xl text-sm font-medium transition-all active:scale-95 shadow-sm"
                    >
                      <Navigation2 className="w-4 h-4" /> 我的当前位置
                    </button>
                  )}
                </div>
              </div>

              <div className="h-[1px] bg-[#E5E0D8] mx-6 my-2" />

              <div
                className="p-4 pt-2"
                onDrop={handleDrop}
                onDragOver={handleDragOver}
              >
                <div className="flex items-center justify-between mb-3">
                  <label className="text-[10px] uppercase font-bold tracking-widest text-[#8E8A82]">
                    终点位置 (可添加多个)
                  </label>
                  <div className="flex items-center gap-3">
                    <label className="cursor-pointer flex items-center gap-1.5 text-[10px] font-bold text-[#8E8A82] hover:text-[#5A5A40] transition-colors">
                      <Download className="w-3 h-3" />
                      <span onClick={exportDestinations}>导出位置</span>
                    </label>
                    <label className="cursor-pointer flex items-center gap-1.5 text-[10px] font-bold text-[#8E8A82] hover:text-[#5A5A40] transition-colors">
                      <Upload className="w-3 h-3" />
                      <span>导入位置</span>
                      <input
                        type="file"
                        accept=".json"
                        ref={jsonInputRef}
                        className="hidden"
                        onChange={handleJsonUpload}
                      />
                    </label>
                    <label className="cursor-pointer flex items-center gap-1.5 text-[10px] font-bold text-[#8E8A82] hover:text-[#5A5A40] transition-colors">
                      {isExtractingLocations ? (
                        <Loader2 className="w-3 h-3 animate-spin" />
                      ) : (
                        <ImagePlus className="w-3 h-3" />
                      )}
                      {isExtractingLocations ? "识别中..." : "图文识别"}
                      <input
                        type="file"
                        accept="image/*"
                        multiple
                        ref={fileInputRef}
                        className="hidden"
                        onChange={handleImageUpload}
                        disabled={isExtractingLocations}
                      />
                    </label>
                  </div>
                </div>
                <div className="flex flex-col gap-3">
                  <AnimatePresence initial={false}>
                    {destinations.map((dest, index) => {
                      const color = DEST_COLORS[index % DEST_COLORS.length];
                      return (
                        <motion.div
                          key={dest.id}
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: "auto" }}
                          exit={{ opacity: 0, height: 0, scale: 0.95 }}
                          className="flex items-center gap-4 bg-white p-2.5 rounded-xl border border-[#E5E0D8] shadow-sm relative overflow-hidden"
                        >
                          <div
                            className="w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-bold text-white shrink-0 ml-1 shadow-inner"
                            style={{ backgroundColor: color }}
                          >
                            {index + 1}
                          </div>
                          <div className="flex-1 text-sm font-semibold text-[#2D2A26] truncate">
                            {dest.name}
                          </div>
                          <button
                            onClick={() => removeDestination(dest.id)}
                            className="p-2 text-[#8E8A82] hover:text-red-400 transition-colors shrink-0 z-10 bg-white shadow-[-8px_0_10px_white]"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </motion.div>
                      );
                    })}
                  </AnimatePresence>

                  <div className="relative group mt-1">
                    <Plus className="absolute left-5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#8E8A82] group-focus-within:text-[#5A5A40] transition-colors" />
                    <input
                      ref={destInputRef}
                      disabled={!origin}
                      placeholder={
                        origin
                          ? "添加一个终点..."
                          : "请先设置起点此后可添加多个终点"
                      }
                      className="w-full bg-transparent border border-[#E5E0D8] border-dashed rounded-2xl py-3.5 pl-12 pr-4 text-sm text-[#2D2A26] focus:outline-none focus:bg-white focus:border-[#5A5A40] focus:border-solid transition-all placeholder:text-[#8E8A82] disabled:opacity-50 bg-[#FDFBF7]"
                    />
                  </div>
                </div>
              </div>
            </GlassPanel>

            {/* Mode Selector */}
            <div className="flex p-1 bg-[#F0EDE5] rounded-xl border border-[#E5E0D8] overflow-hidden">
              {[
                { id: "driving", icon: Car, label: "驾车" },
                { id: "transit", icon: Train, label: "公交" },
                { id: "bicycling", icon: Bike, label: "骑行" },
                { id: "walking", icon: Footprints, label: "步行" },
              ].map((m) => {
                const Icon = m.icon;
                const active = mode === m.id;
                return (
                  <button
                    key={m.id}
                    onClick={() => setMode(m.id as TravelMode)}
                    className={cn(
                      "relative flex-1 flex flex-col items-center gap-1.5 py-3 text-[10px] font-bold rounded-lg transition-all",
                      active
                        ? "text-[#5A5A40] shadow-sm"
                        : "text-[#8E8A82] hover:text-[#5A5A40] hover:bg-[#E5E0D8]/50",
                    )}
                  >
                    {active && (
                      <motion.div
                        layoutId="mode-bg"
                        className="absolute inset-0 bg-white -z-10 rounded-lg"
                      />
                    )}
                    <Icon className="w-[18px] h-[18px]" />
                    <span>{m.label}</span>
                  </button>
                );
              })}
            </div>

            {/* Calculate Action */}
            <button
              onClick={calculateRoutes}
              disabled={!origin || destinations.length === 0 || isCalculating}
              className="w-full flex items-center justify-center gap-2 py-4 rounded-xl bg-[#5A5A40] text-white font-bold tracking-tight transition-all active:scale-[0.98] disabled:opacity-50 disabled:active:scale-100 hover:bg-[#4A4A35] shadow-md group shrink-0"
            >
              {isCalculating ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <Compass className="w-5 h-5 transition-transform group-hover:rotate-45" />
              )}
              <span>并发计算与绘制概览路线</span>
            </button>

            {/* Commute Housing Search Range Panel */}
            <GlassPanel className="p-4 mt-2">
              <h3 className="text-sm font-bold tracking-wide text-[#2D2A26] flex items-center gap-2 mb-3">
                <Home className="w-4 h-4 text-[#5A5A40]" />
                通勤找房带分析 (外扩)
              </h3>
              <div className="flex flex-col gap-4">
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-medium text-[#8E8A82] flex justify-between">
                    <span>最大骑行接驳时间</span>
                    <span className="font-mono text-[#5A5A40]">
                      {maxCycleMins} 分钟
                    </span>
                  </label>
                  <input
                    type="range"
                    min="5"
                    max="30"
                    step="5"
                    value={maxCycleMins}
                    onChange={(e) => setMaxCycleMins(parseInt(e.target.value))}
                    className="w-full h-1.5 bg-[#E5E0D8] rounded-full appearance-none outline-none [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:bg-[#5A5A40] [&::-webkit-slider-thumb]:rounded-full cursor-pointer"
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-medium text-[#8E8A82] flex justify-between">
                    <span>最大通勤时间 (含骑行+地铁)</span>
                    <span className="font-mono text-[#5A5A40]">
                      {maxCommuteMins} 分钟
                    </span>
                  </label>
                  <input
                    type="range"
                    min="15"
                    max="90"
                    step="5"
                    value={maxCommuteMins}
                    onChange={(e) =>
                      setMaxCommuteMins(parseInt(e.target.value))
                    }
                    className="w-full h-1.5 bg-[#E5E0D8] rounded-full appearance-none outline-none [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:bg-[#5A5A40] [&::-webkit-slider-thumb]:rounded-full cursor-pointer"
                  />
                </div>
                <div className="flex gap-2 mt-1">
                  <button
                    onClick={() =>
                      calculateCommuteRange(
                        origin,
                        maxCycleMins,
                        maxCommuteMins,
                      )
                    }
                    disabled={isCommuteCalculating}
                    className={`flex-1 py-2 text-xs font-bold rounded-lg border transition-colors ${
                      isCommuteCalculating
                        ? "bg-[#E5E0D8] text-[#8E8A82] border-transparent cursor-not-allowed"
                        : "bg-[#F0EDE5] hover:bg-[#E5E0D8] text-[#5A5A40] border-[#E5E0D8]"
                    }`}
                  >
                    {isCommuteCalculating
                      ? "正在精准测算换乘用时..."
                      : "计算可接受通勤范围"}
                  </button>
                  {commuteOverlaysCount > 0 && (
                    <button
                      onClick={clearCommuteOverlays}
                      className="py-2 px-3 bg-red-50 hover:bg-red-100 text-red-600 text-xs font-bold rounded-lg border border-red-100 transition-colors"
                    >
                      清除
                    </button>
                  )}
                </div>
                <p className="text-[10px] text-[#A39E93] leading-relaxed">
                  基于起点位置寻找附近地铁站，并沿地铁线路由内向外（远离市中心方向）扩散，标识在指定通勤时间内的所有潜在租房区域站点。请确保已在地图菜单中生成地铁路线。
                </p>
              </div>
            </GlassPanel>

            {/* Results */}
            {Object.keys(results).length > 0 && (
              <div className="flex flex-col gap-3 mt-2 pb-4">
                <h3 className="text-sm font-bold tracking-wide text-[#2D2A26] flex items-center gap-2">
                  <div className="w-4 h-[1px] bg-[#E5E0D8]" />
                  并发路线分析结果
                  <div className="flex-1 h-[1px] bg-[#E5E0D8]" />
                </h3>

                {destinations.map((dest, index) => {
                  const result = results[dest.id];
                  if (!result) return null;

                  return (
                    <RouteResultItem
                      key={dest.id}
                      result={result}
                      mode={mode}
                      destName={dest.name}
                      isExpanded={expandedDestId === dest.id}
                      onToggleExpand={() =>
                        setExpandedDestId(
                          expandedDestId === dest.id ? null : dest.id,
                        )
                      }
                      index={index}
                    />
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Right Map */}
      <div className="flex-1 min-h-0 w-full relative z-10 bg-[#F0EDE5]">
        <div ref={mapRef} className="absolute inset-0 w-full h-full" />

        {/* Map Style Controls */}
        <MapStyleMenu
          mapStyle={mapStyle}
          showSatellite={showSatellite}
          showSubway={showSubway}
          isMenuOpen={isMapStyleMenuOpen}
          onSetMapStyle={(style) => {
            setMapStyle(style);
            setShowSatellite(false);
            setShowSubway(false);
            setIsMapStyleMenuOpen(false);
          }}
          onToggleSatellite={() => {
            setShowSatellite(!showSatellite);
            setShowSubway(false);
            setIsMapStyleMenuOpen(false);
          }}
          onToggleSubway={() => {
            setShowSubway(!showSubway);
            setShowSatellite(false);
            setIsMapStyleMenuOpen(false);
          }}
          onToggleMenu={() => setIsMapStyleMenuOpen(!isMapStyleMenuOpen)}
        />
        <FilterModeMenu
          filterMode={filterMode}
          isMenuOpen={isFilterModeMenuOpen}
          onSetFilterMode={setFilterMode}
          onToggleMenu={() => setIsFilterModeMenuOpen(!isFilterModeMenuOpen)}
        />
      </div>
    </div>
  );
};
