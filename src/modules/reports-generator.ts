import { state } from '../api/state';
import { Vehicle } from '../types/types';

export interface DealMetrics {
  totalDeals: number;
  totalRevenue: number;
  averageGrossProfit: number;
  averagePayment: number;
  topLender: string;
  topLenderDeals: number;
}

export interface LenderPerformance {
  lenderName: string;
  totalDeals: number;
  totalRevenue: number;
  approvalRate: number;
  averagePayment: number;
}

export interface VehicleTurnover {
  totalVehicles: number;
  inStock: number;
  sold: number;
  averageDaysInStock: number;
  turnoverRate: number;
}

export interface RevenueByMonth {
  month: string;
  revenue: number;
  deals: number;
  grossProfit: number;
}

export interface CreditTierDistribution {
  tier: string;
  count: number;
  percentage: number;
  averageRate: number;
}

const dealHistory: Array<{
  id: string;
  date: Date;
  vehicleId: string;
  lender: string;
  revenue: number;
  grossProfit: number;
  payment: number;
  creditTier: string;
}> = [];

export function recordDeal(deal: {
  vehicleId: string;
  lender: string;
  revenue: number;
  grossProfit: number;
  payment: number;
  creditTier?: string;
}): void {
  dealHistory.push({
    id: `DEAL-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    date: new Date(),
    ...deal,
    creditTier: deal.creditTier || 'Standard',
  });
  
  console.log('[REPORTS] Deal recorded:', dealHistory[dealHistory.length - 1].id);
}

export function getDealMetrics(): DealMetrics {
  if (dealHistory.length === 0) {
    return {
      totalDeals: 0,
      totalRevenue: 0,
      averageGrossProfit: 0,
      averagePayment: 0,
      topLender: 'N/A',
      topLenderDeals: 0,
    };
  }

  const totalRevenue = dealHistory.reduce((sum, d) => sum + d.revenue, 0);
  const totalGrossProfit = dealHistory.reduce((sum, d) => sum + d.grossProfit, 0);
  const totalPayment = dealHistory.reduce((sum, d) => sum + d.payment, 0);

  const lenderCounts: Record<string, number> = {};
  dealHistory.forEach(d => {
    lenderCounts[d.lender] = (lenderCounts[d.lender] || 0) + 1;
  });

  const topLenderEntry = Object.entries(lenderCounts).sort((a, b) => b[1] - a[1])[0];
  const topLender = topLenderEntry ? topLenderEntry[0] : 'N/A';
  const topLenderDeals = topLenderEntry ? topLenderEntry[1] : 0;

  return {
    totalDeals: dealHistory.length,
    totalRevenue,
    averageGrossProfit: totalGrossProfit / dealHistory.length,
    averagePayment: totalPayment / dealHistory.length,
    topLender,
    topLenderDeals,
  };
}

export function getLenderPerformance(): LenderPerformance[] {
  const lenderStats: Record<string, {
    deals: number;
    revenue: number;
    payments: number[];
  }> = {};

  dealHistory.forEach(d => {
    if (!lenderStats[d.lender]) {
      lenderStats[d.lender] = { deals: 0, revenue: 0, payments: [] };
    }
    lenderStats[d.lender].deals++;
    lenderStats[d.lender].revenue += d.revenue;
    lenderStats[d.lender].payments.push(d.payment);
  });

  return Object.entries(lenderStats).map(([lenderName, stats]) => ({
    lenderName,
    totalDeals: stats.deals,
    totalRevenue: stats.revenue,
    approvalRate: dealHistory.length > 0 ? (stats.deals / dealHistory.length) * 100 : 0,
    averagePayment: stats.payments.reduce((sum, p) => sum + p, 0) / stats.payments.length,
  })).sort((a, b) => b.totalRevenue - a.totalRevenue);
}

export function getVehicleTurnover(): VehicleTurnover {
  const inventory = state.inventory;
  const totalVehicles = inventory.length;
  const inStock = inventory.filter(v => v.inStock).length;
  const sold = totalVehicles - inStock;

  const averageDaysInStock = 45;
  const turnoverRate = sold > 0 ? (sold / totalVehicles) * 100 : 0;

  return {
    totalVehicles,
    inStock,
    sold,
    averageDaysInStock,
    turnoverRate,
  };
}

export function getRevenueByMonth(months: number = 6): RevenueByMonth[] {
  const monthlyData: Record<string, { revenue: number; deals: number; grossProfit: number }> = {};

  const now = new Date();
  for (let i = months - 1; i >= 0; i--) {
    const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const key = date.toISOString().slice(0, 7);
    monthlyData[key] = { revenue: 0, deals: 0, grossProfit: 0 };
  }

  dealHistory.forEach(d => {
    const key = d.date.toISOString().slice(0, 7);
    if (monthlyData[key]) {
      monthlyData[key].revenue += d.revenue;
      monthlyData[key].deals++;
      monthlyData[key].grossProfit += d.grossProfit;
    }
  });

  return Object.entries(monthlyData).map(([month, data]) => ({
    month,
    ...data,
  }));
}

export function getCreditTierDistribution(): CreditTierDistribution[] {
  const tierStats: Record<string, { count: number; rates: number[] }> = {};

  dealHistory.forEach(d => {
    const tier = d.creditTier || 'Standard';
    if (!tierStats[tier]) {
      tierStats[tier] = { count: 0, rates: [] };
    }
    tierStats[tier].count++;
    tierStats[tier].rates.push(8.99);
  });

  const total = dealHistory.length || 1;

  return Object.entries(tierStats).map(([tier, stats]) => ({
    tier,
    count: stats.count,
    percentage: (stats.count / total) * 100,
    averageRate: stats.rates.reduce((sum, r) => sum + r, 0) / stats.rates.length,
  })).sort((a, b) => b.count - a.count);
}

export function generateSampleData(): void {
  const lenders = ['TD', 'Santander', 'SDA', 'IAAutoFinance', 'EdenPark', 'RIFCO'];
  const tiers = ['Prime', 'Near-Prime', 'Sub-Prime', 'Deep Sub-Prime'];
  
  for (let i = 0; i < 50; i++) {
    const daysAgo = Math.floor(Math.random() * 180);
    const date = new Date();
    date.setDate(date.getDate() - daysAgo);
    
    dealHistory.push({
      id: `DEAL-SAMPLE-${i}`,
      date,
      vehicleId: `VEH-${i}`,
      lender: lenders[Math.floor(Math.random() * lenders.length)],
      revenue: 15000 + Math.random() * 20000,
      grossProfit: 2000 + Math.random() * 3000,
      payment: 300 + Math.random() * 400,
      creditTier: tiers[Math.floor(Math.random() * tiers.length)],
    });
  }
  
  console.log('[REPORTS] Generated 50 sample deals for testing');
}

export function clearDealHistory(): void {
  dealHistory.length = 0;
  console.log('[REPORTS] Deal history cleared');
}

export function getDealHistory() {
  return dealHistory;
}
