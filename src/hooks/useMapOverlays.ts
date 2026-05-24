import { useEffect, MutableRefObject } from 'react';
import { LocationPoint, RouteResult } from '../types/navigation';
import { DEST_COLORS } from '../constants/navigation';

export const useMapOverlays = (
  amap: any,
  mapInstance: any,
  origin: LocationPoint | null,
  destinations: LocationPoint[],
  results: Record<string, RouteResult>,
  filterMode: 'district' | 'ring',
  excludedDistricts: string[],
  excludedRings: string[],
  districtPolygonsRef: MutableRefObject<any[]>,
  ringPolygonsRef: MutableRefObject<any[]>,
  markersRef: MutableRefObject<any[]>,
  polylineRefs: MutableRefObject<any[]>
) => {
  const checkLocationExcluded = (dest: LocationPoint): boolean => {
    if (!amap || !amap.GeometryUtil) return false;
    const point = new amap.LngLat(dest.lng, dest.lat);

    if (filterMode === 'district' && excludedDistricts.length > 0) {
        for (const item of districtPolygonsRef.current) {
            const districtName = item.polygon.getExtData().name;
            if (excludedDistricts.includes(districtName)) {
                if (amap.GeometryUtil.isPointInPolygon(point, item.polygon.getPath())) {
                    return true;
                }
            }
        }
    } else if (filterMode === 'ring' && excludedRings.length > 0) {
        for (const item of ringPolygonsRef.current) {
            const ringName = item.polygon.getExtData().name;
            if (excludedRings.includes(ringName)) {
                const path = item.polygon.getPath();
                const isInside = amap.GeometryUtil.isPointInPolygon(point, path);
                if (isInside) {
                    return true;
                }
            }
        }
    }

    return false;
  };

  useEffect(() => {
    if (!mapInstance || !amap) return;
    
    // Clear old elements
    markersRef.current.forEach(m => m.setMap(null));
    markersRef.current = [];
    polylineRefs.current.forEach((p: any) => p.setMap(null));
    polylineRefs.current = [];
    
    const overlayList: any[] = [];
    
    if (origin) {
      const originName = origin.name.length > 6 ? origin.name.substring(0, 5) + '...' : origin.name;
      const marker = new amap.Marker({
        position: new amap.LngLat(origin.lng, origin.lat),
        title: origin.name,
        content: `<div style="position: relative; display: flex; flex-direction: column; align-items: center;">
                    <img src="https://webapi.amap.com/theme/v1.3/markers/n/start.png" style="width: 19px; height: 33px; position: relative; z-index: 2;" />
                    <div style="position: absolute; top: 100%; left: 50%; transform: translateX(-50%); margin-top: 2px; background: white; padding: 3px 6px; border-radius: 6px; box-shadow: 0 2px 4px rgba(0,0,0,0.15); font-size: 11px; color: #2D2A26; font-weight: bold; white-space: nowrap; z-index: 1;">${originName}</div>
                  </div>`,
        offset: new amap.Pixel(-9.5, -33),
        map: mapInstance,
        zIndex: 100
      });
      markersRef.current.push(marker);
      overlayList.push(marker);
    }
    
    destinations.forEach((dest, i) => {
      const isExcluded = checkLocationExcluded(dest);
      const color = isExcluded ? '#9ca3af' : DEST_COLORS[i % DEST_COLORS.length];
      const destName = dest.name.length > 6 ? dest.name.substring(0, 5) + '...' : dest.name;
      const opacity = isExcluded ? 0.6 : 1;
      
      const marker = new amap.Marker({
        position: new amap.LngLat(dest.lng, dest.lat),
        title: dest.name,
        content: `<div style="position: relative; display: flex; flex-direction: column; align-items: center; opacity: ${opacity};">
                    <div style="width: 26px; height: 26px; background-color: ${color}; border: 2px solid white; border-radius: 50%; box-shadow: 0 2px 6px rgba(0,0,0,0.3); display: flex; align-items: center; justify-content: center; color: white; font-weight: bold; font-size: 13px; z-index: 2; position: relative;">${isExcluded ? '✕' : (i + 1)}</div>
                    <div style="position: absolute; top: 100%; left: 50%; transform: translateX(-50%); margin-top: 4px; background: white; padding: 3px 6px; border-radius: 6px; box-shadow: 0 2px 4px rgba(0,0,0,0.15); font-size: 11px; color: ${color}; font-weight: bold; white-space: nowrap; z-index: 1;">${destName}</div>
                  </div>`,
        offset: new amap.Pixel(-13, -13),
        map: mapInstance,
        zIndex: isExcluded ? 40 : 50
      });
      markersRef.current.push(marker);
      overlayList.push(marker);
    });

    Object.values(results).forEach((res: any) => {
       if (res.path && res.path.length > 0) {
          const polyline = new amap.Polyline({
            path: res.path,
            strokeColor: res.color,
            strokeWeight: 6,
            strokeOpacity: 0.8,
            showDir: true,
            map: mapInstance,
            lineJoin: 'round',
            lineCap: 'round',
            zIndex: 10
          });
          polylineRefs.current.push(polyline);
          overlayList.push(polyline);

          const midIndex = Math.floor(res.path.length / 2);
          const midPoint = res.path[midIndex];
          if (midPoint) {
            const min = Math.ceil(res.duration / 60);
            const durationText = min < 60 ? `${min} 分钟` : `${Math.floor(min / 60)}小时 ${min % 60}分钟`;
            const labelMarker = new amap.Marker({
              position: new amap.LngLat(midPoint.lng, midPoint.lat),
              content: `<div style="background-color: white; border: 2px solid ${res.color}; color: ${res.color}; padding: 3px 8px; border-radius: 12px; font-weight: bold; font-size: 11px; box-shadow: 0 2px 4px rgba(0,0,0,0.2); white-space: nowrap; opacity: 0.95;">${durationText}</div>`,
              offset: new amap.Pixel(-20, -15),
              map: mapInstance,
              zIndex: 60
            });
            polylineRefs.current.push(labelMarker);
            overlayList.push(labelMarker);
          }
       }
    });

    if (overlayList.length > 0) {
      mapInstance.setFitView(overlayList);
    }
  }, [results, origin, destinations, mapInstance, amap, excludedDistricts, excludedRings, filterMode]);

  return { checkLocationExcluded };
};
