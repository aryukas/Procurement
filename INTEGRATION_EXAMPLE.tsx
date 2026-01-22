// INTEGRATION EXAMPLE: How to use the new Vendor Bidding Features
// Add this to your VendorDashboard or create new routes for these components

import React, { useState } from 'react';
import VendorBiddingPanel from './src/components/bidding/VendorBiddingPanel';
import VendorLaneConsole from './src/components/bidding/VendorLaneConsole';
import type { User } from './types';

interface BiddingIntegrationProps {
  currentUser: User;
}

/**
 * Example 1: Add Bidding Panel as a Tab
 */
export const VendorDashboardWithBidding: React.FC<BiddingIntegrationProps> = ({ currentUser }) => {
  const [activeTab, setActiveTab] = useState<'OVERVIEW' | 'BIDDING' | 'LANES'>('OVERVIEW');

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      {/* Tab Navigation */}
      <div className="flex space-x-4 border-b mb-8">
        <button
          onClick={() => setActiveTab('OVERVIEW')}
          className={`px-4 py-2 font-semibold ${
            activeTab === 'OVERVIEW'
              ? 'border-b-2 border-blue-600 text-blue-600'
              : 'text-slate-600'
          }`}
        >
          Dashboard
        </button>
        <button
          onClick={() => setActiveTab('BIDDING')}
          className={`px-4 py-2 font-semibold ${
            activeTab === 'BIDDING'
              ? 'border-b-2 border-blue-600 text-blue-600'
              : 'text-slate-600'
          }`}
        >
          Place Bids
        </button>
        <button
          onClick={() => setActiveTab('LANES')}
          className={`px-4 py-2 font-semibold ${
            activeTab === 'LANES'
              ? 'border-b-2 border-blue-600 text-blue-600'
              : 'text-slate-600'
          }`}
        >
          Lane Performance
        </button>
      </div>

      {/* Tab Content */}
      <div>
        {activeTab === 'OVERVIEW' && (
          <div>
            {/* Your existing dashboard content */}
            <p>Existing dashboard overview here</p>
          </div>
        )}

        {activeTab === 'BIDDING' && (
          <VendorBiddingPanel
            currentUser={currentUser}
            onBidPlaced={() => {
              console.log('Bid placed successfully');
              // Refresh data or show notification
            }}
          />
        )}

        {activeTab === 'LANES' && (
          <VendorLaneConsole currentUser={currentUser} />
        )}
      </div>
    </div>
  );
};

/**
 * Example 2: Add as Full-Page Component
 */
export const BiddingPage: React.FC<BiddingIntegrationProps> = ({ currentUser }) => {
  return (
    <>
      {/* Bidding Panel */}
      <section className="mb-12">
        <VendorBiddingPanel
          currentUser={currentUser}
          onBidPlaced={() => console.log('Bid placed')}
        />
      </section>

      {/* Lane Console */}
      <section>
        <VendorLaneConsole currentUser={currentUser} />
      </section>
    </>
  );
};

/**
 * Example 3: Integration with Route
 * In your main App.tsx or Router configuration:
 */
/*
import { BiddingPage } from './pages/BiddingPage';

// Add to your routing:
<Route path="/vendor/bidding" element={<BiddingPage currentUser={currentUser} />} />
<Route path="/vendor/lanes" element={<VendorLaneConsole currentUser={currentUser} />} />
*/

/**
 * Example 4: Import in VendorDashboard
 */
/*
import VendorBiddingPanel from '../src/components/bidding/VendorBiddingPanel';
import VendorLaneConsole from '../src/components/bidding/VendorLaneConsole';

// In your dashboard component:
<div className="mt-12">
  <h2 className="text-2xl font-bold mb-6">Available Shipments to Bid On</h2>
  <VendorBiddingPanel 
    currentUser={currentUser}
    onBidPlaced={() => {
      // Refresh notifications or show toast
    }}
  />
</div>

<div className="mt-12">
  <h2 className="text-2xl font-bold mb-6">Your Bidding Performance</h2>
  <VendorLaneConsole currentUser={currentUser} />
</div>
*/

/**
 * Example 5: With Navigation Links
 */
export const VendorBiddingNav: React.FC = () => {
  return (
    <div className="bg-white border border-slate-200 rounded-lg p-6">
      <h3 className="text-lg font-bold mb-4">Bidding Menu</h3>
      <nav className="space-y-2">
        <a
          href="/vendor/bidding"
          className="block px-4 py-2 text-blue-600 hover:bg-blue-50 rounded"
        >
          → Place Bids on Shipments
        </a>
        <a
          href="/vendor/lanes"
          className="block px-4 py-2 text-blue-600 hover:bg-blue-50 rounded"
        >
          → View Lane Performance
        </a>
        <a
          href="/vendor/my-bids"
          className="block px-4 py-2 text-blue-600 hover:bg-blue-50 rounded"
        >
          → My Bids & Status
        </a>
      </nav>
    </div>
  );
};

/**
 * Key Points for Integration:
 * 
 * 1. COMPONENT PROPS:
 *    - VendorBiddingPanel requires: currentUser, optional onBidPlaced callback
 *    - VendorLaneConsole requires: currentUser
 * 
 * 2. DATA REQUIREMENTS:
 *    - currentUser must have id and name
 *    - Lanes must exist in Firestore with isActive = true
 *    - Shipments must exist in Realtime Database with status = 'OPEN'
 * 
 * 3. FIREBASE SETUP:
 *    - Ensure Firebase is initialized
 *    - Database and Firestore access configured
 *    - BiddingService and LaneService imported
 * 
 * 4. REAL-TIME UPDATES:
 *    - Components use onSnapshot/onValue listeners
 *    - Auto-subscribe on mount, auto-unsubscribe on unmount
 *    - Data updates automatically across all instances
 * 
 * 5. STYLING:
 *    - Uses Tailwind CSS classes
 *    - Icons from lucide-react
 *    - Responsive design (mobile, tablet, desktop)
 * 
 * 6. ERROR HANDLING:
 *    - Bid validation included
 *    - User data validation
 *    - Firebase error handling
 *    - User-friendly error messages
 */
