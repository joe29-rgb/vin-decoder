/**
 * Reports and Analytics Module
 * Business intelligence, metrics, and data aggregation
 */

import { Vehicle } from '../types/types';
import logger from '../utils/logger';

export interface InventoryMetrics {
  totalVehicles: number;
  totalValue: number;
  averagePrice: number;
  averageMileage: number;
  averageAge: number;
  byMake: Record<string, number>;
  byYear: Record<string, number>;
  byPriceRange: Record<string, number>;
  inStock: number;
  outOfStock: number;
}

export interface SalesMetrics {
  totalDeals: number;
  totalRevenue: number;
  averageDealSize: number;
  totalGrossProfit: number;
  averageGrossProfit: number;
  conversionRate: number;
  byLender: Record<string, number>;
  byMonth: Record<string, number>;
}

export interface PerformanceMetrics {
  topPerformingVehicles: Array<{
    vehicle: string;
    deals: number;
    revenue: number;
    grossProfit: number;
  }>;
  topLenders: Array<{
    lender: string;
    deals: number;
    averageRate: number;
    totalReserve: number;
  }>;
  inventoryTurnover: number;
  daysToSell: number;
}

export interface TrendData {
  period: string;
  value: number;
  change: number;
  percentChange: number;
}

export interface ReportData {
  generatedAt: Date;
  period: {
    start: Date;
    end: Date;
  };
  inventory: InventoryMetrics;
  sales?: SalesMetrics;
  performance?: PerformanceMetrics;
  trends: {
    inventory: TrendData[];
    sales: TrendData[];
    profit: TrendData[];
  };
}

export function calculateInventoryMetrics(vehicles: Vehicle[]): InventoryMetrics {
  const totalVehicles = vehicles.length;
  const totalValue = vehicles.reduce((sum, v) => sum + (v.suggestedPrice || 0), 0);
  const averagePrice = totalVehicles > 0 ? totalValue / totalVehicles : 0;
  
  const totalMileage = vehicles.reduce((sum, v) => sum + (v.mileage || 0), 0);
  const averageMileage = totalVehicles > 0 ? totalMileage / totalVehicles : 0;
  
  const currentYear = new Date().getFullYear();
  const totalAge = vehicles.reduce((sum, v) => sum + (currentYear - (v.year || currentYear)), 0);
  const averageAge = totalVehicles > 0 ? totalAge / totalVehicles : 0;
  
  const byMake: Record<string, number> = {};
  const byYear: Record<string, number> = {};
  const byPriceRange: Record<string, number> = {
    '0-10000': 0,
    '10000-20000': 0,
    '20000-30000': 0,
    '30000-40000': 0,
    '40000-50000': 0,
    '50000+': 0,
  };
  
  let inStock = 0;
  let outOfStock = 0;
  
  vehicles.forEach(v => {
    byMake[v.make] = (byMake[v.make] || 0) + 1;
    byYear[v.year] = (byYear[v.year] || 0) + 1;
    
    const price = v.suggestedPrice || 0;
    if (price < 10000) byPriceRange['0-10000']++;
    else if (price < 20000) byPriceRange['10000-20000']++;
    else if (price < 30000) byPriceRange['20000-30000']++;
    else if (price < 40000) byPriceRange['30000-40000']++;
    else if (price < 50000) byPriceRange['40000-50000']++;
    else byPriceRange['50000+']++;
    
    if (v.inStock) inStock++;
    else outOfStock++;
  });
  
  return {
    totalVehicles,
    totalValue: Math.round(totalValue),
    averagePrice: Math.round(averagePrice),
    averageMileage: Math.round(averageMileage),
    averageAge: Math.round(averageAge * 10) / 10,
    byMake,
    byYear,
    byPriceRange,
    inStock,
    outOfStock,
  };
}

