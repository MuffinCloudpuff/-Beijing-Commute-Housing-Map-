import { safeGetStorage, safeSetStorage } from "./storage";

export const CITY_CENTER = [116.397428, 39.90923];

export const getTransferTime = async (
  amap: any,
  transferStation: string,
  fromLine: string,
  toLine: string,
  subwayData: any[],
) => {
  const keyParts = [fromLine, toLine].sort();
  const cacheKey = `transfer_time_${transferStation}_${keyParts[0]}_${keyParts[1]}`;
  let cache: Record<string, number> = {};
  try {
    cache = JSON.parse(safeGetStorage("subway_transfer_times") || "{}");
  } catch (e) {}

  if (cache[cacheKey]) {
    return cache[cacheKey];
  }

  let defaultTime = 5;

  const fromLineData = subwayData.find((l: any) => l.lineName === fromLine);
  const toLineData = subwayData.find((l: any) => l.lineName === toLine);

  if (!fromLineData || !toLineData) return defaultTime;

  const idx1 = fromLineData.stops.findIndex(
    (s: any) => s.name === transferStation,
  );
  const idx2 = toLineData.stops.findIndex(
    (s: any) => s.name === transferStation,
  );

  if (idx1 === -1 || idx2 === -1) return defaultTime;

  const stationA = fromLineData.stops[idx1 > 0 ? idx1 - 1 : idx1 + 1];
  const stationC =
    toLineData.stops[idx2 < toLineData.stops.length - 1 ? idx2 + 1 : idx2 - 1];

  if (!stationA || !stationC) return defaultTime;

  return new Promise<number>((resolve) => {
    amap.plugin(["AMap.Transfer"], () => {
      const transfer = new amap.Transfer({ city: "北京", nightflag: false });
      transfer.search(
        stationA.location,
        stationC.location,
        (status: string, result: any) => {
          let tTime = defaultTime;
          if (
            status === "complete" &&
            result.plans &&
            result.plans.length > 0
          ) {
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
              // The remaining time is walking and waiting (transfer penalty).
              // We deduct a fixed ~6 mins for walking into the first station and walking out of the last station.
              tTime = (plan.time - rideTimeSeconds) / 60 - 6;
            } else {
              const fromTime = fromLineData.avgTimePerStop || 3;
              const toTime = toLineData.avgTimePerStop || 3;
              tTime = plan.time / 60 - fromTime - toTime;
            }

            if (tTime < 2) tTime = 2; // min transfer
            if (tTime > 15) tTime = 15; // cap to 15 mins

            cache[cacheKey] = tTime;
            safeSetStorage(
              "subway_transfer_times",
              JSON.stringify(cache),
            );
          }
          resolve(tTime);
        },
      );
    });
  });
};

export const getSegmentTime = async (
  amap: any,
  stopA: any,
  stopB: any,
  lineName: string,
  defaultTime: number,
) => {
  const cacheKey = `segment_time_${lineName}_${stopA.name}_${stopB.name}`;
  let cache: Record<string, number> = {};
  try {
    cache = JSON.parse(safeGetStorage("subway_segment_times") || "{}");
  } catch (e) {}

  if (cache[cacheKey]) {
    return cache[cacheKey];
  }

  return new Promise<number>((resolve) => {
    amap.plugin(["AMap.Transfer"], () => {
      const transfer = new amap.Transfer({ city: "北京", nightflag: false });
      transfer.search(
        stopA.location,
        stopB.location,
        (status: string, result: any) => {
          let tTime = defaultTime;
          if (
            status === "complete" &&
            result.plans &&
            result.plans.length > 0
          ) {
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
              tTime = rideTimeSeconds / 60;
            } else {
              tTime = plan.time / 60 - 8;
            }
            if (tTime > 20) tTime = 20; // safe bounds
            if (tTime < 1) tTime = 1;

            cache[cacheKey] = tTime;
            safeSetStorage("subway_segment_times", JSON.stringify(cache));
          }
          resolve(tTime);
        },
      );
    });
  });
};

