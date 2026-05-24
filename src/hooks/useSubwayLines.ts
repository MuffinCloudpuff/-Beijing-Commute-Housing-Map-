import { useEffect, useState, useRef } from "react";

const BEIJING_SUBWAY_COLORS: Record<string, string> = {
  "1号线八通线": "#C23A30",
  "2号线": "#004B87",
  "4号线大兴线": "#008E9C",
  "5号线": "#AF005F",
  "6号线": "#D19416",
  "7号线": "#F3D284",
  "8号线": "#009977",
  "9号线": "#87D300",
  "10号线": "#009EDB",
  "11号线": "#ED796B",
  "13号线": "#F4DA40",
  "14号线": "#D4A7A1",
  "15号线": "#5C3A82",
  "16号线": "#7BA157",
  "17号线": "#00A6A9",
  "19号线": "#DDA1A0",
  昌平线: "#DE82B2",
  房山线: "#D86018",
  燕房线: "#D86018",
  亦庄线: "#D0006E",
  S1线: "#A45A2A",
  首都机场线: "#A2B0CC",
  大兴机场线: "#004A9E",
  西郊线: "#D22630",
  亦庄T1线: "#E4002B",
};

const BEIJING_SUBWAY_LINES = Object.keys(BEIJING_SUBWAY_COLORS);

const getLineAvgTime = async (amap: any, lineName: string, stopsArr: any[]) => {
  const cacheKey = "subway_avg_time_cache_v1";
  let cache: Record<string, number> = {};
  try {
    cache = JSON.parse(localStorage.getItem(cacheKey) || "{}");
  } catch (e) {}

  if (cache[lineName]) {
    return cache[lineName];
  }

  const totalStops = stopsArr.length;
  if (totalStops < 3) return 3; // default 3 mins

  const startIndex = Math.floor(totalStops * 0.1);
  const endIndex = Math.floor(totalStops * 0.9);
  const segments = endIndex - startIndex;
  if (segments <= 0) return 3;

  return new Promise<number>((resolve) => {
    const transfer = new amap.Transfer({ city: "北京", nightflag: false });
    transfer.search(
      stopsArr[startIndex].location,
      stopsArr[endIndex].location,
      (status: string, result: any) => {
        let avgTimeMins = 3;
        if (status === "complete" && result.plans && result.plans.length > 0) {
          const plan = result.plans[0];
          let rideTimeSeconds = 0;
          if (plan.segments) {
            plan.segments.forEach((seg: any) => {
              if (
                seg.transit &&
                seg.transit.lines &&
                seg.transit.lines.length > 0
              ) {
                rideTimeSeconds += seg.transit.lines[0].time;
              }
            });
          }

          if (rideTimeSeconds > 0) {
            avgTimeMins = rideTimeSeconds / 60 / segments;
          } else {
            avgTimeMins = plan.time / 60 / segments;
          }

          // constrain to realistic bounds (1.5 to 10 mins)
          if (avgTimeMins < 1.5) avgTimeMins = 1.5;
          if (avgTimeMins > 10) avgTimeMins = 10;

          cache[lineName] = avgTimeMins;
          localStorage.setItem(cacheKey, JSON.stringify(cache));
        }
        resolve(avgTimeMins);
      },
    );
  });
};

