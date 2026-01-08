/**
 * INVENTORY MANAGEMENT MODULE
 * Aging reports, search, comparison, alerts, bulk updates
 */

import { Vehicle } from '../types/types';

export interface InventoryMetrics {
  totalVehicles: number;
  totalValue: number;
  averageDaysInStock: number;
  staleInventory: number; // >90 days
  avgPrice: number;
  avgMileage: number;
}

export interface VehicleWithAge extends Vehicle {
  daysInStock?: number;
  addedDate?: Date;
  lastUpdated?: Date;
  isStale?: boolean;
}

/**
 * Calculate days in stock
 */
export function calculateDaysInStock(vehicle: VehicleWithAge): number {
  if (!vehicle.addedDate) return 0;
  
  const now = new Date();
  const added = new Date(vehicle.addedDate);
  const diffTime = Math.abs(now.getTime() - added.getTime());
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  
  return diffDays;
}

/**
 * Generate aging report
 */
export function generateAgingReport(inventory: VehicleWithAge[]): {
  byAge: { range: string; count: number; totalValue: number }[];
  staleVehicles: VehicleWithAge[];
  metrics: InventoryMetrics;
} {
  const ranges = [
    { min: 0, max: 30, label: '0-30 days' },
    { min: 31, max: 60, label: '31-60 days' },
    { min: 61, max: 90, label: '61-90 days' },
    { min: 91, max: 120, label: '91-120 days' },
    { min: 121, max: Infinity, label: '120+ days' }
  ];
  
  const byAge = ranges.map(range => ({
    range: range.label,
    count: 0,
    totalValue: 0
  }));
  
  const staleVehicles: VehicleWithAge[] = [];
  let totalDays = 0;
  let totalValue = 0;
  
  inventory.forEach(v => {
    const days = calculateDaysInStock(v);
    v.daysInStock = days;
    v.isStale = days > 90;
    
    totalDays += days;
    totalValue += v.suggestedPrice || 0;
    
    if (v.isStale) {
      staleVehicles.push(v);
    }
    
    const rangeIndex = ranges.findIndex(r => days >= r.min && days <= r.max);
    if (rangeIndex >= 0) {
      byAge[rangeIndex].count++;
      byAge[rangeIndex].totalValue += v.suggestedPrice || 0;
    }
  });
  
  const metrics: InventoryMetrics = {
    totalVehicles: inventory.length,
    totalValue,
    averageDaysInStock: inventory.length > 0 ? Math.round(totalDays / inventory.length) : 0,
    staleInventory: staleVehicles.length,
    avgPrice: inventory.length > 0 ? Math.round(totalValue / inventory.length) : 0,
    avgMileage: inventory.length > 0 ? Math.round(inventory.reduce((sum, v) => sum + (v.mileage || 0), 0) / inventory.length) : 0
  };
  
  return { byAge, staleVehicles, metrics };
}

/**
 * Full-text search across inventory
 */
export function searchInventory(inventory: Vehicle[], query: string): Vehicle[] {
  if (!query || query.trim().length === 0) return inventory;
  
  const lowerQuery = query.toLowerCase();
  
  return inventory.filter(v => {
    const searchFields = [
      v.id,
      v.vin,
      v.year?.toString(),
      v.make,
      v.model,
      v.trim,
      v.engine,
      v.transmission,
      v.color
    ].filter(Boolean).map(f => f!.toLowerCase());
    
    return searchFields.some(field => field.includes(lowerQuery));
  });
}

/**
 * Filter inventory by criteria
 */
export function filterInventory(inventory: Vehicle[], filters: {
  makeModel?: string;
  yearMin?: number;
  yearMax?: number;
  priceMin?: number;
  priceMax?: number;
  mileageMax?: number;
  inStockOnly?: boolean;
}): Vehicle[] {
  return inventory.filter(v => {
    if (filters.makeModel) {
      const mm = filters.makeModel.toLowerCase();
      const vehicleMM = `${v.make} ${v.model}`.toLowerCase();
      if (!vehicleMM.includes(mm)) return false;
    }
    
    if (filters.yearMin && v.year < filters.yearMin) return false;
    if (filters.yearMax && v.year > filters.yearMax) return false;
    if (filters.priceMin && v.suggestedPrice < filters.priceMin) return false;
    if (filters.priceMax && v.suggestedPrice > filters.priceMax) return false;
    if (filters.mileageMax && v.mileage > filters.mileageMax) return false;
    if (filters.inStockOnly && !v.inStock) return false;
    
    return true;
  });
}

/**
 * Compare vehicles side-by-side
 */
