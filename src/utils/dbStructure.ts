// src/utils/dbStructure.ts
export const DB_PATHS = {
  USERS: 'users',
  VENDORS: 'vendors',
  BIDS: 'bids',
  SHIPMENTS: 'shipments',
  NOTIFICATIONS: 'notifications',
  PLACE_OFFERS: 'placeOffers',
  VEHICLE_DETAILS: 'vehicleDetails',
  RESPOND_TO_COUNTER: 'respondToCounter',
  LANES: 'lanes',
};

export interface User {
  uid: string;
  email: string;
  role: 'admin' | 'vendor';
  name: string;
  createdAt: number;
}

export interface Bid {
  bidId: string;
  vendorId: string;
  vendorName: string;
  amount: number;
  details: string;
  status: 'pending' | 'accepted' | 'rejected';
  createdAt: number;
}

export interface Shipment {
  shipmentId: string;
  bidId: string;
  vendorId: string;
  status: 'in-transit' | 'delivered' | 'cancelled';
  trackingNumber?: string;
  estimatedDelivery?: number;
  createdAt: number;
}