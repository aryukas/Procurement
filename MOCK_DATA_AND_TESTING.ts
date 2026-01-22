// Mock Data & Testing Guide for Vendor Bidding Feature

import { SimpleShipment, VendorBid, VendorBidStatus, LaneMaster, LoadType, VehicleType, ShipmentStatus } from './types';

/**
 * MOCK LANES for Testing
 * Add these to your test database or use for local testing
 */
export const MOCK_LANES: LaneMaster[] = [
  {
    id: 'lane-1',
    code: 'DELHI-MUMBAI',
    origin: 'DELHI',
    destination: 'MUMBAI',
    isActive: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    createdBy: 'admin-1'
  },
  {
    id: 'lane-2',
    code: 'DELHI-BANGALORE',
    origin: 'DELHI',
    destination: 'BANGALORE',
    isActive: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    createdBy: 'admin-1'
  },
  {
    id: 'lane-3',
    code: 'MUMBAI-PUNE',
    origin: 'MUMBAI',
    destination: 'PUNE',
    isActive: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    createdBy: 'admin-1'
  },
  {
    id: 'lane-4',
    code: 'BANGALORE-CHENNAI',
    origin: 'BANGALORE',
    destination: 'CHENNAI',
    isActive: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    createdBy: 'admin-1'
  },
  {
    id: 'lane-5',
    code: 'KOLKATA-DELHI',
    origin: 'KOLKATA',
    destination: 'DELHI',
    isActive: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    createdBy: 'admin-1'
  }
];

/**
 * MOCK SHIPMENTS for Testing
 * Create variety of shipments on different lanes
 */
export const MOCK_SHIPMENTS: SimpleShipment[] = [
  // DELHI-MUMBAI shipments
  {
    id: 'shipment-1',
    origin: 'Delhi',
    destination: 'Mumbai',
    vehicleType: VehicleType.TRUCK,
    loadType: LoadType.FTL,
    capacity: '20 Tons',
    material: 'Electronics',
    pickupDate: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
    deliveryDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString(),
    status: ShipmentStatus.OPEN,
    createdAt: new Date().toISOString(),
    createdBy: 'admin-1'
  },
  {
    id: 'shipment-2',
    origin: 'Delhi',
    destination: 'Mumbai',
    vehicleType: VehicleType.CONTAINER,
    loadType: LoadType.FTL,
    capacity: '40 Tons',
    material: 'Textiles',
    pickupDate: new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString(),
    deliveryDate: new Date(Date.now() + 6 * 24 * 60 * 60 * 1000).toISOString(),
    status: ShipmentStatus.OPEN,
    createdAt: new Date().toISOString(),
    createdBy: 'admin-1'
  },

  // DELHI-BANGALORE shipments
  {
    id: 'shipment-3',
    origin: 'Delhi',
    destination: 'Bangalore',
    vehicleType: VehicleType.TRUCK,
    loadType: LoadType.LTL,
    capacity: '12 Tons',
    material: 'Automotive Parts',
    pickupDate: new Date(Date.now() + 36 * 60 * 60 * 1000).toISOString(),
    deliveryDate: new Date(Date.now() + 4 * 24 * 60 * 60 * 1000).toISOString(),
    status: ShipmentStatus.OPEN,
    createdAt: new Date().toISOString(),
    createdBy: 'admin-1'
  },

  // MUMBAI-PUNE shipments
  {
    id: 'shipment-4',
    origin: 'Mumbai',
    destination: 'Pune',
    vehicleType: VehicleType.LCV,
    loadType: LoadType.LTL,
    capacity: '5 Tons',
    material: 'Pharmaceuticals',
    pickupDate: new Date(Date.now() + 12 * 60 * 60 * 1000).toISOString(),
    deliveryDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString(),
    status: ShipmentStatus.OPEN,
    createdAt: new Date().toISOString(),
    createdBy: 'admin-1'
  },
  {
    id: 'shipment-5',
    origin: 'Mumbai',
    destination: 'Pune',
    vehicleType: VehicleType.TRUCK,
    loadType: LoadType.FTL,
    capacity: '18 Tons',
    material: 'FMCG',
    pickupDate: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
    deliveryDate: new Date(Date.now() + 1.5 * 24 * 60 * 60 * 1000).toISOString(),
    status: ShipmentStatus.OPEN,
    createdAt: new Date().toISOString(),
    createdBy: 'admin-1'
  },

  // BANGALORE-CHENNAI shipments
  {
    id: 'shipment-6',
    origin: 'Bangalore',
    destination: 'Chennai',
    vehicleType: VehicleType.TRAILER,
    loadType: LoadType.FTL,
    capacity: '30 Tons',
    material: 'Heavy Machinery',
    pickupDate: new Date(Date.now() + 72 * 60 * 60 * 1000).toISOString(),
    deliveryDate: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000).toISOString(),
    status: ShipmentStatus.OPEN,
    createdAt: new Date().toISOString(),
    createdBy: 'admin-1'
  },

  // KOLKATA-DELHI shipments
  {
    id: 'shipment-7',
    origin: 'Kolkata',
    destination: 'Delhi',
    vehicleType: VehicleType.CONTAINER,
    loadType: LoadType.FTL,
    capacity: '45 Tons',
    material: 'Steel Products',
    pickupDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString(),
    deliveryDate: new Date(Date.now() + 8 * 24 * 60 * 60 * 1000).toISOString(),
    status: ShipmentStatus.OPEN,
    createdAt: new Date().toISOString(),
    createdBy: 'admin-1'
  }
];

