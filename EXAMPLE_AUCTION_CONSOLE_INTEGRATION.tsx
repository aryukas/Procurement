// EXAMPLE_AUCTION_CONSOLE_INTEGRATION.tsx
import React, { useState, useEffect } from 'react';
import VendorAuctionMonitor from './src/components/auction/VendorAuctionMonitor';
import AdminAuctionConsole from './src/components/admin/AdminAuctionConsole';
import { User, UserRole, VehicleType, LoadType, ShipmentStatus } from './types';

/**
 * Example: How to integrate VendorAuctionMonitor into your app
 */

// Example 1: Vendor View
export const VendorAuctionPage: React.FC = () => {
  // In real app, get from auth/context
  const vendorUser: User = {
    id: 'vendor-123',
    name: 'ABC Logistics Pvt Ltd',
    role: UserRole.VENDOR,
    lanes: ['lane-delhi-mumbai', 'lane-delhi-bangalore', 'lane-mumbai-pune']
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <VendorAuctionMonitor currentUser={vendorUser} />
    </div>
  );
};

// Example 2: Admin View
export const AdminAuctionPage: React.FC = () => {
  const adminUser: User = {
    id: 'admin-123',
    name: 'Admin User',
    role: UserRole.ADMIN
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <AdminAuctionConsole currentUser={adminUser} />
    </div>
  );
};

// Example 3: Simple App with User Selection (without routing)
export const AuctionApp: React.FC = () => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);

  // Simulate login
  const handleVendorLogin = () => {
    setCurrentUser({
      id: 'vendor-456',
      name: 'XYZ Transport',
      role: UserRole.VENDOR,
      lanes: ['lane-delhi-mumbai']
    });
  };

  const handleAdminLogin = () => {
    setCurrentUser({
      id: 'admin-456',
      name: 'Admin',
      role: UserRole.ADMIN
    });
  };

  const handleLogout = () => {
    setCurrentUser(null);
  };

  if (!currentUser) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-600 to-blue-800 flex items-center justify-center">
        <div className="bg-white rounded-2xl p-8 shadow-2xl max-w-md w-full space-y-6">
          <h1 className="text-3xl font-bold text-slate-900 text-center">Auction Console</h1>
          
          <button
            onClick={handleVendorLogin}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-lg transition-colors"
          >
            Login as Vendor
          </button>
          
          <button
            onClick={handleAdminLogin}
            className="w-full bg-slate-600 hover:bg-slate-700 text-white font-bold py-3 rounded-lg transition-colors"
          >
            Login as Admin
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <div className="bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-900">Procurement Auction System</h1>
        <div className="flex items-center space-x-4">
          <span className="text-slate-600">
            {currentUser.role === UserRole.VENDOR ? '🚚' : '👨‍💼'} {currentUser.name}
          </span>
          <button
            onClick={handleLogout}
            className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white font-bold rounded-lg transition-colors"
          >
            Logout
          </button>
        </div>
      </div>

      {/* Content */}
      {currentUser.role === UserRole.VENDOR ? (
        <VendorAuctionMonitor currentUser={currentUser} />
      ) : (
        <AdminAuctionConsole currentUser={currentUser} />
      )}
    </div>
  );
};

// Example 4: Test Data Setup with Correct Types
export const setupTestData = async () => {
  const { BiddingService } = await import('./src/services/biddingService');
  
  // Create test shipments with correct enum types
  const shipments = [
    {
      origin: 'Delhi',
      destination: 'Mumbai',
      vehicleType: VehicleType.TRUCK,
      loadType: LoadType.FTL,
      capacity: '20 MT',
      material: 'Electronics',
      pickupDate: new Date().toISOString(),
      deliveryDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(),
      status: 'OPEN' as ShipmentStatus,
      createdBy: 'admin@company.com'
    },
    {
      origin: 'Delhi',
      destination: 'Bangalore',
      vehicleType: VehicleType.CONTAINER,
      loadType: LoadType.FTL,
      capacity: '30 MT',
      material: 'Machinery',
      pickupDate: new Date().toISOString(),
      deliveryDate: new Date(Date.now() + 4 * 24 * 60 * 60 * 1000).toISOString(),
      status: 'OPEN' as ShipmentStatus,
      createdBy: 'admin@company.com'
    },
    {
      origin: 'Mumbai',
      destination: 'Pune',
      vehicleType: VehicleType.TRUCK,
      loadType: LoadType.LTL,
      capacity: '10 MT',
      material: 'Textiles',
      pickupDate: new Date().toISOString(),
      deliveryDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString(),
      status: 'OPEN' as ShipmentStatus,
      createdBy: 'admin@company.com'
    }
  ];

  for (const shipment of shipments) {
    try {
      const result = await BiddingService.createShipment(shipment);
      console.log('✅ Shipment created:', result.id);
    } catch (error) {
      console.error('❌ Error creating shipment:', error);
    }
  }
};

