
export enum UserRole {
  ADMIN = 'ADMIN',
  VENDOR = 'VENDOR'
}

export enum BidStatus {
  OPEN = 'OPEN',
  CLOSED = 'CLOSED',
  NEGOTIATING = 'NEGOTIATING',
  FINALIZED = 'FINALIZED',
  ASSIGNED = 'ASSIGNED'
}

export enum VehicleType {
  TRUCK = 'Truck',
  CONTAINER = 'Container',
  LCV = 'LCV',
  TRAILER = 'Trailer'
}

export enum LoadType {
  FTL = 'FTL',
  LTL = 'LTL'
}

export interface User {
  id: string;
  name: string;
  role: UserRole;
  lanes?: string[]; // Only for vendors
}

export interface Vendor extends User {
  email: string;
  phone: string;
  vehicleTypes: VehicleType[];
  isDeleted?: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Lane {
  id: string;
  name: string; // e.g., "DELHI-MUMBAI"
  origin: string;
  destination: string;
  code: string; // e.g., "DEL-PUN"
  isActive: boolean;
  createdAt: string;
  updatedAt?: string;
}

export interface BidOffer {
  vendorId: string;
  vendorName: string;
  amount: number;
  timestamp: string;
  rank?: number;
}

export interface VehicleDetails {
  vehicleNumber: string;
  vehicleType: string;
  driverName?: string;
  driverPhone?: string;
  expectedDispatch: string;
}

export interface ShipmentBid {
  id: string;
  // Request Summary
  requestByCustomer?: string;
  requestDate: string;
  loadType: LoadType;
  capacity: string;
  entryLocation?: string;
  product?: string;
  packagingType?: string;
  noOfPackages: number;
  weightKg: number;
  comments?: string;

  // Pickup Details
  pickupParty?: string;
  pickupDate: string;
  pickupPincode?: string;
  pickupLocation: string; // Used as 'Origin' in some displays
  pickupCity: string;
  pickupAddress?: string;

  // Delivery Details
  deliveryParty?: string;
  deliveryDate: string;
  deliveryPincode?: string;
  deliveryLocation: string; // Used as 'Destination' in some displays
  deliveryCity: string;
  deliveryAddress?: string;

  // Auction Parameters
  reservedPrice: number;
  ceilingRate: number;
  stepValue: number;
  bidStartDate: string;
  bidStartTime: string;
  bidEndDate: string;
  bidEndTime: string;
  showL1Value: boolean;

  // Status & Logic
  status: BidStatus;
  offers: BidOffer[];
  winningVendorId?: string;
  finalAmount?: number;
  counterOffer?: number;
  vehicleDetails?: VehicleDetails;
  createdAt: string;

  // Legacy display helpers
  origin: string; 
  destination: string;
  lane: string;
  vehicleType: VehicleType;
  deliveryTimeline: string;
  materialType: string;
  pickupTime: string;
  endTime: string;
}

export interface Notification {
  id: string;
  userId: string;
  title: string;
  message: string;
  timestamp: string;
  read: boolean;
  type: 'info' | 'success' | 'warning' | 'alert';
}
