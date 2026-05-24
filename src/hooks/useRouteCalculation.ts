import { useState, Dispatch, SetStateAction } from 'react';
import { LocationPoint, RouteResult, TravelMode, RouteSegmentData } from '../types/navigation';
import { DEST_COLORS } from '../constants/navigation';
import { pLimit } from '../utils/async';
import { searchRoute, getBikeRoute, findNearestSubway } from '../utils/routeHelpers';

export const useRouteCalculation = (
  amap: any,
  origin: LocationPoint | null,
  destinations: LocationPoint[],
  mode: TravelMode,
  results: Record<string, RouteResult>,
  setResults: Dispatch<SetStateAction<Record<string, RouteResult>>>,
  setDestinations: Dispatch<SetStateAction<LocationPoint[]>>,
  checkLocationExcluded: (dest: LocationPoint) => boolean,
  lastCalcParams: { originId: string; mode: TravelMode } | null,
  setLastCalcParams: Dispatch<SetStateAction<{ originId: string; mode: TravelMode } | null>>,
  setIsCalculating: Dispatch<SetStateAction<boolean>>
) => {

  const calculateRoutes = async () => {
    if (!origin || destinations.length === 0 || !amap) return;
    
    setIsCalculating(true);

    let currentResults = { ...results };
    let recalculateAll = false;
    
    if (!lastCalcParams || lastCalcParams.originId !== origin.id || lastCalcParams.mode !== mode) {
        recalculateAll = true;
        currentResults = {};
    }

    setLastCalcParams({ originId: origin.id, mode });
    
    const originLngLat = new amap.LngLat(origin.lng, origin.lat);
    
    // Calculate routes concurrently with limit 1 to avoid QPS limit
    const limit = pLimit(1);
    await Promise.all(destinations.map((dest, i) => limit(async () => {
      if (checkLocationExcluded(dest)) {
          // Excluded, ignore
          currentResults[dest.id] = {
              destId: dest.id,
              distance: -1,
              duration: -1,
              color: '#d1d5db', // Grey out
              path: [],
              error: '已排除该区域'
          };
          return;
      }

      await new Promise(r => setTimeout(r, 600)); // Delay to avoid QPS limit
      const color = DEST_COLORS[i % DEST_COLORS.length];
      
      if (!recalculateAll && currentResults[dest.id] && !currentResults[dest.id].error && currentResults[dest.id].duration !== -1) {
          currentResults[dest.id] = {
              ...currentResults[dest.id],
              color: color
          };
          return;
      }

      const destLngLat = new amap.LngLat(dest.lng, dest.lat);
      
      // If distance is extremely small, AMap routing will fail or it's unnecessary
      if (Math.round(originLngLat.distance(destLngLat)) <= 10) {
         currentResults[dest.id] = {
           destId: dest.id,
           distance: 0,
           duration: 0,
           color: color,
           path: [originLngLat, destLngLat],
           error: '起终点距离过近'
         };
         return;
      }

      let routingService: any;
      if (mode === 'transit') routingService = new amap.Transfer({ city: '全国' });
      else if (mode === 'driving') routingService = new amap.Driving();
      else if (mode === 'walking') routingService = new amap.Walking();
      else if (mode === 'bicycling') routingService = new amap.Bicycling();

      const result = await searchRoute(routingService, originLngLat, destLngLat);
      
      if (!result.error && result.info === 'OK') {
        let route: any;
        let path: any[] = [];
        let displayDuration = 0;
        let segmentsData: RouteSegmentData[] = [];
        
        if (mode === 'transit') {
            let originSubway = await findNearestSubway(amap, originLngLat);
            let destSubway = await findNearestSubway(amap, destLngLat);

            // If we still can't find subway stations, just fallback
            if (originSubway && destSubway) {
                // Request transit between subway stations
                const transferService = new amap.Transfer({ city: dest.city || '全国' });
                // We do not need the while loops for this simple native call if we rely on AMAP
                let subwayTransit: any = null;
                try {
                    subwayTransit = await new Promise((resolve) => {
                        transferService.search(originSubway.location, destSubway.location, (status: string, st: any) => {
                            if (status === 'complete' && st.info === 'OK') resolve(st);
                            else resolve(null);
                        });
                    });
                } catch(e) { /* ignore */ }

                if (subwayTransit && subwayTransit.plans && subwayTransit.plans.length > 0) {
                    const plan = subwayTransit.plans[0];
                    const bikeFirst = await getBikeRoute(amap, originLngLat, originSubway.location);
                    const bikeLast = await getBikeRoute(amap, destSubway.location, destLngLat);
                    
                    let subwayTotalTime = Number(plan.time);
                    let computedDisplayDuration = bikeFirst.time + bikeLast.time + subwayTotalTime;
                    let standardPlan = result.plans[0];
                    let standardDuration = Number(standardPlan.time);

                    if (Math.abs(computedDisplayDuration - standardDuration) > 1800) {
                        // Fallback to normal transit logic because discrepancy > 30 mins
                        const plan = standardPlan;
                        route = plan;
                        displayDuration = standardDuration;
                        plan.segments.forEach((seg: any) => {
                            if (seg.walking) {
                                 seg.walking.steps?.forEach((step: any) => path.push(...step.path));
                                 segmentsData.push({ type: 'walk', instruction: `步行 ${seg.walking.distance}米`, duration: seg.walking.time || 0, distance: seg.walking.distance || 0});
                            }
                            if (seg.transit) {
                                 path.push(...seg.transit.path);
                                 const isSubway = seg.transit.lines && seg.transit.lines[0] && (seg.transit.lines[0].type === '地铁路线' || seg.transit.lines[0].name.includes('地铁'));
                                 segmentsData.push({ type: isSubway ? 'subway' : 'bus', instruction: `乘坐 ${seg.transit.lines?.[0]?.name || '公交'} (${seg.transit.onStation?.name || ''} - ${seg.transit.offStation?.name || ''})`, duration: seg.transit.time || 0, distance: seg.transit.distance || 0});
                            }
                        });
                    } else {
                        segmentsData.push({
                            type: 'bike',
                            instruction: `骑行前往起点地铁站：${originSubway.name}`,
                            duration: bikeFirst.time,
                            distance: bikeFirst.distance
                        });
                        path.push(...bikeFirst.path);

                        let subwayName = '地铁';

                        // Extrapolate exact subway name from the plan if present
                        plan.segments.forEach((seg: any) => {
                            if (seg.transit && seg.transit.path) {
                                 path.push(...seg.transit.path);
                                 const lines = seg.transit.lines;
                                 if (lines && lines.length > 0) subwayName = lines[0].name;
                            }
                        });

                        segmentsData.push({
                            type: 'subway',
                            instruction: `乘坐 ${subwayName} (${originSubway.name} -> ${destSubway.name})`,
                            duration: subwayTotalTime,
                            distance: Number(plan.distance)
                        });

                        segmentsData.push({
                            type: 'bike',
                            instruction: `从 ${destSubway.name} 骑行前往终点`,
                            duration: bikeLast.time,
                            distance: bikeLast.distance
                        });
                        path.push(...bikeLast.path);

                        displayDuration = computedDisplayDuration;
                        route = { distance: bikeFirst.distance + bikeLast.distance + Number(plan.distance), transit_fee: plan.cost };
                    }
                } else {
                    // Fallback to normal transit logic
                    const plan = result.plans[0];
                    route = plan;
                    displayDuration = Number(plan.time);
                    plan.segments.forEach((seg: any) => {
                        if (seg.walking) {
                             seg.walking.steps?.forEach((step: any) => path.push(...step.path));
                             segmentsData.push({ type: 'walk', instruction: `步行 ${seg.walking.distance}米`, duration: seg.walking.time, distance: seg.walking.distance});
                        }
                        if (seg.transit) {
                             path.push(...seg.transit.path);
                             segmentsData.push({ type: 'bus', instruction: `乘坐公交/地铁 (${seg.transit.onStation?.name || ''})`, duration: seg.transit.time, distance: seg.transit.distance});
                        }
                    });
                }
            } else {
                // Completely fallback if no subways
                const plan = result.plans[0];
                route = plan;
                displayDuration = Number(plan.time);
                plan.segments.forEach((seg: any) => {
                    if (seg.walking) {
                         seg.walking.steps?.forEach((step: any) => path.push(...step.path));
                         segmentsData.push({ type: 'walk', instruction: `步行 ${seg.walking.distance}米`, duration: seg.walking.time, distance: seg.walking.distance});
                    }
                    if (seg.transit) {
                         path.push(...seg.transit.path);
                         segmentsData.push({ type: 'bus', instruction: `乘坐公交/地铁 (${seg.transit.onStation?.name || ''})`, duration: seg.transit.time, distance: seg.transit.distance});
                    }
                });
            }
          } else {
            route = result.routes[0];
            displayDuration = route.time;
            route.steps.forEach((step: any) => {
               path.push(...step.path);
               segmentsData.push({
                   type: mode === 'walking' ? 'walk' : mode === 'bicycling' ? 'bike' : 'drive',
                   instruction: step.instruction,
                   duration: step.time || 0,
                   distance: step.distance || 0
               });
            });
          }
          currentResults[dest.id] = {
            destId: dest.id,
            distance: route.distance,
            duration: displayDuration,
            color: color,
            path: path,
            cost: mode === 'transit' ? parseFloat(route.transit_fee || route.cost || "0") : undefined,
            segmentsData
          };
      } else {
          console.error('Route error:', result);
          currentResults[dest.id] = {
            destId: dest.id,
            distance: 0,
            duration: 0,
            color: color,
            path: [],
            error: result.error
          };
      }
    })));

    const sortedDestinations = [...destinations].sort((a, b) => {
        const resA = currentResults[a.id];
        const resB = currentResults[b.id];
        const durA = resA && !resA.error ? resA.duration : Infinity;
        const durB = resB && !resB.error ? resB.duration : Infinity;
        return durA - durB;
    });

    sortedDestinations.forEach((dest, i) => {
        const color = DEST_COLORS[i % DEST_COLORS.length];
        if (currentResults[dest.id]) {
            currentResults[dest.id].color = color;
        }
    });

    setDestinations(sortedDestinations);
    setResults(currentResults);
    setIsCalculating(false);
  };

  return { calculateRoutes };
};
