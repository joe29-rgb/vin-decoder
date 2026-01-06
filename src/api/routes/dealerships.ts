import express, { Request, Response } from 'express';
import { findNearbyDealerships, getDealershipDetails, searchDealershipsByName } from '../../modules/dealership-finder';

const router = express.Router();

router.get('/nearby', async (req: Request, res: Response) => {
  try {
    const lat = parseFloat(req.query.lat as string);
    const lng = parseFloat(req.query.lng as string);
    const radiusKm = parseFloat(req.query.radiusKm as string) || 250;
    const keyword = req.query.keyword as string;

    if (isNaN(lat) || isNaN(lng)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid coordinates. Provide lat and lng as query parameters.',
      });
    }

    console.log('[DEALERSHIPS API] Finding nearby dealerships:', { lat, lng, radiusKm, keyword });

    const dealerships = await findNearbyDealerships({
      lat,
      lng,
      radiusKm,
      keyword,
    });

    res.json({
      success: true,
      total: dealerships.length,
      dealerships,
      params: { lat, lng, radiusKm, keyword },
    });
  } catch (error) {
    console.error('[DEALERSHIPS API] Error finding nearby dealerships:', error);
    res.status(500).json({
      success: false,
      error: (error as Error).message || 'Failed to find dealerships',
    });
  }
});

router.get('/details/:placeId', async (req: Request, res: Response) => {
  try {
    const { placeId } = req.params;

    if (!placeId) {
      return res.status(400).json({
        success: false,
        error: 'placeId is required',
      });
    }

    console.log('[DEALERSHIPS API] Fetching dealership details:', placeId);

    const details = await getDealershipDetails(placeId);

    res.json({
      success: true,
      placeId,
      details,
    });
  } catch (error) {
    console.error('[DEALERSHIPS API] Error fetching dealership details:', error);
    res.status(500).json({
      success: false,
      error: (error as Error).message || 'Failed to fetch dealership details',
    });
  }
});

router.get('/search', async (req: Request, res: Response) => {
  try {
    const name = req.query.name as string;
    const lat = parseFloat(req.query.lat as string);
    const lng = parseFloat(req.query.lng as string);

    if (!name) {
      return res.status(400).json({
        success: false,
        error: 'name query parameter is required',
      });
    }

    if (isNaN(lat) || isNaN(lng)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid coordinates. Provide lat and lng as query parameters.',
      });
    }

    console.log('[DEALERSHIPS API] Searching dealerships by name:', { name, lat, lng });

    const dealerships = await searchDealershipsByName(name, { lat, lng });

    res.json({
      success: true,
      total: dealerships.length,
      dealerships,
      params: { name, lat, lng },
    });
  } catch (error) {
    console.error('[DEALERSHIPS API] Error searching dealerships:', error);
    res.status(500).json({
      success: false,
      error: (error as Error).message || 'Failed to search dealerships',
    });
  }
});

export default router;