export function generateInventoryReport(vehicles: Vehicle[]): {
  summary: InventoryMetrics;
  insights: string[];
  recommendations: string[];
} {
  const summary = calculateInventoryMetrics(vehicles);
  const insights: string[] = [];
  const recommendations: string[] = [];
  
  if (summary.totalVehicles === 0) {
    insights.push('No vehicles in inventory');
    recommendations.push('Add inventory to start tracking metrics');
    return { summary, insights, recommendations };
  }
  
  const topMakes = Object.entries(summary.byMake)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3);
  
  if (topMakes.length > 0) {
    insights.push(`Top brands: ${topMakes.map(([make, count]) => `${make} (${count})`).join(', ')}`);
  }
  
  if (summary.averageAge > 8) {
    insights.push(`Average vehicle age is ${summary.averageAge.toFixed(1)} years - inventory is aging`);
    recommendations.push('Consider acquiring newer inventory to improve turnover');
  }
  
  if (summary.averageMileage > 150000) {
    insights.push(`Average mileage is ${Math.round(summary.averageMileage).toLocaleString()} km - high mileage inventory`);
    recommendations.push('Focus on lower mileage vehicles for better margins');
  }
  
  const stockRate = (summary.inStock / summary.totalVehicles) * 100;
  if (stockRate < 80) {
    insights.push(`Only ${stockRate.toFixed(0)}% of inventory is in stock`);
    recommendations.push('Update inventory status to reflect current availability');
  }
  
  const priceDistribution = Object.entries(summary.byPriceRange)
    .sort((a, b) => b[1] - a[1])[0];
  
  if (priceDistribution) {
    insights.push(`Most vehicles priced in ${priceDistribution[0]} range (${priceDistribution[1]} units)`);
  }
  
  return { summary, insights, recommendations };
}

export function calculateTrends(
  historicalData: Array<{ date: Date; value: number }>,
  periods: number = 12
): TrendData[] {
  const trends: TrendData[] = [];
  
  for (let i = 0; i < Math.min(periods, historicalData.length); i++) {
    const current = historicalData[i];
    const previous = i < historicalData.length - 1 ? historicalData[i + 1] : null;
    
    const change = previous ? current.value - previous.value : 0;
    const percentChange = previous && previous.value !== 0 
      ? (change / previous.value) * 100 
      : 0;
    
    trends.push({
      period: current.date.toISOString().split('T')[0],
      value: current.value,
      change: Math.round(change),
      percentChange: Math.round(percentChange * 100) / 100,
    });
  }
  
  return trends;
}

export function generateComparisonReport(
  currentInventory: Vehicle[],
  previousInventory: Vehicle[]
): {
  added: number;
  removed: number;
  priceChanges: number;
  totalValueChange: number;
  insights: string[];
} {
  const currentVINs = new Set(currentInventory.map(v => v.vin));
  const previousVINs = new Set(previousInventory.map(v => v.vin));
  
  const added = currentInventory.filter(v => !previousVINs.has(v.vin)).length;
  const removed = previousInventory.filter(v => !currentVINs.has(v.vin)).length;
  
  let priceChanges = 0;
  currentInventory.forEach(current => {
    const previous = previousInventory.find(v => v.vin === current.vin);
    if (previous && previous.suggestedPrice !== current.suggestedPrice) {
      priceChanges++;
    }
  });
  
  const currentValue = currentInventory.reduce((sum, v) => sum + (v.suggestedPrice || 0), 0);
  const previousValue = previousInventory.reduce((sum, v) => sum + (v.suggestedPrice || 0), 0);
  const totalValueChange = currentValue - previousValue;
  
  const insights: string[] = [];
  
  if (added > 0) insights.push(`${added} vehicles added to inventory`);
  if (removed > 0) insights.push(`${removed} vehicles removed from inventory`);
  if (priceChanges > 0) insights.push(`${priceChanges} price adjustments made`);
  
  if (totalValueChange > 0) {
    insights.push(`Total inventory value increased by $${Math.round(totalValueChange).toLocaleString()}`);
  } else if (totalValueChange < 0) {
    insights.push(`Total inventory value decreased by $${Math.round(Math.abs(totalValueChange)).toLocaleString()}`);
  }
  
  return {
    added,
    removed,
    priceChanges,
    totalValueChange: Math.round(totalValueChange),
    insights,
  };
}

