/**
 * Real-time Inventory Sync
 * Automatic inventory updates with change detection and notifications
 */

import { Vehicle } from '../types/types';
import logger from '../utils/logger';
import axios from 'axios';

interface SyncConfig {
  enabled: boolean;
  intervalMinutes: number;
  sources: SyncSource[];
  webhookUrl?: string;
  notifyOnChanges: boolean;
}

interface SyncSource {
  type: 'scraper' | 'api' | 'webhook';
  name: string;
  url?: string;
  enabled: boolean;
  lastSync?: Date;
  lastError?: string;
}

interface SyncResult {
  timestamp: Date;
  source: string;
  vehiclesAdded: number;
  vehiclesUpdated: number;
  vehiclesRemoved: number;
  errors: string[];
  duration: number;
}

interface InventoryChange {
  type: 'added' | 'updated' | 'removed' | 'price_change';
  vehicle: Vehicle;
  oldValue?: any;
  newValue?: any;
  timestamp: Date;
}

const syncConfig: SyncConfig = {
  enabled: false,
  intervalMinutes: 60,
  sources: [],
  notifyOnChanges: true,
};

const syncHistory: SyncResult[] = [];
const changeLog: InventoryChange[] = [];
let syncInterval: NodeJS.Timeout | null = null;
let inventoryStore: Vehicle[] = [];

async function getInventory(): Promise<Vehicle[]> {
  return [...inventoryStore];
}

async function syncVehicle(vehicle: Vehicle): Promise<void> {
  const index = inventoryStore.findIndex(v => v.vin === vehicle.vin || v.id === vehicle.id);
  if (index >= 0) {
    inventoryStore[index] = vehicle;
  } else {
    inventoryStore.push(vehicle);
  }
}

export function setInventoryStore(vehicles: Vehicle[]): void {
  inventoryStore = [...vehicles];
  logger.info('Inventory store updated', { count: vehicles.length });
}

export function getInventoryStore(): Vehicle[] {
  return [...inventoryStore];
}

export function configureSyncService(config: Partial<SyncConfig>): void {
  Object.assign(syncConfig, config);
  
  if (syncConfig.enabled && !syncInterval) {
    startSyncService();
  } else if (!syncConfig.enabled && syncInterval) {
    stopSyncService();
  }
  
  logger.info('Inventory sync configured', { config: syncConfig });
}

export function getSyncConfig(): SyncConfig {
  return { ...syncConfig };
}

export function addSyncSource(source: SyncSource): void {
  const existing = syncConfig.sources.findIndex(s => s.name === source.name);
  if (existing >= 0) {
    syncConfig.sources[existing] = source;
  } else {
    syncConfig.sources.push(source);
  }
  logger.info('Sync source added', { source: source.name });
}

export function removeSyncSource(name: string): boolean {
  const index = syncConfig.sources.findIndex(s => s.name === name);
  if (index >= 0) {
    syncConfig.sources.splice(index, 1);
    logger.info('Sync source removed', { source: name });
    return true;
  }
  return false;
}

export function startSyncService(): void {
  if (syncInterval) {
    logger.warn('Sync service already running');
    return;
  }

  syncConfig.enabled = true;
  const intervalMs = syncConfig.intervalMinutes * 60 * 1000;
  
  syncInterval = setInterval(async () => {
    try {
      await performSync();
    } catch (error: any) {
      logger.error('Scheduled sync failed', { error: error.message });
    }
  }, intervalMs);

  logger.info('Inventory sync service started', { 
    intervalMinutes: syncConfig.intervalMinutes 
  });

  performSync().catch(error => {
    logger.error('Initial sync failed', { error: error.message });
  });
}

export function stopSyncService(): void {
  if (syncInterval) {
    clearInterval(syncInterval);
    syncInterval = null;
    syncConfig.enabled = false;
    logger.info('Inventory sync service stopped');
  }
}

export async function performSync(): Promise<SyncResult> {
  const startTime = Date.now();
  const result: SyncResult = {
    timestamp: new Date(),
    source: 'all',
    vehiclesAdded: 0,
    vehiclesUpdated: 0,
    vehiclesRemoved: 0,
    errors: [],
    duration: 0,
  };

  logger.info('Starting inventory sync');

  const currentInventory = await getInventory();
  const currentVINs = new Set(currentInventory.map((v: Vehicle) => v.vin).filter((vin: string) => vin));

  for (const source of syncConfig.sources) {
    if (!source.enabled) continue;

    try {
      const vehicles = await fetchFromSource(source);
      
      for (const vehicle of vehicles) {
        try {
          const existing = currentInventory.find((v: Vehicle) => v.vin === vehicle.vin || v.id === vehicle.id);
          
          if (!existing) {
            await syncVehicle(vehicle);
            result.vehiclesAdded++;
            logChange({
              type: 'added',
              vehicle,
              timestamp: new Date(),
            });
          } else {
            const hasChanges = detectChanges(existing, vehicle);
            if (hasChanges) {
              await syncVehicle(vehicle);
              result.vehiclesUpdated++;
              
              if (existing.suggestedPrice !== vehicle.suggestedPrice) {
                logChange({
                  type: 'price_change',
                  vehicle,
                  oldValue: existing.suggestedPrice,
                  newValue: vehicle.suggestedPrice,
                  timestamp: new Date(),
                });
              } else {
                logChange({
                  type: 'updated',
                  vehicle,
                  timestamp: new Date(),
                });
              }
            }
          }
          
          currentVINs.delete(vehicle.vin);
        } catch (error: any) {
          result.errors.push(`Failed to sync vehicle ${vehicle.vin}: ${error.message}`);
        }
      }

      source.lastSync = new Date();
      source.lastError = undefined;
    } catch (error: any) {
      source.lastError = error.message;
      result.errors.push(`Source ${source.name} failed: ${error.message}`);
      logger.error('Sync source failed', { source: source.name, error: error.message });
    }
  }

  result.duration = Date.now() - startTime;
  syncHistory.push(result);
  
  if (syncHistory.length > 100) {
    syncHistory.shift();
  }

  logger.info('Inventory sync completed', {
    added: result.vehiclesAdded,
    updated: result.vehiclesUpdated,
    removed: result.vehiclesRemoved,
    errors: result.errors.length,
    duration: result.duration,
  });

  if (syncConfig.notifyOnChanges && (result.vehiclesAdded > 0 || result.vehiclesUpdated > 0)) {
    await sendSyncNotification(result);
  }

  return result;
}