export const getRealPathDistance = (
  amap: any,
  stopA: any,
  stopB: any,
  pathArr: any[],
) => {
  if (!pathArr || pathArr.length === 0) {
    return amap.GeometryUtil.distance(
      [stopA.location.lng, stopA.location.lat],
      [stopB.location.lng, stopB.location.lat],
    );
  }

  let minA = Infinity;
  let idxA = 0;
  let minB = Infinity;
  let idxB = 0;

  for (let i = 0; i < pathArr.length; i++) {
    const p = pathArr[i];
    const pLng = p.lng || p[0];
    const pLat = p.lat || p[1];
    const distA = amap.GeometryUtil.distance(
      [stopA.location.lng, stopA.location.lat],
      [pLng, pLat],
    );
    if (distA < minA) {
      minA = distA;
      idxA = i;
    }
    const distB = amap.GeometryUtil.distance(
      [stopB.location.lng, stopB.location.lat],
      [pLng, pLat],
    );
    if (distB < minB) {
      minB = distB;
      idxB = i;
    }
  }

  const startIdx = Math.min(idxA, idxB);
  const endIdx = Math.max(idxA, idxB);

  let realDist = 0;
  for (let i = startIdx; i < endIdx; i++) {
    const p1 = pathArr[i];
    const p2 = pathArr[i + 1];
    const lng1 = p1.lng || p1[0];
    const lat1 = p1.lat || p1[1];
    const lng2 = p2.lng || p2[0];
    const lat2 = p2.lat || p2[1];
    if (lng1 && lat1 && lng2 && lat2) {
      realDist += amap.GeometryUtil.distance([lng1, lat1], [lng2, lat2]);
    }
  }

  return realDist;
};

export const buildSubwayGraph = async (amap: any, subwayData: any[]) => {
  const graph: Record<string, any> = {};

  for (const line of subwayData) {
    const stops = line.stops;
    const totalStops = stops.length;

    let avgDist = 1200; // default for Chinese subway
    if (totalStops >= 3) {
      const startIndex = Math.floor(totalStops * 0.1);
      const endIndex = Math.floor(totalStops * 0.9);
      let totalDist = 0;
      let count = 0;
      for (let i = startIndex; i < endIndex; i++) {
        const dist = getRealPathDistance(
          amap,
          stops[i],
          stops[i + 1],
          line.path,
        );
        totalDist += dist;
        count++;
      }
      if (count > 0) {
        avgDist = totalDist / count;
      }
    }

    let lineSpeedMpm = line.avgTimePerStop;
    if (!lineSpeedMpm || lineSpeedMpm < 1.5) lineSpeedMpm = 1.5;

    for (let idx = 0; idx < stops.length; idx++) {
      const stop = stops[idx];
      if (!graph[stop.name]) {
        graph[stop.name] = {
          name: stop.name,
          location: stop.location,
          lines: [],
          edges: [],
          distToCenter: amap.GeometryUtil.distance(
            [stop.location.lng, stop.location.lat],
            CITY_CENTER,
          ),
        };
      }
      if (!graph[stop.name].lines.includes(line.lineName)) {
        graph[stop.name].lines.push(line.lineName);
      }

      if (idx > 0) {
        const prevStop = stops[idx - 1];
        const prevLocArr = [prevStop.location.lng, prevStop.location.lat];
        const stopLocArr = [stop.location.lng, stop.location.lat];

        let time = lineSpeedMpm + 0.5; // +0.5 mins for station dwell time

        if (avgDist > 0) {
          const realDist = getRealPathDistance(amap, prevStop, stop, line.path);
          if (realDist > avgDist * 1.2) {
            // If the distance between two stations is significantly larger (20%+) than average, fetch real transit time
            time = await getSegmentTime(
              amap,
              prevStop,
              stop,
              line.lineName,
              time,
            );
          }
        }

        graph[stop.name].edges.push({
          target: prevStop.name,
          line: line.lineName,
          time,
        });
        graph[prevStop.name].edges.push({
          target: stop.name,
          line: line.lineName,
          time,
        });
      }
    }
  }

  return graph;
};

