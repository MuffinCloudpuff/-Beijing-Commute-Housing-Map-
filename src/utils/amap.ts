import AMapLoader from '@amap/amap-jsapi-loader';

let amapInstance: any | null = null;
let isInitializing = false;
let initPromise: Promise<any> | null = null;

export const loadAMap = async (apiKey: string, securityCode: string) => {
  if (amapInstance) return amapInstance;
  if (isInitializing && initPromise) return initPromise;
  
  isInitializing = true;
  
  (window as any)._AMapSecurityConfig = {
    securityJsCode: securityCode,
  };

  initPromise = AMapLoader.load({
    key: apiKey,
    version: '2.0',
    plugins: [
      'AMap.PlaceSearch',
      'AMap.AutoComplete',
      'AMap.Transfer',
      'AMap.Driving',
      'AMap.Walking',
      'AMap.Bicycling',
      'AMap.Geolocation',
      'AMap.GeometryUtil'
    ],
  }).then((AMap) => {
    amapInstance = AMap;
    isInitializing = false;
    return AMap;
  }).catch(e => {
    isInitializing = false;
    initPromise = null;
    throw e;
  });

  return initPromise;
};

export const generateGaodeURI = (dest: { lat: number, lng: number, name: string }, origin?: { lat: number, lng: number, name: string }, mode: 'transit' | 'driving' | 'walking' | 'bicycling' = 'transit') => {
  const modeMap: Record<string, string> = {
    'driving': '0',
    'transit': '1',
    'walking': '2',
    'bicycling': '3'
  };
  const t = modeMap[mode] || '1';
  
  // Note: sourceApplication acts as the app name requesting open Gaode App
  return `amapuri://route/plan/?sourceApplication=AuraNav&dlat=${dest.lat}&dlon=${dest.lng}&dname=${encodeURIComponent(dest.name)}&dev=0&t=${t}`;
};
