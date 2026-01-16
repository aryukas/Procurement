
import { User, UserRole, ShipmentBid, BidStatus, VehicleType, LoadType, Lane } from './types';

export const MOCK_USERS: User[] = [
  { id: 'u-1', name: 'Admin User', role: UserRole.ADMIN },
  { id: 'v-1', name: 'Blue Dart Logistics', role: UserRole.VENDOR, lanes: ['DELHI-MUMBAI', 'DELHI-JAIPUR'] },
  { id: 'v-2', name: 'Gati KWE', role: UserRole.VENDOR, lanes: ['DELHI-MUMBAI', 'BLR-CHN'] },
  { id: 'v-3', name: 'Safexpress', role: UserRole.VENDOR, lanes: ['MUMBAI-PUNE', 'DELHI-MUMBAI'] },
];

export const INITIAL_LANES: Lane[] = [
  { id: 'L-1', name: 'DELHI-MUMBAI', origin: 'Delhi', destination: 'Mumbai' },
  { id: 'L-2', name: 'DELHI-JAIPUR', origin: 'Delhi', destination: 'Jaipur' },
  { id: 'L-3', name: 'BLR-CHN', origin: 'Bangalore', destination: 'Chennai' },
  { id: 'L-4', name: 'MUMBAI-PUNE', origin: 'Mumbai', destination: 'Pune' },
];

export const INITIAL_BIDS: ShipmentBid[] = [
  {
    id: 'bid-101',
    origin: 'Delhi',
    destination: 'Mumbai',
    lane: 'DELHI-MUMBAI',
    vehicleType: VehicleType.TRUCK,
    loadType: LoadType.FTL,
    capacity: '12 Tons',
    noOfPackages: 1,
    weightKg: 12000,
    requestDate: '2024-05-18',
    pickupDate: '2024-05-20',
    pickupLocation: 'Delhi',
    pickupCity: 'Delhi',
    deliveryDate: '2024-05-22',
    deliveryLocation: 'Mumbai',
    deliveryCity: 'Mumbai',
    reservedPrice: 40000,
    ceilingRate: 50000,
    stepValue: 500,
    bidStartDate: '2024-05-18',
    bidStartTime: '09:00',
    bidEndDate: '2024-05-21',
    bidEndTime: '18:00',
    showL1Value: true,
    materialType: 'Electronics',
    pickupTime: '2024-05-20T10:00',
    deliveryTimeline: '48 Hours',
    endTime: '2024-05-21T18:00',
    status: BidStatus.OPEN,
    offers: [
      { vendorId: 'v-1', vendorName: 'Blue Dart Logistics', amount: 45000, timestamp: '2024-05-18T10:30' },
      { vendorId: 'v-2', vendorName: 'Gati KWE', amount: 48000, timestamp: '2024-05-18T11:15' }
    ],
    createdAt: '2024-05-18T08:00'
  },
  {
    id: 'bid-102',
    origin: 'Delhi',
    destination: 'Jaipur',
    lane: 'DELHI-JAIPUR',
    vehicleType: VehicleType.LCV,
    loadType: LoadType.LTL,
    capacity: '2 Tons',
    noOfPackages: 3,
    weightKg: 2000,
    requestDate: '2024-05-18',
    pickupDate: '2024-05-19',
    pickupLocation: 'Delhi',
    pickupCity: 'Delhi',
    deliveryDate: '2024-05-20',
    deliveryLocation: 'Jaipur',
    deliveryCity: 'Jaipur',
    reservedPrice: 5000,
    ceilingRate: 8000,
    stepValue: 100,
    bidStartDate: '2024-05-18',
    bidStartTime: '09:00',
    bidEndDate: '2024-05-20',
    bidEndTime: '17:00',
    showL1Value: true,
    materialType: 'Spare Parts',
    pickupTime: '2024-05-19T08:00',
    deliveryTimeline: '12 Hours',
    endTime: '2024-05-20T17:00',
    status: BidStatus.OPEN,
    offers: [],
    createdAt: '2024-05-18T08:30'
  }
];