export function compareVehicles(vehicles: Vehicle[]): {
  vehicles: Vehicle[];
  comparison: Record<string, any[]>;
} {
  const comparison: Record<string, any[]> = {
    id: [],
    year: [],
    make: [],
    model: [],
    trim: [],
    mileage: [],
    price: [],
    cbbWholesale: [],
    cbbRetail: [],
    yourCost: [],
    engine: [],
    transmission: [],
    color: []
  };
  
  vehicles.forEach(v => {
    comparison.id.push(v.id);
    comparison.year.push(v.year);
    comparison.make.push(v.make);
    comparison.model.push(v.model);
    comparison.trim.push(v.trim || 'N/A');
    comparison.mileage.push(v.mileage);
    comparison.price.push(v.suggestedPrice);
    comparison.cbbWholesale.push(v.cbbWholesale);
    comparison.cbbRetail.push(v.cbbRetail);
    comparison.yourCost.push(v.yourCost);
    comparison.engine.push(v.engine);
    comparison.transmission.push(v.transmission);
    comparison.color.push(v.color || 'N/A');
  });
  
  return { vehicles, comparison };
}

/**
 * Bulk update inventory
 */
export function bulkUpdateInventory(
  inventory: Vehicle[],
  vehicleIds: string[],
  updates: Partial<Vehicle>
): Vehicle[] {
  return inventory.map(v => {
    if (vehicleIds.includes(v.id)) {
      return { ...v, ...updates, lastUpdated: new Date().toISOString() };
    }
    return v;
  });
}

/**
 * Inventory alerts
 */
export interface InventoryAlert {
  type: 'high_value_added' | 'stale_inventory' | 'price_drop' | 'sold';
  vehicleId: string;
  message: string;
  timestamp: Date;
}

const alerts: InventoryAlert[] = [];

export function addInventoryAlert(alert: InventoryAlert): void {
  alerts.push(alert);
  
  // Keep only last 100 alerts
  if (alerts.length > 100) {
    alerts.shift();
  }
}

export function getInventoryAlerts(limit: number = 20): InventoryAlert[] {
  return alerts.slice(-limit).reverse();
}

export function checkForAlerts(oldInventory: Vehicle[], newInventory: Vehicle[]): void {
  // Check for high-value additions
  newInventory.forEach(newV => {
    const existed = oldInventory.find(oldV => oldV.id === newV.id);
    if (!existed && newV.suggestedPrice > 50000) {
      addInventoryAlert({
        type: 'high_value_added',
        vehicleId: newV.id,
        message: `High-value vehicle added: ${newV.year} ${newV.make} ${newV.model} - $${newV.suggestedPrice.toLocaleString()}`,
        timestamp: new Date()
      });
    }
  });
  
  // Check for sold vehicles
  oldInventory.forEach(oldV => {
    const stillExists = newInventory.find(newV => newV.id === oldV.id);
    if (!stillExists && oldV.inStock) {
      addInventoryAlert({
        type: 'sold',
        vehicleId: oldV.id,
        message: `Vehicle sold: ${oldV.year} ${oldV.make} ${oldV.model}`,
        timestamp: new Date()
      });
    }
  });
  
  // Check for price drops
  newInventory.forEach(newV => {
    const oldV = oldInventory.find(v => v.id === newV.id);
    if (oldV && newV.suggestedPrice < oldV.suggestedPrice) {
      const drop = oldV.suggestedPrice - newV.suggestedPrice;
      if (drop > 1000) {
        addInventoryAlert({
          type: 'price_drop',
          vehicleId: newV.id,
          message: `Price drop: ${newV.year} ${newV.make} ${newV.model} - $${drop.toLocaleString()} reduction`,
          timestamp: new Date()
        });
      }
    }
  });
}

/**
 * Vehicle reservation system
 */
const reservations: Map<string, { customerName: string; until: Date }> = new Map();

export function reserveVehicle(vehicleId: string, customerName: string, hours: number = 24): void {
  const until = new Date();
  until.setHours(until.getHours() + hours);
  
  reservations.set(vehicleId, { customerName, until });
}

export function unreserveVehicle(vehicleId: string): void {
  reservations.delete(vehicleId);
}

export function isVehicleReserved(vehicleId: string): boolean {
  const reservation = reservations.get(vehicleId);
  if (!reservation) return false;
  
  // Check if expired
  if (new Date() > reservation.until) {
    reservations.delete(vehicleId);
    return false;
  }
  
  return true;
}

export function getReservation(vehicleId: string): { customerName: string; until: Date } | null {
  const reservation = reservations.get(vehicleId);
  if (!reservation) return null;
  
  // Check if expired
  if (new Date() > reservation.until) {
    reservations.delete(vehicleId);
    return null;
  }
  
  return reservation;
}

/**
 * Inventory templates
 */
export interface InventoryTemplate {
  name: string;
  filters: {
    makeModel?: string;
    yearMin?: number;
    yearMax?: number;
    priceMin?: number;
    priceMax?: number;
    mileageMax?: number;
  };
  sortBy?: 'price' | 'mileage' | 'year' | 'daysInStock';
  sortOrder?: 'asc' | 'desc';
}

const templates: Map<string, InventoryTemplate> = new Map();

export function saveInventoryTemplate(template: InventoryTemplate): void {
  templates.set(template.name, template);
}

export function loadInventoryTemplate(name: string): InventoryTemplate | null {
  return templates.get(name) || null;
}

export function getAllTemplates(): InventoryTemplate[] {
  return Array.from(templates.values());
}

export function deleteInventoryTemplate(name: string): void {
  templates.delete(name);
}
