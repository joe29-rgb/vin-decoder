/**
 * Geolocation API Routes
 * Dealership finder and location services
 */

import { Router, Request, Response } from 'express';
import {
  findNearbyDealerships,
  findClosestDealership,
  geocodePostalCode,
  calculateDistance,
  addDealership,
  removeDealership,
  getAllDealerships,
  getDealershipById,
  searchDealerships,
  getDealershipsByProvince,
  getDealershipsByBrand,
  initializeSampleDealerships,
} from '../../modules/geolocation';
import logger from '../../utils/logger';

const router = Router();

initializeSampleDealerships();

router.get('/nearby', async (req: Request, res: Response) => {
  try {
    const { postalCode, radius, brands } = req.query;

    if (!postalCode || typeof postalCode !== 'string') {
      return res.status(400).json({
        success: false,
        error: 'Postal code is required',
      });
    }

    const radiusKm = radius ? Number(radius) : 250;
    const brandList = brands ? String(brands).split(',').map(b => b.trim()) : undefined;

    const result = await findNearbyDealerships(postalCode, radiusKm, brandList);

    res.json({
      success: true,
      postalCode,
      radius: radiusKm,
      searchCenter: result.searchCenter,
      totalFound: result.totalFound,
      dealerships: result.dealerships,
    });
  } catch (error: any) {
    logger.error('Nearby dealerships search failed', { error: error.message });
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

router.get('/closest', async (req: Request, res: Response) => {
  try {
    const { postalCode, brands } = req.query;

    if (!postalCode || typeof postalCode !== 'string') {
      return res.status(400).json({
        success: false,
        error: 'Postal code is required',
      });
    }

    const brandList = brands ? String(brands).split(',').map(b => b.trim()) : undefined;
    const dealership = await findClosestDealership(postalCode, brandList);

    if (!dealership) {
      return res.json({
        success: true,
        postalCode,
        dealership: null,
        message: 'No dealerships found',
      });
    }

    res.json({
      success: true,
      postalCode,
      dealership,
    });
  } catch (error: any) {
    logger.error('Closest dealership search failed', { error: error.message });
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

router.get('/geocode', async (req: Request, res: Response) => {
  try {
    const { postalCode } = req.query;

    if (!postalCode || typeof postalCode !== 'string') {
      return res.status(400).json({
        success: false,
        error: 'Postal code is required',
      });
    }

    const coordinates = await geocodePostalCode(postalCode);

    res.json({
      success: true,
      postalCode,
      coordinates,
    });
  } catch (error: any) {
    logger.error('Geocoding failed', { error: error.message });
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

router.get('/distance', async (req: Request, res: Response) => {
  try {
    const { from, to } = req.query;

    if (!from || !to || typeof from !== 'string' || typeof to !== 'string') {
      return res.status(400).json({
        success: false,
        error: 'Both from and to postal codes are required',
      });
    }

    const coord1 = await geocodePostalCode(from);
    const coord2 = await geocodePostalCode(to);
    const distance = calculateDistance(coord1, coord2);

    res.json({
      success: true,
      from: { postalCode: from, coordinates: coord1 },
      to: { postalCode: to, coordinates: coord2 },
      distanceKm: distance,
    });
  } catch (error: any) {
    logger.error('Distance calculation failed', { error: error.message });
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

router.get('/dealerships', async (req: Request, res: Response) => {
  try {
    const dealerships = getAllDealerships();

    res.json({
      success: true,
      total: dealerships.length,
      dealerships,
    });
  } catch (error: any) {
    logger.error('Get all dealerships failed', { error: error.message });
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

router.get('/dealerships/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const dealership = getDealershipById(id);

    if (!dealership) {
      return res.status(404).json({
        success: false,
        error: 'Dealership not found',
      });
    }

    res.json({
      success: true,
      dealership,
    });
  } catch (error: any) {
    logger.error('Get dealership failed', { error: error.message });
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

router.get('/search', async (req: Request, res: Response) => {
  try {
    const { q, province, brand } = req.query;

    let dealerships = getAllDealerships();

    if (q && typeof q === 'string') {
      dealerships = searchDealerships(q);
    } else if (province && typeof province === 'string') {
      dealerships = getDealershipsByProvince(province);
    } else if (brand && typeof brand === 'string') {
      dealerships = getDealershipsByBrand(brand);
    }

    res.json({
      success: true,
      total: dealerships.length,
      dealerships,
    });
  } catch (error: any) {
    logger.error('Dealership search failed', { error: error.message });
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

router.post('/dealerships', async (req: Request, res: Response) => {
  try {
    const dealership = req.body;

    if (!dealership.id || !dealership.name || !dealership.coordinates) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: id, name, coordinates',
      });
    }

    addDealership(dealership);

    res.json({
      success: true,
      message: 'Dealership added successfully',
      dealership,
    });
  } catch (error: any) {
    logger.error('Add dealership failed', { error: error.message });
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

router.delete('/dealerships/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const removed = removeDealership(id);

    if (!removed) {
      return res.status(404).json({
        success: false,
        error: 'Dealership not found',
      });
    }

    res.json({
      success: true,
      message: 'Dealership removed successfully',
    });
  } catch (error: any) {
    logger.error('Remove dealership failed', { error: error.message });
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

export default router;