export const useSubwayLines = (
  amap: any,
  mapInstance: any,
  showSubway: boolean,
) => {
  const [subwayOverlays, setSubwayOverlays] = useState<any[]>([]);
  const [subwayData, setSubwayData] = useState<any[]>([]);
  const isFetchingRef = useRef(false);
  const hasLoadedRef = useRef(false);
  const dynamicOverlaysRef = useRef<any[]>([]);

  // 1. Fetch data once eagerly
  useEffect(() => {
    if (
      !amap ||
      !mapInstance ||
      hasLoadedRef.current ||
      isFetchingRef.current
    ) {
      return;
    }

    if (isFetchingRef.current) return;
    isFetchingRef.current = true;
    
    // We will build the new data and then set it to state
    const fetchedSubwayData: any[] = [];

    amap.plugin(["AMap.LineSearch", "AMap.Transfer"], () => {
      const lineSearch = new amap.LineSearch({
        pageIndex: 1,
        city: "北京",
        pageSize: 5,
        extensions: "all",
      });

      const newOverlays: any[] = [];

      // Fetch each line sequentially
      const fetchLines = async () => {
        for (const lineName of BEIJING_SUBWAY_LINES) {
          await new Promise<void>((resolve) => {
            lineSearch.search(lineName, async (status: string, result: any) => {
              if (status === "complete" && result.info === "OK") {
                const lineArr = result.lineInfo;
                if (lineArr && lineArr.length > 0) {
                  const pathArr = lineArr[0].path || [];
                  let stopsArr: any[] = [];
                  let seenStopNames = new Set<string>();

                  lineArr.forEach((lineItem: any) => {
                    if (lineItem.via_stops) {
                      lineItem.via_stops.forEach((stop: any) => {
                        if (!seenStopNames.has(stop.name)) {
                          seenStopNames.add(stop.name);
                          stopsArr.push(stop);
                        }
                      });
                    }
                  });

                  const lineColor =
                    BEIJING_SUBWAY_COLORS[lineName] || "#A7CDF3";

                  const polyline = new amap.Polyline({
                    path: pathArr,
                    strokeColor: lineColor,
                    strokeWeight: 5,
                    strokeOpacity: 0.9,
                    strokeStyle: "solid",
                    zIndex: 50,
                    map: mapInstance,
                    bubble: true, // Allow events to bubble if needed
                    visible: showSubway,
                  });

                  let stationOverlays: any[] = [];
                  let areStopsRendered = false;
                  let lineHoverTimer: any = null;

                  const avgTime = await getLineAvgTime(
                    amap,
                    lineName,
                    stopsArr,
                  );

                  // Add to data array for commute search
                  fetchedSubwayData.push({
                    lineName,
                    stops: stopsArr,
                    path: pathArr,
                    color: lineColor,
                    avgTimePerStop: avgTime,
                  });

                  const renderStops = () => {
                    if (areStopsRendered) return;
                    areStopsRendered = true;

                    stopsArr.forEach((stop: any) => {
                      const stationMarker = new amap.CircleMarker({
                        center: stop.location,
                        radius: 4,
                        fillColor: "#FFFFFF",
                        fillOpacity: 1,
                        strokeColor: lineColor,
                        strokeWeight: 2,
                        zIndex: 55,
                        map: mapInstance,
                        bubble: true,
                        cursor: "pointer",
                      });

                      const infoText = new amap.Text({
                        text: stop.name,
                        position: stop.location,
                        offset: new amap.Pixel(0, -15),
                        style: {
                          "background-color": "rgba(255, 255, 255, 0.9)",
                          border: `1px solid ${lineColor}`,
                          "border-radius": "4px",
                          color: "#333",
                          "font-size": "10px",
                          padding: "2px 4px",
                        },
                        zIndex: 65,
                        map: mapInstance,
                      });

                      stationMarker.on("mouseover", () => {
                        showLineDetails();
                        stationMarker.setOptions({
                          radius: 6,
                          fillColor: lineColor,
                          strokeColor: "#FFFFFF",
                        });
                      });
                      stationMarker.on("mouseout", () => {
                        hideLineDetails();
                        stationMarker.setOptions({
                          radius: 4,
                          fillColor: "#FFFFFF",
                          strokeColor: lineColor,
                        });
                      });

                      infoText.on("mouseover", showLineDetails);
                      infoText.on("mouseout", hideLineDetails);

                      stationOverlays.push(stationMarker, infoText);
                      dynamicOverlaysRef.current.push(stationMarker, infoText);
                    });
                  };

                  const showLineDetails = () => {
                    if (lineHoverTimer) clearTimeout(lineHoverTimer);
                    polyline.setOptions({ strokeOpacity: 1, strokeWeight: 8 });
                    renderStops();
                    stationOverlays.forEach((o) => o.show());
                  };

                  const hideLineDetails = () => {
                    lineHoverTimer = setTimeout(() => {
                      polyline.setOptions({
                        strokeOpacity: 0.9,
                        strokeWeight: 5,
                      });
                      stationOverlays.forEach((o) => o.hide());
                    }, 100);
                  };

                  // Add text marker at midpoint
                  const midpoint =
                    pathArr.length > 0
                      ? pathArr[Math.floor(pathArr.length / 2)]
                      : null;

                  if (midpoint) {
                    const textMarker = new amap.Text({
                      text: lineName,
                      position: midpoint,
                      anchor: "center",
                      style: {
                        "background-color": "#FFFFFF",
                        border: `2px solid ${lineColor}`,
                        "border-radius": "12px",
                        color: lineColor,
                        "font-size": "12px",
                        "font-weight": "bold",
                        padding: "2px 6px",
                        "box-shadow": "0 2px 4px rgba(0,0,0,0.1)",
                      },
                      zIndex: 60,
                      map: mapInstance,
                      visible: showSubway,
                    });

                    textMarker.on("mouseover", showLineDetails);
                    textMarker.on("mouseout", hideLineDetails);
                    newOverlays.push(textMarker);
                  }

                  polyline.on("mouseover", showLineDetails);
                  polyline.on("mouseout", hideLineDetails);
                  newOverlays.push(polyline);
                }
              }
              setTimeout(resolve, 150); // Small delay to prevent API limit
            });
          });
        }
        setSubwayOverlays(newOverlays);
        setSubwayData(fetchedSubwayData);
        isFetchingRef.current = false;
        hasLoadedRef.current = true;
      };

      fetchLines();
    });
  }, [amap, mapInstance, showSubway]);

  // 2. Toggle visibility
  useEffect(() => {
    if (!subwayOverlays || subwayOverlays.length === 0) return;

    subwayOverlays.forEach((overlay) => {
      if (!showSubway) {
        overlay.hide();
      } else {
        overlay.show();
      }
    });

    if (!showSubway) {
      dynamicOverlaysRef.current.forEach((o) => o.hide());
    }
  }, [showSubway, subwayOverlays]);

  // 3. Cleanup on unmount
  useEffect(() => {
    return () => {
      subwayOverlays.forEach((overlay) => {
        if (overlay && overlay.setMap) {
          overlay.setMap(null);
        }
      });
      dynamicOverlaysRef.current.forEach((overlay) => {
        if (overlay && overlay.setMap) {
          overlay.setMap(null);
        }
      });
    };
  }, [subwayOverlays]);

  return { subwayData };
};