// Example 5: Component Usage in Existing App
export const IntegrationExample: React.FC = () => {
  const vendorUser: User = {
    id: 'vendor-789',
    name: 'Fast Logistics',
    role: UserRole.VENDOR,
    lanes: ['lane-delhi-mumbai', 'lane-delhi-bangalore']
  };

  return (
    <div className="w-full">
      {/* Your existing header/navigation */}
      <header className="bg-slate-900 text-white p-4 shadow-lg">
        <h1>Procurement System</h1>
      </header>

      {/* Auction Monitor Component */}
      <main>
        <VendorAuctionMonitor currentUser={vendorUser} />
      </main>

      {/* Your existing footer */}
      <footer className="bg-slate-100 p-4 mt-8 border-t">
        <p className="text-slate-600">© 2026 Your Company</p>
      </footer>
    </div>
  );
};

// Example 6: Mock User Data for Different Vendors
export const VENDOR_EXAMPLES = {
  vendor1: {
    id: 'vendor-001',
    name: 'ABC Logistics',
    role: UserRole.VENDOR,
    lanes: ['lane-delhi-mumbai', 'lane-mumbai-pune']
  } as User,

  vendor2: {
    id: 'vendor-002',
    name: 'XYZ Transport',
    role: UserRole.VENDOR,
    lanes: ['lane-delhi-bangalore', 'lane-bangalore-cochin']
  } as User,

  vendor3: {
    id: 'vendor-003',
    name: 'Speedy Couriers',
    role: UserRole.VENDOR,
    lanes: ['lane-delhi-mumbai']
  } as User,

  admin: {
    id: 'admin-001',
    name: 'Admin User',
    role: UserRole.ADMIN
  } as User
};

// Example 7: Test Bid Placement with Correct Types
export const testBidPlacement = async () => {
  const { BiddingService } = await import('./src/services/biddingService');

  // Get all open shipments
  const shipments = await BiddingService.getOpenShipments();
  
  if (shipments.length > 0) {
    const shipment = shipments[0];
    
    // Place a bid
    try {
      const result = await BiddingService.placeBid({
        shipmentId: shipment.id,
        vendorId: 'vendor-001',
        vendorName: 'ABC Logistics',
        bidAmount: 50000
      });
      
      if (result.success) {
        console.log('✅ Bid placed successfully:', result);
      } else {
        console.error('❌ Bid placement failed:', result.error);
      }
    } catch (error) {
      console.error('❌ Error placing bid:', error);
    }
  }
};

/**
 * Quick Start Checklist
 * 
 * 1. Import VendorAuctionMonitor
 *    import VendorAuctionMonitor from './src/components/auction/VendorAuctionMonitor';
 * 
 * 2. Create vendor user object with lanes array
 *    const vendor = { id: '...', name: '...', lanes: ['lane-1', 'lane-2'] }
 * 
 * 3. Render component
 *    <VendorAuctionMonitor currentUser={vendor} />
 * 
 * 4. Create test shipments via admin console
 *    - Go to Admin > Auctions
 *    - Click "Create Shipment"
 *    - Fill in details and save
 * 
 * 5. Test bid placement
 *    - Log in as vendor
 *    - Go to Live Auctions
 *    - Select shipment and place bid
 * 
 * 6. Monitor in real-time
 *    - All changes update instantly via Firebase
 *    - Multiple vendors see same bid data
 */