/**
 * MOCK VENDOR BIDS for Testing
 * Show various bid scenarios
 */
export const MOCK_VENDOR_BIDS: VendorBid[] = [
  // Approved bids
  {
    id: 'bid-1',
    shipmentId: 'shipment-1',
    vendorId: 'vendor-1',
    vendorName: 'Blue Dart Logistics',
    bidAmount: 45000,
    status: VendorBidStatus.APPROVED,
    createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 30 * 60 * 1000).toISOString()
  },

  // Pending bids
  {
    id: 'bid-2',
    shipmentId: 'shipment-3',
    vendorId: 'vendor-1',
    vendorName: 'Blue Dart Logistics',
    bidAmount: 28000,
    status: VendorBidStatus.PENDING,
    createdAt: new Date(Date.now() - 60 * 60 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 60 * 60 * 1000).toISOString()
  },

  // Rejected bids
  {
    id: 'bid-3',
    shipmentId: 'shipment-4',
    vendorId: 'vendor-1',
    vendorName: 'Blue Dart Logistics',
    bidAmount: 8000,
    status: VendorBidStatus.REJECTED,
    createdAt: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString()
  },

  // More bids from other vendors
  {
    id: 'bid-4',
    shipmentId: 'shipment-2',
    vendorId: 'vendor-2',
    vendorName: 'Gati KWE',
    bidAmount: 65000,
    status: VendorBidStatus.PENDING,
    createdAt: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 30 * 60 * 1000).toISOString()
  },

  {
    id: 'bid-5',
    shipmentId: 'shipment-2',
    vendorId: 'vendor-1',
    vendorName: 'Blue Dart Logistics',
    bidAmount: 62000,
    status: VendorBidStatus.APPROVED,
    createdAt: new Date(Date.now() - 20 * 60 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 10 * 60 * 1000).toISOString()
  }
];

/**
 * Test Scenarios
 */

