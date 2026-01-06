import { Client, PlaceInputType } from '@googlemaps/google-maps-services-js';

export interface DealershipLocation {
  id: string;
  name: string;
  address: string;
  lat: number;
  lng: number;
  rating?: number;
  reviewCount?: number;
  phoneNumber?: string;
  website?: string;
  openNow?: boolean;
  distance?: number;
}

export interface DealershipDetails {
  phoneNumber?: string;
  website?: string;
  hoursOfOperation?: string[];
  reviews?: any[];
}

export interface DealershipSearchParams {
  lat: number;
  lng: number;
  radiusKm: number;
  keyword?: string;
}

const GOOGLE_MAPS_API_KEY = process.env.GOOGLE_MAPS_API_KEY || '';

if (!GOOGLE_MAPS_API_KEY) {
  console.warn('[DEALERSHIP-FINDER] WARNING: GOOGLE_MAPS_API_KEY not set in environment variables');
}

const mapsClient = new Client({});

function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // Radius of the Earth in km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = 
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

export async function findNearbyDealerships(params: DealershipSearchParams): Promise<DealershipLocation[]> {
  if (!GOOGLE_MAPS_API_KEY) {
    throw new Error('GOOGLE_MAPS_API_KEY is not configured');
  }

  try {
    console.log('[DEALERSHIP-FINDER] Searching for dealerships:', params);

    const response = await mapsClient.placesNearby({
      params: {
        location: { lat: params.lat, lng: params.lng },
        radius: params.radiusKm * 1000, // Convert km to meters
        type: PlaceInputType.textQuery,
        keyword: params.keyword || 'used car dealer',
        key: GOOGLE_MAPS_API_KEY,
      },
    });

    if (response.data.status !== 'OK' && response.data.status !== 'ZERO_RESULTS') {
      console.error('[DEALERSHIP-FINDER] API error:', response.data.status, response.data.error_message);
      throw new Error(`Google Maps API error: ${response.data.status} - ${response.data.error_message || 'Unknown error'}`);
    }

    const dealerships: DealershipLocation[] = response.data.results.map(place => {
      const distance = calculateDistance(
        params.lat,
        params.lng,
        place.geometry?.location.lat || 0,
        place.geometry?.location.lng || 0
      );

      return {
        id: place.place_id || '',
        name: place.name || 'Unknown Dealership',
        address: place.vicinity || '',
        lat: place.geometry?.location.lat || 0,
        lng: place.geometry?.location.lng || 0,
        rating: place.rating,
        reviewCount: place.user_ratings_total,
        openNow: place.opening_hours?.open_now,
        distance: Math.round(distance * 10) / 10, // Round to 1 decimal
      };
    });

    // Sort by distance
    dealerships.sort((a, b) => (a.distance || 0) - (b.distance || 0));

    console.log('[DEALERSHIP-FINDER] Found', dealerships.length, 'dealerships');
    return dealerships;
  } catch (error) {
    console.error('[DEALERSHIP-FINDER] Error searching dealerships:', error);
    throw error;
  }
}

export async function getDealershipDetails(placeId: string): Promise<DealershipDetails> {
  if (!GOOGLE_MAPS_API_KEY) {
    throw new Error('GOOGLE_MAPS_API_KEY is not configured');
  }

  try {
    console.log('[DEALERSHIP-FINDER] Fetching details for place:', placeId);

    const response = await mapsClient.placeDetails({
      params: {
        place_id: placeId,
        fields: ['formatted_phone_number', 'website', 'opening_hours', 'reviews'],
        key: GOOGLE_MAPS_API_KEY,
      },
    });

    if (response.data.status !== 'OK') {
      console.error('[DEALERSHIP-FINDER] Details API error:', response.data.status);
      throw new Error(`Google Maps API error: ${response.data.status}`);
    }

    const result = response.data.result;

    return {
      phoneNumber: result.formatted_phone_number,
      website: result.website,
      hoursOfOperation: result.opening_hours?.weekday_text,
      reviews: result.reviews,
    };
  } catch (error) {
    console.error('[DEALERSHIP-FINDER] Error fetching dealership details:', error);
    throw error;
  }
}

export async function searchDealershipsByName(name: string, location: { lat: number; lng: number }): Promise<DealershipLocation[]> {
  if (!GOOGLE_MAPS_API_KEY) {
    throw new Error('GOOGLE_MAPS_API_KEY is not configured');
  }

  try {
    console.log('[DEALERSHIP-FINDER] Searching by name:', name);

    const response = await mapsClient.textSearch({
      params: {
        query: `${name} car dealership`,
        location: { lat: location.lat, lng: location.lng },
        radius: 50000, // 50km radius for name search
        key: GOOGLE_MAPS_API_KEY,
      },
    });

    if (response.data.status !== 'OK' && response.data.status !== 'ZERO_RESULTS') {
      console.error('[DEALERSHIP-FINDER] Text search error:', response.data.status);
      throw new Error(`Google Maps API error: ${response.data.status}`);
    }

    const dealerships: DealershipLocation[] = response.data.results.map(place => {
      const distance = calculateDistance(
        location.lat,
        location.lng,
        place.geometry?.location.lat || 0,
        place.geometry?.location.lng || 0
      );

      return {
        id: place.place_id || '',
        name: place.name || 'Unknown Dealership',
        address: place.formatted_address || '',
        lat: place.geometry?.location.lat || 0,
        lng: place.geometry?.location.lng || 0,
        rating: place.rating,
        reviewCount: place.user_ratings_total,
        openNow: place.opening_hours?.open_now,
        distance: Math.round(distance * 10) / 10,
      };
    });

    console.log('[DEALERSHIP-FINDER] Found', dealerships.length, 'dealerships by name');
    return dealerships;
  } catch (error) {
    console.error('[DEALERSHIP-FINDER] Error searching by name:', error);
    throw error;
  }
}
