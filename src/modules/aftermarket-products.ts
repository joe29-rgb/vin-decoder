/**
 * MODULE 5: AFTERMARKET PRODUCTS PRICING
 * Fixed pricing (NOT percentages) for warranties, gap, tire & rim, appearance
 */

import { Product, ProductBundle } from '../types/types';

export const PRODUCTS = {
  WARRANTY_ECONOMY: {
    name: 'Extended Warranty - Economy',
    category: 'warranty' as const,
    retailPrice: 1500,
    cost: 750,
    margin: 750,
  },
  WARRANTY_MID: {
    name: 'Extended Warranty - Mid-Range',
    category: 'warranty' as const,
    retailPrice: 2150,
    cost: 1075,
    margin: 1075,
  },
  WARRANTY_PREMIUM: {
    name: 'Extended Warranty - Premium',
    category: 'warranty' as const,
    retailPrice: 3000,
    cost: 1500,
    margin: 1500,
  },
  GAP: {
    name: 'Gap Insurance',
    category: 'gap' as const,
    retailPrice: 649,
    cost: 200,
    margin: 449,
  },
  TIRE_BASIC: {
    name: 'Tire & Rim - Basic',
    category: 'tire' as const,
    retailPrice: 449,
    cost: 200,
    margin: 249,
  },
  TIRE_PREMIUM: {
    name: 'Tire & Rim - Premium',
    category: 'tire' as const,
    retailPrice: 649,
    cost: 325,
    margin: 324,
  },
  TIRE_ULTIMATE: {
    name: 'Tire & Rim - Ultimate',
    category: 'tire' as const,
    retailPrice: 1049,
    cost: 500,
    margin: 549,
  },
  PAINT: {
    name: 'Paint Protection',
    category: 'appearance' as const,
    retailPrice: 349,
    cost: 175,
    margin: 174,
  },
  FABRIC: {
    name: 'Fabric Protection',
    category: 'appearance' as const,
    retailPrice: 249,
    cost: 125,
    margin: 124,
  },
  PAINT_FABRIC: {
    name: 'Paint & Fabric Protection',
    category: 'appearance' as const,
    retailPrice: 499,
    cost: 250,
    margin: 249,
  },
};

export function recommendBundles(
  cbbValue: number,
  lender: string
): ProductBundle[] {
  const bundles: ProductBundle[] = [];

  let warrantyProduct = PRODUCTS.WARRANTY_ECONOMY;
  if (cbbValue >= 20000 && cbbValue < 35000) {
    warrantyProduct = PRODUCTS.WARRANTY_MID;
  } else if (cbbValue >= 35000) {
    warrantyProduct = PRODUCTS.WARRANTY_PREMIUM;
  }

  bundles.push({
    products: [warrantyProduct],
    totalRetail: warrantyProduct.retailPrice,
    totalCost: warrantyProduct.cost,
    totalMargin: warrantyProduct.margin,
  });

  bundles.push({
    products: [warrantyProduct, PRODUCTS.GAP, PRODUCTS.TIRE_BASIC],
    totalRetail:
      warrantyProduct.retailPrice + PRODUCTS.GAP.retailPrice + PRODUCTS.TIRE_BASIC.retailPrice,
    totalCost:
      warrantyProduct.cost + PRODUCTS.GAP.cost + PRODUCTS.TIRE_BASIC.cost,
    totalMargin:
      warrantyProduct.margin + PRODUCTS.GAP.margin + PRODUCTS.TIRE_BASIC.margin,
  });

  bundles.push({
    products: [warrantyProduct, PRODUCTS.GAP, PRODUCTS.TIRE_PREMIUM, PRODUCTS.PAINT_FABRIC],
    totalRetail:
      warrantyProduct.retailPrice +
      PRODUCTS.GAP.retailPrice +
      PRODUCTS.TIRE_PREMIUM.retailPrice +
      PRODUCTS.PAINT_FABRIC.retailPrice,
    totalCost:
      warrantyProduct.cost + PRODUCTS.GAP.cost + PRODUCTS.TIRE_PREMIUM.cost + PRODUCTS.PAINT_FABRIC.cost,
    totalMargin:
      warrantyProduct.margin + PRODUCTS.GAP.margin + PRODUCTS.TIRE_PREMIUM.margin + PRODUCTS.PAINT_FABRIC.margin,
  });

  return bundles;
}

export function validateProductFit(
  productBundle: ProductBundle,
  cbbValue: number,
  lender: string
): { fits: boolean; maxAllowed: number; percentOfCBB: number } {
  const limit = lender === 'Santander' ? 0.3 : 0.4;
  const maxAllowed = cbbValue * limit;
  const percentOfCBB = (productBundle.totalRetail / cbbValue) * 100;

  return {
    fits: productBundle.totalRetail <= maxAllowed,
    maxAllowed,
    percentOfCBB,
  };
}
