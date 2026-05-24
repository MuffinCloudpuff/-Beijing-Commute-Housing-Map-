import { Dispatch, SetStateAction, RefObject } from 'react';
import { LocationPoint } from '../types/navigation';
import { pLimit } from './async';

export const processImageFiles = async (
  amap: any,
  files: FileList | File[],
  setIsExtractingLocations: (val: boolean) => void,
  setDestinations: Dispatch<SetStateAction<LocationPoint[]>>,
  fileInputRef: RefObject<HTMLInputElement>
) => {
  if (!amap || files.length === 0) return;

  setIsExtractingLocations(true);

  try {
    const fileArray = Array.from(files).filter(f => f.type.startsWith('image/'));
    
    const placeSearch = new amap.PlaceSearch({
      city: '北京', // Default city, can be improved or removed
      citylimit: false
    });

    const imageLimit = pLimit(1);

    await Promise.all(fileArray.map(file => imageLimit(async () => {
      try {
        const buffer = await file.arrayBuffer();
        const base64 = btoa(new Uint8Array(buffer).reduce((data, byte) => data + String.fromCharCode(byte), ''));
        
        const response = await fetch('/api/extract-locations', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ imageBase64: base64, mimeType: file.type })
        });
        
        const data = await response.json();
        if (data.locations && Array.isArray(data.locations) && data.locations.length > 0) {
            const newPois: any[] = [];
            for (const locObj of data.locations) {
                await new Promise(r => setTimeout(r, 300)); // Delay to avoid QPS limit
                await new Promise<void>((resolve) => {
                    const searchStr = typeof locObj === 'object' ? (locObj.fullAddress || locObj.shortName) : locObj;
                    const displayName = typeof locObj === 'object' ? (locObj.shortName || locObj.fullAddress) : locObj;
                    
                    placeSearch.search(searchStr, (status: string, result: any) => {
                        if (status === 'complete' && result.info === 'OK' && result.poiList && result.poiList.pois.length > 0) {
                            const poi = result.poiList.pois[0];
                            
                            newPois.push({
                                id: Math.random().toString(36).substr(2, 9),
                                name: displayName,
                                lat: poi.location.lat,
                                lng: poi.location.lng,
                                adname: poi.adname || '',
                                address: poi.address || ''
                            });
                        }
                        resolve();
                    });
                });
            }
            if (newPois.length > 0) {
                setDestinations(prev => [...prev, ...newPois]);
            }
        }
      } catch (err) {
        console.error("Error processing a file:", err);
      }
    })));
  } catch (error) {
    console.error("Error formatting images", error);
  } finally {
    setIsExtractingLocations(false);
    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }
};

export const importJsonContent = (
  content: string,
  setOrigin: (origin: LocationPoint) => void,
  setDestinations: Dispatch<SetStateAction<LocationPoint[]>>,
  searchInputRef: RefObject<HTMLInputElement>
) => {
    try {
        const parsed = JSON.parse(content);
        
        if (Array.isArray(parsed)) {
            // Backward compatibility
            const validPois = parsed.filter(item => item.name && typeof item.lat === 'number' && typeof item.lng === 'number');
            const newPois = validPois.map(poi => ({...poi, id: Math.random().toString(36).substr(2, 9)}));
            setDestinations(prev => [...prev, ...newPois]);
        } else if (parsed && typeof parsed === 'object') {
            // New format: { origin: LocationPoint | null, destinations: LocationPoint[] }
            if (parsed.origin && typeof parsed.origin.lat === 'number' && typeof parsed.origin.lng === 'number') {
                setOrigin({
                    ...parsed.origin,
                    id: parsed.origin.id || Math.random().toString(36).substr(2, 9)
                });
                if (searchInputRef.current) {
                    searchInputRef.current.value = parsed.origin.name || '已导入起点';
                }
            }
            if (Array.isArray(parsed.destinations)) {
                const validPois = parsed.destinations.filter((item: any) => item.name && typeof item.lat === 'number' && typeof item.lng === 'number');
                const newPois = validPois.map((poi: any) => ({...poi, id: Math.random().toString(36).substr(2, 9)}));
                setDestinations(prev => [...prev, ...newPois]);
            }
        }
    } catch (err) {
        console.error("Failed to parse JSON file", err);
    }
};

export const exportDestinationsToFile = (origin: LocationPoint | null, destinations: LocationPoint[]) => {
  if (!origin && destinations.length === 0) return;
  const exportData = {
      origin,
      destinations
  };
  const dataStr = JSON.stringify(exportData, null, 2);
  const blob = new Blob([dataStr], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'navigation_data.json';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};