export function generateDealerPerformanceReport(vehicles: Vehicle[]): {
  totalInventory: number;
  averagePrice: number;
  priceCompetitiveness: string;
  inventoryHealth: string;
  recommendations: string[];
} {
  const metrics = calculateInventoryMetrics(vehicles);
  
  let priceCompetitiveness = 'Average';
  if (metrics.averagePrice < 20000) priceCompetitiveness = 'Budget-Friendly';
  else if (metrics.averagePrice > 40000) priceCompetitiveness = 'Premium';
  
  let inventoryHealth = 'Good';
  if (metrics.averageAge > 10) inventoryHealth = 'Aging';
  else if (metrics.averageAge < 3) inventoryHealth = 'Excellent';
  
  const recommendations: string[] = [];
  
  if (metrics.totalVehicles < 20) {
    recommendations.push('Expand inventory to increase sales opportunities');
  }
  
  if (metrics.averageAge > 8) {
    recommendations.push('Focus on acquiring newer vehicles');
  }
  
  const makeCount = Object.keys(metrics.byMake).length;
  if (makeCount < 5) {
    recommendations.push('Diversify inventory with more brands');
  }
  
  return {
    totalInventory: metrics.totalVehicles,
    averagePrice: metrics.averagePrice,
    priceCompetitiveness,
    inventoryHealth,
    recommendations,
  };
}

export function exportReportToCSV(metrics: InventoryMetrics): string {
  const lines: string[] = [];
  
  lines.push('Finance-in-a-Box Inventory Report');
  lines.push(`Generated: ${new Date().toISOString()}`);
  lines.push('');
  
  lines.push('Summary');
  lines.push(`Total Vehicles,${metrics.totalVehicles}`);
  lines.push(`Total Value,$${metrics.totalValue.toLocaleString()}`);
  lines.push(`Average Price,$${metrics.averagePrice.toLocaleString()}`);
  lines.push(`Average Mileage,${metrics.averageMileage.toLocaleString()} km`);
  lines.push(`Average Age,${metrics.averageAge} years`);
  lines.push(`In Stock,${metrics.inStock}`);
  lines.push(`Out of Stock,${metrics.outOfStock}`);
  lines.push('');
  
  lines.push('By Make');
  lines.push('Make,Count');
  Object.entries(metrics.byMake)
    .sort((a, b) => b[1] - a[1])
    .forEach(([make, count]) => {
      lines.push(`${make},${count}`);
    });
  lines.push('');
  
  lines.push('By Price Range');
  lines.push('Range,Count');
  Object.entries(metrics.byPriceRange).forEach(([range, count]) => {
    lines.push(`${range},${count}`);
  });
  
  return lines.join('\n');
}

export function generateExecutiveSummary(vehicles: Vehicle[]): {
  keyMetrics: Record<string, string | number>;
  highlights: string[];
  concerns: string[];
} {
  const metrics = calculateInventoryMetrics(vehicles);
  
  const keyMetrics = {
    'Total Inventory': metrics.totalVehicles,
    'Total Value': `$${metrics.totalValue.toLocaleString()}`,
    'Average Price': `$${metrics.averagePrice.toLocaleString()}`,
    'Stock Rate': `${Math.round((metrics.inStock / metrics.totalVehicles) * 100)}%`,
  };
  
  const highlights: string[] = [];
  const concerns: string[] = [];
  
  if (metrics.totalVehicles > 50) {
    highlights.push('Strong inventory levels');
  } else if (metrics.totalVehicles < 10) {
    concerns.push('Low inventory levels may limit sales');
  }
  
  if (metrics.averageAge < 5) {
    highlights.push('Fresh, modern inventory');
  } else if (metrics.averageAge > 10) {
    concerns.push('Aging inventory requires attention');
  }
  
  const stockRate = (metrics.inStock / metrics.totalVehicles) * 100;
  if (stockRate > 90) {
    highlights.push('Excellent inventory availability');
  } else if (stockRate < 70) {
    concerns.push('Inventory availability needs improvement');
  }
  
  return { keyMetrics, highlights, concerns };
}
