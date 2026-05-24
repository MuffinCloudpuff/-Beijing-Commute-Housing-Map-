import React, { useEffect } from 'react';

const TIANANMEN_CENTER = [116.397428, 39.90923];

const generateCirclePath = (amap: any, center: number[], radius: number, numPoints = 64) => {
    const path: any[] = [];
    const earthRadius = 6378137;
    for (let i = 0; i < numPoints; i++) {
        const angle = (i / numPoints) * Math.PI * 2;
        const dx = radius * Math.cos(angle);
        const dy = radius * Math.sin(angle);
        const lat = center[1] + (dy / earthRadius) * (180 / Math.PI);
        const lng = center[0] + (dx / earthRadius) * (180 / Math.PI) / Math.cos(center[1] * Math.PI / 180);
        path.push(new amap.LngLat(lng, lat));
    }
    return path;
};

const RINGS = [
    { name: '六环外', inner: 22000, outer: 100000 },
    { name: '五环至六环', inner: 14000, outer: 22000 },
    { name: '四环至五环', inner: 9000, outer: 14000 },
    { name: '三环至四环', inner: 6000, outer: 9000 },
    { name: '二环至三环', inner: 4000, outer: 6000 },
    { name: '二环以内', inner: 0, outer: 4000 },
];

export const useBeijingRings = (
  amap: any,
  mapInstance: any,
  filterMode: 'district' | 'ring',
  excludedRings: string[],
  setExcludedRings: React.Dispatch<React.SetStateAction<string[]>>,
  ringPolygonsRef: React.MutableRefObject<any[]>
) => {
  useEffect(() => {
    if (!mapInstance || !amap) return;

    if (ringPolygonsRef.current.length > 0) {
      if (filterMode === 'ring') {
         ringPolygonsRef.current.forEach(item => {
             item.polygon.show();
             if (item.text) item.text.show();
             const isExcluded = excludedRings.includes(item.name);
             item.polygon.setOptions({
                fillColor: isExcluded ? '#9ca3af' : '#A7CDF3',
                fillOpacity: isExcluded ? 0.4 : 0.05,
                strokeColor: isExcluded ? '#6b7280' : '#A7CDF3',
                strokeOpacity: 0.5,
             });
         });
      } else {
         ringPolygonsRef.current.forEach(item => {
             item.polygon.hide();
             if (item.text) item.text.hide();
         });
      }
      return;
    }

    if (filterMode !== 'ring') return; // only init when toggled

    RINGS.forEach(ring => {
        let path: any[] = [];
        if (ring.inner === 0) {
            path = generateCirclePath(amap, TIANANMEN_CENTER, ring.outer, 64);
        } else {
            // Donut: outer path clockwise, inner path counter-clockwise
            const outer = generateCirclePath(amap, TIANANMEN_CENTER, ring.outer, 64);
            const inner = generateCirclePath(amap, TIANANMEN_CENTER, ring.inner, 64).reverse();
            path = [outer, inner];
        }

        const polygon = new amap.Polygon({
            path: path,
            strokeWeight: 2,
            strokeColor: '#A7CDF3', 
            strokeOpacity: 0.5,
            fillColor: '#A7CDF3',
            fillOpacity: 0.05,
            extData: { name: ring.name, inner: ring.inner, outer: ring.outer },
            cursor: 'pointer',
            bubble: true,
            map: mapInstance
        });

        polygon.on('click', () => {
            setExcludedRings(prev => prev.includes(ring.name) ? prev.filter(p => p !== ring.name) : [...prev, ring.name]);
        });

        let text: any = null;
        if (ring.outer <= 22000) { // Don't show text for 六环外 everywhere
            // Display text roughly midway up
            const textRadius = ring.inner + (ring.outer - ring.inner) / 2;
            const textPath = generateCirclePath(amap, TIANANMEN_CENTER, textRadius, 8);
            const textPoint = textPath[2]; // Northwest-ish
            
            text = new amap.Text({
                text: ring.name,
                position: textPoint,
                anchor: 'center',
                style: {
                    'background-color': 'transparent',
                    'border': 'none',
                    'color': '#8E8A82',
                    'font-size': '12px',
                    'font-weight': 'bold',
                    'text-shadow': '0 0 3px white',
                },
                zIndex: 10,
                cursor: 'pointer',
                bubble: true,
                map: mapInstance
            });
            text.on('click', () => {
                setExcludedRings(prev => prev.includes(ring.name) ? prev.filter(p => p !== ring.name) : [...prev, ring.name]);
            });
        }

        ringPolygonsRef.current.push({ name: ring.name, polygon, text });
    });
  }, [mapInstance, amap, excludedRings, filterMode]);
};
