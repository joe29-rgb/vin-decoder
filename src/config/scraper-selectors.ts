/**
 * CSS SELECTORS FOR AUTOTRADER.CA & CARGURUS.CA
 * Updated: January 2026
 * 
 * These selectors are used by the free Puppeteer-based scrapers
 * to extract vehicle data without requiring API keys.
 */

export const AUTOTRADER_SELECTORS = {
  // Main listing container
  listingContainer: 'div[class*="SearchResultsSection"], div[data-test="search-results"]',
  
  // Individual vehicle cards
  vehicleCard: 'div[class*="VehicleCard"], div[data-test="vehicle-card"], article[class*="listing"]',
  
  // Vehicle details within each card
  vehicleTitle: 'h2[class*="VehicleTitle"], a[class*="vehicleLink"] h2, h3[data-test="vehicle-title"]',
  
  // Price
  price: 'span[class*="Price"], div[class*="price"], span[data-test="price"]',
  
  // Mileage
  mileage: 'span[class*="Mileage"], div[class*="mileage"] span, span[data-test="mileage"]',
  
  // Transmission
  transmission: 'span[class*="Transmission"], div[class*="transmission"], span[data-test="transmission"]',
  
  // Year
  year: 'span[class*="Year"], h2 span:first-child, span[data-test="year"]',
  
  // Location/Distance
  location: 'span[class*="Location"], div[class*="distance"], span[data-test="location"]',
  
  // Dealer Name
  dealerName: 'h3[class*="DealerName"], a[class*="dealerLink"] h3, span[class*="dealerTitle"], div[data-test="dealer-name"]',
  
  // Dealer Phone
  dealerPhone: 'a[href^="tel:"], span[class*="phone"], button[class*="phone"]',
  
  // Listing URL
  listingUrl: 'a[href*="/cars/"], a[class*="listing-link"]',
  
  // Features/Specs
  features: 'ul[class*="Features"] li, div[class*="features"] span, ul[data-test="features"] li',
  
  // Fuel Type
  fuelType: 'span[class*="Fuel"], div[class*="fuel-type"], span[data-test="fuel"]',
  
  // Body Type
  bodyType: 'span[class*="Body"], div[class*="body-type"], span[data-test="body-type"]',
  
  // VIN
  vin: 'span[class*="VIN"], div[class*="vin"], span[data-test="vin"]',
  
  // Stock Number
  stockNumber: 'span[class*="Stock"], div[class*="stock"], span[data-test="stock"]',
  
  // Next page button
  nextPageBtn: 'a[class*="NextPage"], button[aria-label="Next"], a[rel="next"]',
  
  // Pagination info
  totalResults: 'span[class*="TotalResults"], div[class*="result-count"]'
};

export const CARGURUS_SELECTORS = {
  // Main container
  listingContainer: 'div[class*="ListingsSection"], main[class*="listings"], div[data-cg="listings"]',
  
  // Individual listing cards
  vehicleCard: 'article[class*="ListingCard"], div[class*="listing-item"], div[data-cg="listing-card"]',
  
  // Vehicle title
  vehicleTitle: 'h2[class*="vehicleTitle"], a[class*="listing-title"] h2, span[class*="vehicle-name"], h4[class*="title"]',
  
  // Price
  price: 'span[class*="vehiclePrice"], div[class*="price"] span, h3[class*="pricing"], span[data-cg="price"]',
  
  // Mileage
  mileage: 'span[class*="mileage"], div[class*="mileage-info"] span, p[class*="mileage"]',
  
  // Transmission
  transmission: 'span[class*="transmission"], div[class*="transmission-type"]',
  
  // Year/Make/Model
  year: 'span[class*="modelYear"], div[class*="year"] span, h2 span:first-child',
  
  // Location
  location: 'span[class*="dealerLocation"], div[class*="location"], p[class*="dealer-location"]',
  
  // Dealer name
  dealerName: 'h3[class*="dealerName"], a[class*="dealer-profile"] h3, div[class*="dealer-info"] h3, span[class*="seller-name"]',
  
  // Dealer phone
  dealerPhone: 'a[href^="tel:"], span[class*="phone"], button[class*="contact"]',
  
  // Listing URL
  listingUrl: 'a[class*="listing-link"], a[href*="/cars/"], a[data-cg="listing-link"]',
  
  // Features
  features: 'div[class*="features"] span, ul[class*="feature-list"] li, div[class*="highlights"] li',
  
  // Fuel type
  fuelType: 'span[class*="fuelType"], div[class*="fuel-type"]',
  
  // Body type
  bodyType: 'span[class*="bodyType"], div[class*="body-type"]',
  
  // VIN
  vin: 'span[class*="vin"], div[data-cg="vin"]',
  
  // Stock Number
  stockNumber: 'span[class*="stock"], div[class*="stock-number"]',
  
  // Deal rating
  dealRating: 'span[class*="deal-rating"], div[class*="price-rating"]',
  
  // Pagination next
  nextPageBtn: 'a[class*="nextPage"], button[aria-label*="Next"], a[rel="next"]',
  
  // Total results
  totalResults: 'span[class*="total-results"], div[class*="result-count"]'
};

