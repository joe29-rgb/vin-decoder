/**
 * Geolocation Service
 * Find nearby dealerships within specified radius using Canadian postal codes and coordinates
 */

import axios from 'axios';
import logger from '../utils/logger';

interface Coordinates {
  latitude: number;
  longitude: number;
}

interface Dealership {
  id: string;
  name: string;
  address: string;
  city: string;
  province: string;
  postalCode: string;
  phone?: string;
  email?: string;
  website?: string;
  coordinates: Coordinates;
  distance?: number;
  brands?: string[];
  services?: string[];
}

interface LocationSearchResult {
  dealerships: Dealership[];
  searchCenter: Coordinates;
  searchRadius: number;
  totalFound: number;
}

const dealershipDatabase: Dealership[] = [];

export function addDealership(dealership: Dealership): void {
  const existing = dealershipDatabase.findIndex(d => d.id === dealership.id);
  if (existing >= 0) {
    dealershipDatabase[existing] = dealership;
  } else {
    dealershipDatabase.push(dealership);
  }
  logger.info('Dealership added/updated', { id: dealership.id, name: dealership.name });
}

export function removeDealership(id: string): boolean {
  const index = dealershipDatabase.findIndex(d => d.id === id);
  if (index >= 0) {
    dealershipDatabase.splice(index, 1);
    logger.info('Dealership removed', { id });
    return true;
  }
  return false;
}

export function getAllDealerships(): Dealership[] {
  return [...dealershipDatabase];
}

export async function geocodePostalCode(postalCode: string): Promise<Coordinates> {
  try {
    const cleanedPostalCode = postalCode.replace(/\s+/g, '').toUpperCase();
    
    if (!/^[A-Z]\d[A-Z]\d[A-Z]\d$/.test(cleanedPostalCode)) {
      throw new Error('Invalid Canadian postal code format');
    }

    const apiKey = process.env.GOOGLE_MAPS_API_KEY || process.env.GEOCODING_API_KEY;
    
    if (!apiKey) {
      logger.warn('No geocoding API key configured, using approximate coordinates');
      return getApproximateCoordinates(cleanedPostalCode);
    }

    const response = await axios.get(
      `https://maps.googleapis.com/maps/api/geocode/json`,
      {
        params: {
          address: `${cleanedPostalCode}, Canada`,
          key: apiKey,
        },
        timeout: 10000,
      }
    );

    if (response.data.status === 'OK' && response.data.results.length > 0) {
      const location = response.data.results[0].geometry.location;
      return {
        latitude: location.lat,
        longitude: location.lng,
      };
    }

    logger.warn('Geocoding failed, using approximate coordinates', { postalCode: cleanedPostalCode });
    return getApproximateCoordinates(cleanedPostalCode);
  } catch (error: any) {
    logger.error('Geocoding error', { postalCode, error: error.message });
    return getApproximateCoordinates(postalCode.replace(/\s+/g, '').toUpperCase());
  }
}

function getApproximateCoordinates(postalCode: string): Coordinates {
  const firstChar = postalCode.charAt(0);
  
  const provinceCoordinates: Record<string, Coordinates> = {
    'A': { latitude: 47.5615, longitude: -52.7126 },
    'B': { latitude: 45.2733, longitude: -66.0633 },
    'C': { latitude: 46.2382, longitude: -63.1311 },
    'E': { latitude: 45.9636, longitude: -66.6431 },
    'G': { latitude: 46.8139, longitude: -71.2080 },
    'H': { latitude: 45.5017, longitude: -73.5673 },
    'J': { latitude: 45.5017, longitude: -73.5673 },
    'K': { latitude: 45.4215, longitude: -75.6972 },
    'L': { latitude: 43.6532, longitude: -79.3832 },
    'M': { latitude: 43.6532, longitude: -79.3832 },
    'N': { latitude: 43.4516, longitude: -80.4925 },
    'P': { latitude: 46.4917, longitude: -80.9930 },
    'R': { latitude: 49.8951, longitude: -97.1384 },
    'S': { latitude: 50.4452, longitude: -104.6189 },
    'T': { latitude: 51.0447, longitude: -114.0719 },
    'V': { latitude: 49.2827, longitude: -123.1207 },
    'X': { latitude: 60.7212, longitude: -135.0568 },
    'Y': { latitude: 62.4540, longitude: -114.3718 },
  };

  return provinceCoordinates[firstChar] || { latitude: 45.4215, longitude: -75.6972 };
}

export function calculateDistance(coord1: Coordinates, coord2: Coordinates): number {
  const R = 6371;
  const dLat = toRadians(coord2.latitude - coord1.latitude);
  const dLon = toRadians(coord2.longitude - coord1.longitude);
  
  const a = 
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRadians(coord1.latitude)) * Math.cos(toRadians(coord2.latitude)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distance = R * c;
  
  return Math.round(distance * 10) / 10;
}

function toRadians(degrees: number): number {
  return degrees * (Math.PI / 180);
}

