import { TravelMode, LocationPoint, RouteResult } from '../types/navigation';

export const searchRoute = async (service: any, start: any, end: any): Promise<any> => {
   let attempts = 0;
   while (attempts < 5) {
       try {
          return await new Promise((resolve, reject) => {
              service.search(start, end, (status: string, result: any) => {
                  if (status === 'complete' && result.info === 'OK') {
                      resolve(result);
                  } else if (result && result.info === 'CUQPS_HAS_EXCEEDED_THE_LIMIT') {
                      reject(new Error('QPS'));
                  } else {
                      resolve({ error: typeof result === 'string' ? result : (result?.info || '路线不可用') });
                  }
              });
          });
       } catch (e: any) {
           if (e.message === 'QPS') {
               attempts++;
               await new Promise(r => setTimeout(r, 1000 * attempts));
           } else {
               return { error: e.message };
           }
       }
   }
   return { error: '请求超过限额(QPS)，请稍后再试' };
};

export const getBikeRoute = async (amap: any, start: any, end: any): Promise<{time: number, distance: number, path: any[]}> => {
     let attempts = 0;
     while (attempts < 3) {
        try {
            return await new Promise((res, rej) => {
                const service = new amap.Bicycling();
                service.search(start, end, (stat: string, resData: any) => {
                    if (stat === 'complete' && resData.routes && resData.routes.length > 0) {
                        let p: any[] = [];
                        resData.routes[0].steps.forEach((step: any) => { p.push(...step.path); });
                        // Add 120 seconds overhead for finding, unlocking, locking a shared bike
                        let routeTime = Number(resData.routes[0].time) + 120;
                        res({ time: routeTime, distance: resData.routes[0].distance, path: p });
                    } else if (resData && resData.info === 'CUQPS_HAS_EXCEEDED_THE_LIMIT') {
                        rej(new Error('QPS'));
                    } else {
                        rej(new Error('bicycling_failed'));
                    }
                });
            });
        } catch (e: any) {
            if (e.message === 'QPS') {
                attempts++;
                await new Promise(r => setTimeout(r, 600 * attempts));
            } else {
                break;
            }
        }
     }
     // Fallback to straight distance with better real-world approximation
     const rawDist = start.distance(end);
     const distance = Math.round(rawDist * 1.4); // 1.4x for city grid detour
     const speed = 2.5; // 9.0 km/h, more realistic for shared bikes + traffic lights, plus overhead
     const time = Math.round(distance / speed) + 120; // 120s unlock overhead
     return { time: time, distance: distance, path: [start, end] };
};

export const findNearestSubway = async (amap: any, point: any): Promise<any> => {
     return new Promise((resolve) => {
         const placeSearch = new amap.PlaceSearch({
             type: '150500|地铁站',
             pageSize: 1,
             pageIndex: 1,
             extensions: 'base'
         });
         placeSearch.searchNearBy('地铁', point, 5000, (status: string, searchResult: any) => {
             if (status === 'complete' && searchResult.poiList && searchResult.poiList.pois.length > 0) {
                 const poi = searchResult.poiList.pois[0];
                 resolve(poi);
             } else {
                 placeSearch.searchNearBy('', point, 5000, (s2: string, r2: any) => {
                    if (s2 === 'complete' && r2.poiList && r2.poiList.pois.length > 0) {
                        resolve(r2.poiList.pois[0]);
                    } else {
                        resolve(null);
                    }
                 });
             }
         });
     });
};
