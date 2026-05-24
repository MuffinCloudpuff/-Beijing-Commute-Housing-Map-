import { useState, useRef } from "react";
import { buildSubwayGraph, findCommuteRange } from "../utils/commuteAlgo";

export const useCommuteSearch = (
  amap: any,
  mapInstance: any,
  subwayData: any[],
) => {
  const [commuteOverlays, setCommuteOverlays] = useState<any[]>([]);
  const [isCalculating, setIsCalculating] = useState(false);
  const isCalculatingRef = useRef(false);

  const clearCommuteOverlays = () => {
    commuteOverlays.forEach((o) => o.setMap(null));
    setCommuteOverlays([]);
  };

  const calculateCommuteRange = async (
    origin: { lat: number; lng: number } | null,
    maxCycleMins: number,
    maxCommuteMins: number,
  ) => {
    if (!amap || !mapInstance) return;
    if (!origin) {
      alert("请先设置一个起点位置！");
      return;
    }
    if (isCalculatingRef.current) return;

    if (!subwayData || subwayData.length === 0) {
      alert("地图还在后台加载地铁网络数据，请稍候几秒再尝试进行通勤分析。");
      return;
    }

    isCalculatingRef.current = true;
    setIsCalculating(true);
    clearCommuteOverlays();
    const newOverlays: any[] = [];

    try {
      // 1. Build Network Graph
      const graph = await buildSubwayGraph(amap, subwayData);

      // 2. Add Exclusion Circle Overlay (centered at Tiananmen, radius = origin to Tiananmen distance)
      const originLocArray = [origin.lng, origin.lat];
      const CITY_CENTER = [116.397428, 39.90923];
      const originDistToCenter = amap.GeometryUtil.distance(
        originLocArray,
        CITY_CENTER,
      );

      const exclusionCircle = new amap.Circle({
        center: CITY_CENTER,
        radius: originDistToCenter,
        strokeColor: "#F33",
        strokeOpacity: 0.2,
        strokeWeight: 1,
        fillColor: "#F33",
        fillOpacity: 0.05,
        map: mapInstance,
      });
      newOverlays.push(exclusionCircle);

      // 3. Find Stations
      const { finalStationTimes } = await findCommuteRange(
        amap,
        graph,
        subwayData,
        origin,
        maxCycleMins,
        maxCommuteMins,
      );

      // 4. Render Valid Stations
      if (Object.keys(finalStationTimes).length === 0) {
        alert(
          "所选出发地周边(骑行范围内)无地铁站，或搜索范围过小导致无合适结果。",
        );
      }

      Object.keys(finalStationTimes).forEach((stationName) => {
        const node = graph[stationName];
        const commuteTime = Math.round(finalStationTimes[stationName]);

        const marker = new amap.CircleMarker({
          center: node.location,
          radius: 8,
          fillColor: "#84CC16",
          fillOpacity: 0.9,
          strokeColor: "#3F6212",
          strokeWeight: 2,
          zIndex: 200,
          map: mapInstance,
          bubble: true,
        });

        const label = new amap.Text({
          text: `${node.name}\n${commuteTime}分钟`,
          position: node.location,
          offset: new amap.Pixel(0, -28),
          style: {
            "background-color": "#3F6212",
            "border-radius": "6px",
            border: "1px solid #166534",
            color: "#FFFFFF",
            "font-size": "10px",
            "font-weight": "bold",
            padding: "4px 6px",
            "text-align": "center",
            "box-shadow": "0 4px 6px -1px rgb(0 0 0 / 0.1)",
          },
          zIndex: 210,
          map: mapInstance,
        });

        newOverlays.push(marker);
        newOverlays.push(label);
      });

      setCommuteOverlays(newOverlays);
    } catch (err) {
      console.error("Commute Calculation Error: ", err);
      alert("计算扩散通勤范围时发生错误");
    } finally {
      isCalculatingRef.current = false;
      setIsCalculating(false);
    }
  };

  return {
    calculateCommuteRange,
    clearCommuteOverlays,
    commuteOverlaysCount: commuteOverlays.length,
    isCalculating,
  };
};
