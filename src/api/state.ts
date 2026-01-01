import { Vehicle, ApprovalSpec, TradeInfo } from '../types/types';

export type ImageEntry = { mime: string; buf: Buffer };

export const state = {
  inventory: [] as Vehicle[],
  mirroredInventory: [] as Vehicle[],
  lastApproval: null as null | { contactId: string; locationId: string; approval: ApprovalSpec; trade: TradeInfo },
  imageStoreByVin: new Map<string, ImageEntry>(),
  imageStoreById: new Map<string, ImageEntry>(),
};