export async function findNearbyDealerships(
  postalCode: string,
  radiusKm: number = 250,
  brands?: string[]
): Promise<LocationSearchResult> {
  try {
    const searchCenter = await geocodePostalCode(postalCode);
    
    let dealerships = dealershipDatabase.map(dealership => ({
      ...dealership,
      distance: calculateDistance(searchCenter, dealership.coordinates),
    }));

    dealerships = dealerships.filter(d => d.distance! <= radiusKm);

    if (brands && brands.length > 0) {
      dealerships = dealerships.filter(d => 
        d.brands && d.brands.some(b => 
          brands.some(searchBrand => 
            b.toLowerCase().includes(searchBrand.toLowerCase())
          )
        )
      );
    }

    dealerships.sort((a, b) => (a.distance || 0) - (b.distance || 0));

    logger.info('Nearby dealerships found', {
      postalCode,
      radiusKm,
      totalFound: dealerships.length,
    });

    return {
      dealerships,
      searchCenter,
      searchRadius: radiusKm,
      totalFound: dealerships.length,
    };
  } catch (error: any) {
    logger.error('Find nearby dealerships failed', { 
      postalCode, 
      error: error.message 
    });
    throw error;
  }
}

export async function findClosestDealership(
  postalCode: string,
  brands?: string[]
): Promise<Dealership | null> {
  try {
    const result = await findNearbyDealerships(postalCode, 500, brands);
    return result.dealerships.length > 0 ? result.dealerships[0] : null;
  } catch (error: any) {
    logger.error('Find closest dealership failed', { 
      postalCode, 
      error: error.message 
    });
    throw error;
  }
}

export function getDealershipById(id: string): Dealership | undefined {
  return dealershipDatabase.find(d => d.id === id);
}

export function searchDealerships(query: string): Dealership[] {
  const lowerQuery = query.toLowerCase();
  return dealershipDatabase.filter(d =>
    d.name.toLowerCase().includes(lowerQuery) ||
    d.city.toLowerCase().includes(lowerQuery) ||
    d.province.toLowerCase().includes(lowerQuery) ||
    (d.brands && d.brands.some(b => b.toLowerCase().includes(lowerQuery)))
  );
}

export function getDealershipsByProvince(province: string): Dealership[] {
  const provinceUpper = province.toUpperCase();
  return dealershipDatabase.filter(d => 
    d.province.toUpperCase() === provinceUpper ||
    d.province.toUpperCase().startsWith(provinceUpper)
  );
}

export function getDealershipsByBrand(brand: string): Dealership[] {
  const lowerBrand = brand.toLowerCase();
  return dealershipDatabase.filter(d =>
    d.brands && d.brands.some(b => b.toLowerCase().includes(lowerBrand))
  );
}

export function initializeSampleDealerships(): void {
  const sampleDealerships: Dealership[] = [
    {
      id: 'deal-001',
      name: 'Calgary Auto Centre',
      address: '123 Main Street SW',
      city: 'Calgary',
      province: 'AB',
      postalCode: 'T2P 1J9',
      phone: '403-555-0100',
      website: 'https://calgaryauto.ca',
      coordinates: { latitude: 51.0447, longitude: -114.0719 },
      brands: ['Honda', 'Toyota', 'Mazda'],
      services: ['Sales', 'Service', 'Parts', 'Financing'],
    },
    {
      id: 'deal-002',
      name: 'Edmonton Motors',
      address: '456 Jasper Avenue',
      city: 'Edmonton',
      province: 'AB',
      postalCode: 'T5J 2R8',
      phone: '780-555-0200',
      website: 'https://edmontonmotors.ca',
      coordinates: { latitude: 53.5461, longitude: -113.4938 },
      brands: ['Ford', 'Chevrolet', 'GMC'],
      services: ['Sales', 'Service', 'Parts'],
    },
    {
      id: 'deal-003',
      name: 'Red Deer Auto Sales',
      address: '789 Gaetz Avenue',
      city: 'Red Deer',
      province: 'AB',
      postalCode: 'T4N 3Y5',
      phone: '403-555-0300',
      coordinates: { latitude: 52.2681, longitude: -113.8111 },
      brands: ['Nissan', 'Hyundai', 'Kia'],
      services: ['Sales', 'Financing'],
    },
    {
      id: 'deal-004',
      name: 'Lethbridge Car Depot',
      address: '321 Mayor Magrath Drive',
      city: 'Lethbridge',
      province: 'AB',
      postalCode: 'T1J 3L8',
      phone: '403-555-0400',
      coordinates: { latitude: 49.6942, longitude: -112.8328 },
      brands: ['Volkswagen', 'Subaru', 'Mazda'],
      services: ['Sales', 'Service', 'Parts', 'Financing'],
    },
  ];

  sampleDealerships.forEach(addDealership);
  logger.info('Sample dealerships initialized', { count: sampleDealerships.length });
}