export const TEST_SCENARIOS = {
  /**
   * Scenario 1: New vendor viewing available opportunities
   * - No bids placed yet
   * - All shipments show as OPEN
   * - Can select lanes and see all shipments
   */
  newVendor: {
    description: 'New vendor with no bidding history',
    setupSteps: [
      'Clear all existing bids for test vendor',
      'Ensure all MOCK_SHIPMENTS are created',
      'Create new vendor user',
      'Login as new vendor'
    ],
    expectedBehavior: [
      'Lane filter shows all MOCK_LANES',
      'No shipments shown until lanes selected',
      'After lane selection, relevant shipments appear',
      'All shipments show bid input field',
      'No "Bid Placed" badges visible'
    ]
  },

  /**
   * Scenario 2: Vendor with mixed bid status
   * - Some approved, some pending, some rejected
   * - Tests status display and filtering
   */
  mixedBidStatus: {
    description: 'Vendor with various bid statuses',
    setupSteps: [
      'Create MOCK_VENDOR_BIDS with vendor-1',
      'Mix of APPROVED, PENDING, REJECTED statuses',
      'Ensure shipments exist for each bid'
    ],
    expectedBehavior: [
      'Lane Performance shows pending and approved counts',
      'Success rate calculates correctly',
      'Cards highlight bid status appropriately',
      'Can see all bid history'
    ]
  },

  /**
   * Scenario 3: Multiple lanes with varying opportunities
   * - Tests filtering and multi-select
   */
  multiLaneFiltering: {
    description: 'Filter and view multiple lanes',
    setupSteps: [
      'Create shipments on at least 3 different lanes',
      'Some lanes with many shipments, some with few'
    ],
    testSteps: [
      'Select first lane - verify shipments shown',
      'Deselect first lane - shipments disappear',
      'Select multiple lanes - verify union of shipments',
      'Clear all selections - verify all shipments shown',
      'Verify lane code badges on each shipment'
    ]
  },

  /**
   * Scenario 4: Bid placement with validation
   * - Tests all validation rules
   */
  bidValidation: {
    description: 'Bid placement validation',
    testSteps: [
      'Try to bid without entering amount - should show error',
      'Enter zero amount - should show error',
      'Enter negative amount - should show error',
      'Enter valid amount and submit - should succeed',
      'Try to bid again on same shipment - should show error',
      'Verify bid appears in real-time list'
    ]
  },

  /**
   * Scenario 5: Real-time updates
   * - Tests Firebase listeners and updates
   */
  realtimeUpdates: {
    description: 'Real-time bid and shipment updates',
    testSteps: [
      'Open bidding panel in two browser windows',
      'Place bid in window 1',
      'Verify bid appears in window 2 (no refresh needed)',
      'Update shipment status in Firebase',
      'Verify status updates in real-time'
    ]
  }
};

/**
 * Firebase Console Queries for Testing
 */

export const FIREBASE_QUERIES = {
  // Get all open shipments
  shipments: `
    // Realtime Database
    Shipments → Filter: status == "OPEN"
  `,

  // Get all bids for a shipment
  shipmentBids: `
    // Realtime Database
    Bids → Filter: shipmentId == "{shipmentId}"
  `,

  // Get all bids by vendor
  vendorBids: `
    // Realtime Database
    Bids → Filter: vendorId == "{vendorId}"
  `,

  // Get all active lanes
  activeLanes: `
    // Firestore
    lanes → Filter: isActive == true
  `
};

/**
 * Manual Testing Checklist
 */

export const TESTING_CHECKLIST = [
  // UI/UX Tests
  '[ ] Lane filter checkboxes render correctly',
  '[ ] Lane codes display properly',
  '[ ] Selected lane count updates',
  '[ ] Clear button works',
  '[ ] Shipment cards display all information',
  '[ ] Bid input field accepts numbers only',
  '[ ] Submit button enables/disables correctly',
  '[ ] Details panel is sticky when scrolling',
  '[ ] Feedback toasts appear and disappear',

  // Functionality Tests
  '[ ] Bid amount validation works',
  '[ ] Bid placement succeeds',
  '[ ] Bid appears in real-time',
  '[ ] Duplicate bid prevention works',
  '[ ] Lane filtering works correctly',
  '[ ] Shipment count matches selected lanes',
  '[ ] Lane stats calculate correctly',
  '[ ] Success rate is accurate',

  // Data Tests
  '[ ] All lanes load from Firestore',
  '[ ] All shipments load from Realtime DB',
  '[ ] Vendor bids load correctly',
  '[ ] Shipment-lane matching is accurate',
  '[ ] Timestamps are formatted correctly',

  // Performance Tests
  '[ ] No console errors or warnings',
  '[ ] Page loads within 2 seconds',
  '[ ] Filtering is instant',
  '[ ] No memory leaks on unmount',
  '[ ] Real-time updates are smooth',

  // Responsive Tests
  '[ ] Mobile layout is usable',
  '[ ] Tablet layout displays correctly',
  '[ ] Desktop layout is polished',
  '[ ] Sticky panel works on all sizes',

  // Error Handling Tests
  '[ ] Invalid bid amount shows error',
  '[ ] Duplicate bid shows error',
  '[ ] Network errors handled gracefully',
  '[ ] Firebase errors show user-friendly messages'
];
