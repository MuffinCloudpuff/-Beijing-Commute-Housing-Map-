export type TravelMode = 'transit' | 'driving' | 'walking' | 'bicycling';

export interface LocationPoint {
  id: string;
  name: string;
  lat: number;
  lng: number;
  adname?: string;
  address?: string;
  city?: string;
}

export interface RouteSegmentData {
  type: 'walk' | 'bike' | 'transit' | 'drive' | 'subway' | 'bus';
  instruction: string;
  duration: number;
  distance: number;
}

export interface RouteResult {
  destId: string;
  distance: number;
  duration: number;
  color: string;
  path?: any[];
  error?: string;
  cost?: number;
  segmentsData?: RouteSegmentData[];
}