export const findCommuteRange = async (
  amap: any,
  graph: Record<string, any>,
  subwayData: any[],
  origin: { lat: number; lng: number },
  maxCycleMins: number,
  maxCommuteMins: number,
) => {
  const cyclingSpeedMpm = (12 * 1000) / 60; // 12 km/h -> 200 meters/min
  const maxCyclingDist = maxCycleMins * cyclingSpeedMpm;

  const originLocArray = [origin.lng, origin.lat];
  const originDistToCenter = amap.GeometryUtil.distance(
    originLocArray,
    CITY_CENTER,
  );

  const initialStations: Array<{
    name: string;
    timeToReach: number;
  }> = [];

  Object.values(graph).forEach((s: any) => {
    const staticDist = amap.GeometryUtil.distance(originLocArray, [
      s.location.lng,
      s.location.lat,
    ]);
    if (staticDist <= maxCyclingDist) {
      const routeDist = staticDist * 1.4;
      const cycleTime = routeDist / cyclingSpeedMpm;

      if (cycleTime <= maxCycleMins) {
        initialStations.push({
          name: s.name,
          timeToReach: cycleTime,
        });
      }
    }
  });

  const pq: Array<{ name: string; time: number; line: string }> = [];
  const bestTimes: Record<string, number> = {};

  for (const s of initialStations) {
    const node = graph[s.name];
    for (const lName of node.lines) {
      const enterTime = s.timeToReach + 2; // 进站耗时 2 mins
      const key = `${s.name}_${lName}`;
      bestTimes[key] = enterTime;
      pq.push({ name: s.name, time: enterTime, line: lName });
    }
  }

  while (pq.length > 0) {
    pq.sort((a, b) => a.time - b.time);
    const current = pq.shift()!;

    if (current.time > maxCommuteMins) continue;

    const cNode = graph[current.name];

    for (const edge of cNode.edges) {
      if (edge.line === current.line) {
        const targetNode = graph[edge.target];

        const nextTime = current.time + edge.time;
        if (nextTime <= maxCommuteMins) {
          const bestKey = `${targetNode.name}_${current.line}`;
          if (!bestTimes[bestKey] || nextTime < bestTimes[bestKey]) {
            bestTimes[bestKey] = nextTime;
            pq.push({
              name: targetNode.name,
              time: nextTime,
              line: current.line,
            });
          }
        }
      }
    }

    for (const otherLine of cNode.lines) {
      if (otherLine !== current.line) {
        const transferTime = await getTransferTime(
          amap,
          current.name,
          current.line,
          otherLine,
          subwayData,
        );
        const nextTime = current.time + transferTime;

        if (nextTime <= maxCommuteMins) {
          const bestKey = `${current.name}_${otherLine}`;
          if (!bestTimes[bestKey] || nextTime < bestTimes[bestKey]) {
            bestTimes[bestKey] = nextTime;
            pq.push({
              name: current.name,
              time: nextTime,
              line: otherLine,
            });
          }
        }
      }
    }
  }

  const finalStationTimes: Record<string, number> = {};
  Object.keys(bestTimes).forEach((key) => {
    const stationName = key.split("_")[0];
    const time = bestTimes[key];
    const node = graph[stationName];

    // 只选“起点到天安门距离”为半径的圈外的地铁站（更靠外沿找房）
    if (node.distToCenter > originDistToCenter) {
      if (
        !finalStationTimes[stationName] ||
        time < finalStationTimes[stationName]
      ) {
        finalStationTimes[stationName] = time;
      }
    }
  });

  return { finalStationTimes, graph };
};
