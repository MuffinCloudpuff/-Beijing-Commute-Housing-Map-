import React, { useEffect } from 'react';

export const useBeijingDistricts = (
  amap: any,
  mapInstance: any,
  filterMode: 'district' | 'ring',
  excludedDistricts: string[],
  setExcludedDistricts: React.Dispatch<React.SetStateAction<string[]>>,
  districtPolygonsRef: React.MutableRefObject<any[]>
) => {
  useEffect(() => {
    if (!mapInstance || !amap) return;

    if (districtPolygonsRef.current.length > 0) {
      if (filterMode === 'district') {
         districtPolygonsRef.current.forEach(item => {
             item.polygon.show();
             item.text.show();
             const name = item.polygon.getExtData().name;
             const isExcluded = excludedDistricts.includes(name);
             item.polygon.setOptions({
                fillColor: isExcluded ? '#9ca3af' : '#A7CDF3', // Gray when excluded, subtle blue otherwise
                fillOpacity: isExcluded ? 0.4 : 0.05,
                strokeColor: isExcluded ? '#6b7280' : '#A7CDF3',
                strokeOpacity: 0.5,
             });
         });
      } else {
         districtPolygonsRef.current.forEach(item => {
             item.polygon.hide();
             item.text.hide();
         });
      }
      return;
    }

    if (filterMode !== 'district') return; // only init when toggled

    amap.plugin('AMap.DistrictSearch', async function () {
        const BEIJING_DISTRICTS = [
          '东城区', '西城区', '朝阳区', '丰台区', '石景山区', '海淀区',
          '门头沟区', '房山区', '通州区', '顺义区', '昌平区', '大兴区',
          '怀柔区', '平谷区', '密云区', '延庆区'
        ];

        const ds = new amap.DistrictSearch({
            level: 'district',
            extensions: 'all',
            subdistrict: 0
        });

        const searchDistrict = async (name: string): Promise<any> => {
            let attempts = 0;
            while (attempts < 8) {
                try {
                    return await new Promise((resolve, reject) => {
                        ds.search(name, function(status: string, result: any) {
                            if (status === 'complete' && result.districtList) {
                                const district = result.districtList.find((d: any) => d.adcode.startsWith('11') || d.citycode === '010');
                                resolve(district);
                            } else if (result && result.info === 'CUQPS_HAS_EXCEEDED_THE_LIMIT') {
                                reject(new Error('QPS'));
                            } else {
                                resolve(null);
                            }
                        });
                    });
                } catch(e: any) {
                    if (e.message === 'QPS') {
                        attempts++;
                        await new Promise(r => setTimeout(r, 600 * attempts)); // Backoff to avoid strict QPS
                    } else {
                        return null;
                    }
                }
            }
            return null;
        };

        for (const districtName of BEIJING_DISTRICTS) {
            const district = await searchDistrict(districtName);
            if (district && district.boundaries) {
                const boundaries = district.boundaries;
                const center = district.center;
                const text = new amap.Text({
                    text: district.name,
                    position: center ? new amap.LngLat(center.lng, center.lat) : undefined,
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
                    extData: { name: district.name },
                    cursor: 'pointer',
                    bubble: true
                });
                
                text.on('click', () => {
                    setExcludedDistricts(prev => {
                        if (prev.includes(district.name)) return prev.filter(p => p !== district.name);
                        return [...prev, district.name];
                    });
                });
                
                text.setMap(mapInstance);

                boundaries.forEach((boundary: any) => {
                    const polygon = new amap.Polygon({
                        path: boundary,
                        strokeWeight: 2,
                        strokeColor: '#A7CDF3', 
                        strokeOpacity: 0.5,
                        fillColor: '#A7CDF3',
                        fillOpacity: 0.05,
                        extData: { name: district.name, adcode: district.adcode },
                        cursor: 'pointer',
                        bubble: true 
                    });
                    
                    polygon.on('click', () => {
                        setExcludedDistricts(prev => {
                            if (prev.includes(district.name)) return prev.filter(p => p !== district.name);
                            return [...prev, district.name];
                        });
                    });
                    
                    polygon.setMap(mapInstance);
                    districtPolygonsRef.current.push({ polygon, text });
                });
            }
            await new Promise(r => setTimeout(r, 400)); // Delay to avoid QPS hit
        }
    });
  }, [mapInstance, amap, excludedDistricts, filterMode]);
};