/**
 * Fallback selectors - used if primary selectors fail
 * These are more generic and may capture more data but with less precision
 */
export const FALLBACK_SELECTORS = {
  autotrader: {
    vehicleCard: 'div[class*="card"], article, div[class*="listing"]',
    title: 'h2, h3, a[class*="title"]',
    price: 'span:contains("$"), div:contains("$")',
    link: 'a[href*="/cars/"]'
  },
  cargurus: {
    vehicleCard: 'article, div[class*="card"], div[class*="listing"]',
    title: 'h2, h3, h4, a[class*="title"]',
    price: 'span:contains("$"), div:contains("$")',
    link: 'a[href*="/cars/"]'
  }
};

/**
 * URL patterns for constructing search URLs
 */
export const URL_PATTERNS = {
  autotrader: {
    base: 'https://www.autotrader.ca',
    search: '/cars/',
    params: {
      rcp: 100, // Results per page
      srt: 'Price Ascending',
      prx: -1, // Province (-1 = all)
      loc: 'Canada'
    }
  },
  cargurus: {
    base: 'https://www.cargurus.ca',
    search: '/Cars/inventorylisting/',
    params: {
      sourceContext: 'carGurusHomePageModel',
      distance: 50000
    }
  }
};

/**
 * Helper function to build search URL
 */
export function buildAutoTraderURL(params: {
  make?: string;
  model?: string;
  yearMin?: number;
  yearMax?: number;
  priceMin?: number;
  priceMax?: number;
  location?: string;
  radius?: number;
}): string {
  const base = 'https://www.autotrader.ca/cars';
  const queryParams = new URLSearchParams();
  
  if (params.make) queryParams.append('make', params.make);
  if (params.model) queryParams.append('mdl', params.model);
  if (params.yearMin) queryParams.append('yRng', `${params.yearMin},`);
  if (params.yearMax) queryParams.append('yRng', `,${params.yearMax}`);
  if (params.priceMin) queryParams.append('pRng', `${params.priceMin},`);
  if (params.priceMax) queryParams.append('pRng', `,${params.priceMax}`);
  if (params.location) queryParams.append('loc', params.location);
  if (params.radius) queryParams.append('prx', params.radius.toString());
  
  queryParams.append('rcp', '100');
  queryParams.append('srt', 'Price Ascending');
  
  return `${base}?${queryParams.toString()}`;
}

export function buildCarGurusURL(params: {
  make?: string;
  model?: string;
  yearMin?: number;
  yearMax?: number;
  priceMin?: number;
  priceMax?: number;
  postalCode?: string;
  radius?: number;
}): string {
  const base = 'https://www.cargurus.ca/Cars/inventorylisting';
  const queryParams = new URLSearchParams();
  
  if (params.make) queryParams.append('make', params.make);
  if (params.model) queryParams.append('model', params.model);
  if (params.yearMin) queryParams.append('minYear', params.yearMin.toString());
  if (params.yearMax) queryParams.append('maxYear', params.yearMax.toString());
  if (params.priceMin) queryParams.append('minPrice', params.priceMin.toString());
  if (params.priceMax) queryParams.append('maxPrice', params.priceMax.toString());
  if (params.postalCode) queryParams.append('zip', params.postalCode);
  if (params.radius) queryParams.append('distance', params.radius.toString());
  
  return `${base}?${queryParams.toString()}`;
}