async function fetchFromSource(source: SyncSource): Promise<Vehicle[]> {
  if (source.type === 'scraper' && source.url) {
    const response = await axios.get(source.url, { timeout: 30000 });
    return response.data.vehicles || [];
  }
  
  if (source.type === 'api' && source.url) {
    const response = await axios.get(source.url, { timeout: 30000 });
    return response.data.vehicles || response.data || [];
  }

  return [];
}

function detectChanges(existing: Vehicle, updated: Vehicle): boolean {
  return (
    existing.suggestedPrice !== updated.suggestedPrice ||
    existing.mileage !== updated.mileage ||
    existing.inStock !== updated.inStock ||
    existing.imageUrl !== updated.imageUrl
  );
}

function logChange(change: InventoryChange): void {
  changeLog.push(change);
  
  if (changeLog.length > 1000) {
    changeLog.shift();
  }

  logger.info('Inventory change detected', {
    type: change.type,
    vin: change.vehicle.vin,
    vehicle: `${change.vehicle.year} ${change.vehicle.make} ${change.vehicle.model}`,
  });
}

async function sendSyncNotification(result: SyncResult): Promise<void> {
  if (!syncConfig.webhookUrl) return;

  try {
    await axios.post(
      syncConfig.webhookUrl,
      {
        event: 'inventory_sync',
        timestamp: result.timestamp,
        summary: {
          added: result.vehiclesAdded,
          updated: result.vehiclesUpdated,
          removed: result.vehiclesRemoved,
          errors: result.errors.length,
        },
        changes: changeLog.slice(-10),
      },
      { timeout: 10000 }
    );
    
    logger.info('Sync notification sent', { webhookUrl: syncConfig.webhookUrl });
  } catch (error: any) {
    logger.error('Failed to send sync notification', { error: error.message });
  }
}

export function getSyncHistory(limit: number = 20): SyncResult[] {
  return syncHistory.slice(-limit);
}

export function getChangeLog(limit: number = 100): InventoryChange[] {
  return changeLog.slice(-limit);
}

export function getChangesSince(timestamp: Date): InventoryChange[] {
  return changeLog.filter(c => c.timestamp > timestamp);
}

export function clearSyncHistory(): void {
  syncHistory.length = 0;
  logger.info('Sync history cleared');
}

export function clearChangeLog(): void {
  changeLog.length = 0;
  logger.info('Change log cleared');
}

export async function manualSync(sourceName?: string): Promise<SyncResult> {
  if (sourceName) {
    const source = syncConfig.sources.find(s => s.name === sourceName);
    if (!source) {
      throw new Error(`Sync source not found: ${sourceName}`);
    }
    
    const startTime = Date.now();
    const result: SyncResult = {
      timestamp: new Date(),
      source: sourceName,
      vehiclesAdded: 0,
      vehiclesUpdated: 0,
      vehiclesRemoved: 0,
      errors: [],
      duration: 0,
    };

    try {
      const vehicles = await fetchFromSource(source);
      const currentInventory = await getInventory();
      
      for (const vehicle of vehicles) {
        const existing = currentInventory.find((v: Vehicle) => v.vin === vehicle.vin || v.id === vehicle.id);
        
        if (!existing) {
          await syncVehicle(vehicle);
          result.vehiclesAdded++;
        } else if (detectChanges(existing, vehicle)) {
          await syncVehicle(vehicle);
          result.vehiclesUpdated++;
        }
      }
      
      source.lastSync = new Date();
      source.lastError = undefined;
    } catch (error: any) {
      source.lastError = error.message;
      result.errors.push(error.message);
    }

    result.duration = Date.now() - startTime;
    syncHistory.push(result);
    
    return result;
  }

  return performSync();
}

export function getSyncStatus(): {
  enabled: boolean;
  running: boolean;
  lastSync?: Date;
  nextSync?: Date;
  sources: SyncSource[];
} {
  const lastResult = syncHistory[syncHistory.length - 1];
  const nextSync = syncConfig.enabled && lastResult
    ? new Date(lastResult.timestamp.getTime() + syncConfig.intervalMinutes * 60 * 1000)
    : undefined;

  return {
    enabled: syncConfig.enabled,
    running: syncInterval !== null,
    lastSync: lastResult?.timestamp,
    nextSync,
    sources: syncConfig.sources,
  };
}
