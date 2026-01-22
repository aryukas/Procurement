// src/components/auction/VendorAuctionMonitor.tsx
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Clock,
  MapPin,
  Truck,
  TrendingDown,
  AlertCircle,
  CheckCircle2,
  Loader,
  Filter,
  Activity,
  Users,
  IndianRupee,
  Send
} from 'lucide-react';
import type { User, SimpleShipment, VendorBid } from '../../../types';
import { BiddingService } from '../../services/biddingService';
import { LaneService } from '../../services/laneService';

interface VendorAuctionMonitorProps {
  currentUser: User;
}

interface ShipmentWithBidsInfo extends SimpleShipment {
  bids: VendorBid[];
  lowestBid: VendorBid | null;
  highestBid: VendorBid | null;
  vendorBid: VendorBid | null;
}

type FilterStatus = 'OPEN' | 'PENDING_ADMIN_APPROVAL' | 'FINALIZED' | 'ALL';

const VendorAuctionMonitor: React.FC<VendorAuctionMonitorProps> = ({ currentUser }) => {
  const [shipments, setShipments] = useState<SimpleShipment[]>([]);
  const [bidsByShipment, setBidsByShipment] = useState<Record<string, VendorBid[]>>({});
  const [lanes, setLanes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState<FilterStatus>('OPEN');
  const [selectedShipmentId, setSelectedShipmentId] = useState<string | null>(null);
  const [bidAmount, setBidAmount] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Load shipments
  useEffect(() => {
    setLoading(true);
    const unsubscribe = BiddingService.listenToShipments((data) => {
      setShipments(data);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  // Load lanes
  useEffect(() => {
    const unsubscribe = LaneService.listenToActiveLanes((data) => {
      setLanes(data);
    });
    return () => unsubscribe?.();
  }, []);

  // Load bids for each shipment
  useEffect(() => {
    const unsubscribers: (() => void)[] = [];

    shipments.forEach(shipment => {
      const unsubscribe = BiddingService.listenToBidsForShipment(shipment.id, (bids) => {
        setBidsByShipment(prev => ({
          ...prev,
          [shipment.id]: bids
        }));
      });
      unsubscribers.push(unsubscribe);
    });

    return () => unsubscribers.forEach(u => u?.());
  }, [shipments]);

  // Auto-dismiss feedback
  useEffect(() => {
    if (feedback) {
      const timer = setTimeout(() => setFeedback(null), 4000);
      return () => clearTimeout(timer);
    }
  }, [feedback]);

  // Filter shipments based on status and vendor lanes
  const filteredShipments = useMemo<ShipmentWithBidsInfo[]>(() => {
    let result = shipments;

    // Filter by status
    if (filterStatus !== 'ALL') {
      result = result.filter(s => s.status === filterStatus);
    } else {
      // For ALL, show OPEN and PENDING_ADMIN_APPROVAL
      result = result.filter(s => s.status === 'OPEN' || s.status === 'PENDING_ADMIN_APPROVAL');
    }

    // Filter by vendor's assigned lanes (if any)
    if (currentUser?.lanes && currentUser.lanes.length > 0) {
      result = result.filter(s => {
        const lane = lanes.find(l =>
          l.origin.toLowerCase() === s.origin.toLowerCase() &&
          l.destination.toLowerCase() === s.destination.toLowerCase()
        );
        return lane && currentUser.lanes!.includes(lane.id);
      });
    }

    // Add bid info
    return result.map(shipment => {
      const bids = bidsByShipment[shipment.id] || [];
      const sorted = [...bids].sort((a, b) => a.bidAmount - b.bidAmount);
      
      return {
        ...shipment,
        bids,
        lowestBid: sorted[0] || null,
        highestBid: sorted[sorted.length - 1] || null,
        vendorBid: bids.find(b => b.vendorId === currentUser.id) || null
      };
    }).sort((a, b) => {
      // Show OPEN first, then PENDING_ADMIN_APPROVAL
      if (a.status === 'OPEN' && b.status !== 'OPEN') return -1;
      if (a.status !== 'OPEN' && b.status === 'OPEN') return 1;
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });
  }, [shipments, bidsByShipment, filterStatus, currentUser?.lanes, lanes]);

  const selectedShipment = useMemo(() => {
    return filteredShipments.find(s => s.id === selectedShipmentId) || filteredShipments[0] || null;
  }, [filteredShipments, selectedShipmentId]);

  // Get lane name for shipment
  const getLaneInfo = useCallback((shipment: SimpleShipment) => {
    const lane = lanes.find(l =>
      l.origin.toLowerCase() === shipment.origin.toLowerCase() &&
      l.destination.toLowerCase() === shipment.destination.toLowerCase()
    );
    return lane?.code || `${shipment.origin} → ${shipment.destination}`;
  }, [lanes]);

  // Handle bid placement
  const handlePlaceBid = useCallback(async () => {
    if (!selectedShipment || !bidAmount.trim()) {
      setFeedback({ type: 'error', text: 'Please enter a bid amount' });
      return;
    }

    const amount = parseInt(bidAmount, 10);
    if (isNaN(amount) || amount <= 0) {
      setFeedback({ type: 'error', text: 'Bid must be a positive number' });
      return;
    }

    setSubmitting(true);
    try {
      const result = await BiddingService.placeBid({
        shipmentId: selectedShipment.id,
        vendorId: currentUser.id,
        vendorName: currentUser.name,
        bidAmount: amount
      });

      if (result.success) {
        setFeedback({ type: 'success', text: `✅ Bid placed! ₹${amount.toLocaleString('en-IN')}` });
        setBidAmount('');
      } else {
        setFeedback({ type: 'error', text: result.error?.message || 'Failed to place bid' });
      }
    } catch (error) {
      console.error('Error placing bid:', error);
      setFeedback({ type: 'error', text: 'An error occurred while placing the bid' });
    } finally {
      setSubmitting(false);
    }
  }, [selectedShipment, bidAmount, currentUser.id, currentUser.name]);

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-8 flex items-center justify-center min-h-96">
        <div className="text-center">
          <Loader className="w-12 h-12 animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-slate-600 font-medium">Loading auctions...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-4xl font-bold text-slate-900 mb-2 flex items-center space-x-3">
          <Activity className="w-10 h-10 text-blue-600" />
          <span>Live Auction Monitor</span>
        </h1>
        <p className="text-slate-600 text-lg">Monitor live negotiations and bid on available shipments</p>
      </div>

      {/* Feedback Toast */}
      {feedback && (
        <div className={`mb-6 p-4 rounded-xl text-sm font-medium flex items-center space-x-3 border ${
          feedback.type === 'success'
            ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
            : 'bg-red-50 border-red-200 text-red-700'
        }`}>
          {feedback.type === 'success' ? (
            <CheckCircle2 className="w-5 h-5 flex-shrink-0" />
          ) : (
            <AlertCircle className="w-5 h-5 flex-shrink-0" />
          )}
          <span>{feedback.text}</span>
        </div>
      )}

      {/* Filter Buttons */}
      <div className="mb-8 flex gap-3 flex-wrap">
        {(['OPEN', 'PENDING_ADMIN_APPROVAL', 'ALL'] as const).map(status => (
          <button
            key={status}
            onClick={() => {
              setFilterStatus(status);
              setSelectedShipmentId(null);
            }}
            className={`px-6 py-2 rounded-xl font-bold text-sm transition-all ${
              filterStatus === status
                ? 'bg-blue-600 text-white shadow-lg'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            <div className="flex items-center space-x-2">
              <Filter className="w-4 h-4" />
              <span>{status === 'PENDING_ADMIN_APPROVAL' ? 'Pending Approval' : status}</span>
            </div>
          </button>
        ))}
      </div>

      {filteredShipments.length === 0 ? (
        <div className="bg-gradient-to-br from-slate-50 to-slate-100 border-2 border-dashed border-slate-300 rounded-2xl p-16 text-center">
          <AlertCircle className="w-16 h-16 text-slate-400 mx-auto mb-4" />
          <h3 className="text-2xl font-bold text-slate-800 mb-2">No Active Shipments</h3>
          <p className="text-slate-600 text-lg">
            {currentUser?.lanes && currentUser.lanes.length > 0
              ? 'No shipments available on your assigned lanes right now'
              : 'No open shipments available for bidding'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Shipments List */}
          <div className="lg:col-span-1">
            <div className="sticky top-8">
              <h2 className="text-xl font-bold text-slate-900 mb-4 flex items-center space-x-2">
                <Truck className="w-5 h-5 text-blue-600" />
                <span>Available Shipments ({filteredShipments.length})</span>
              </h2>
              <div className="space-y-3 max-h-[600px] overflow-y-auto">
                {filteredShipments.map(shipment => (
                  <button
                    key={shipment.id}
                    onClick={() => setSelectedShipmentId(shipment.id)}
                    className={`w-full p-4 rounded-xl border-2 transition-all text-left ${
                      selectedShipment?.id === shipment.id
                        ? 'border-blue-600 bg-blue-50'
                        : 'border-slate-200 bg-white hover:border-blue-300 hover:shadow-md'
                    }`}
                  >
                    {/* Route */}
                    <div className="flex items-center space-x-2 mb-2">
                      <MapPin className="w-4 h-4 text-blue-600 flex-shrink-0" />
                      <p className="font-bold text-slate-900 truncate">{getLaneInfo(shipment)}</p>
                    </div>

                    {/* Status Badge */}
                    <div className="flex items-center space-x-2 mb-3">
                      <span className={`text-xs font-bold px-2 py-1 rounded-full ${
                        shipment.status === 'OPEN'
                          ? 'bg-green-100 text-green-700'
                          : 'bg-yellow-100 text-yellow-700'
                      }`}>
                        {shipment.status === 'OPEN' ? 'Open' : 'Pending'}
                      </span>
                      {shipment.vendorBid && (
                        <span className="text-xs font-bold px-2 py-1 rounded-full bg-blue-100 text-blue-700">
                          Your bid: ₹{shipment.vendorBid.bidAmount.toLocaleString('en-IN')}
                        </span>
                      )}
                    </div>

                    {/* Stats */}
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div className="bg-slate-50 rounded p-2">
                        <p className="text-slate-500 font-bold">Lowest</p>
                        <p className="text-blue-600 font-bold">
                          {shipment.lowestBid
                            ? `₹${shipment.lowestBid.bidAmount.toLocaleString('en-IN')}`
                            : 'N/A'}
                        </p>
                      </div>
                      <div className="bg-slate-50 rounded p-2">
                        <p className="text-slate-500 font-bold">Bids</p>
                        <p className="text-slate-900 font-bold">{shipment.bids.length}</p>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Shipment Details & Bidding */}
          <div className="lg:col-span-2">
            {selectedShipment ? (
              <div className="bg-white rounded-2xl border border-slate-200 shadow-lg overflow-hidden">
                {/* Header with gradient */}
                <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-6 py-8 text-white">
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <h2 className="text-3xl font-bold mb-2 flex items-center space-x-2">
                        <MapPin className="w-7 h-7" />
                        <span>{getLaneInfo(selectedShipment)}</span>
                      </h2>
                      <p className="text-blue-100 text-sm">
                        Created: {new Date(selectedShipment.createdAt).toLocaleDateString('en-IN')}
                      </p>
                    </div>
                    <span className={`text-sm font-bold px-4 py-2 rounded-full ${
                      selectedShipment.status === 'OPEN'
                        ? 'bg-green-500 text-white'
                        : 'bg-yellow-500 text-white'
                    }`}>
                      {selectedShipment.status === 'OPEN' ? '🟢 Open' : '🟡 Pending'}
                    </span>
                  </div>
                </div>

                {/* Content */}
                <div className="p-6 space-y-6">
                  {/* Shipment Details */}
                  <div>
                    <h3 className="text-lg font-bold text-slate-900 mb-4 flex items-center space-x-2">
                      <Truck className="w-5 h-5 text-blue-600" />
                      <span>Shipment Details</span>
                    </h3>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="bg-slate-50 rounded-lg p-4">
                        <p className="text-xs font-bold text-slate-500 uppercase mb-1">Vehicle Type</p>
                        <p className="text-lg font-bold text-slate-900">{selectedShipment.vehicleType}</p>
                      </div>
                      <div className="bg-slate-50 rounded-lg p-4">
                        <p className="text-xs font-bold text-slate-500 uppercase mb-1">Capacity</p>
                        <p className="text-lg font-bold text-slate-900">{selectedShipment.capacity}</p>
                      </div>
                      <div className="bg-slate-50 rounded-lg p-4">
                        <p className="text-xs font-bold text-slate-500 uppercase mb-1">Material</p>
                        <p className="text-lg font-bold text-slate-900">{selectedShipment.material}</p>
                      </div>
                      <div className="bg-slate-50 rounded-lg p-4">
                        <p className="text-xs font-bold text-slate-500 uppercase mb-1">Load Type</p>
                        <p className="text-lg font-bold text-slate-900">{selectedShipment.loadType}</p>
                      </div>
                      <div className="bg-slate-50 rounded-lg p-4">
                        <p className="text-xs font-bold text-slate-500 uppercase mb-1">Pickup Date</p>
                        <p className="text-lg font-bold text-slate-900">
                          {new Date(selectedShipment.pickupDate).toLocaleDateString('en-IN')}
                        </p>
                      </div>
                      <div className="bg-slate-50 rounded-lg p-4">
                        <p className="text-xs font-bold text-slate-500 uppercase mb-1">Delivery Date</p>
                        <p className="text-lg font-bold text-slate-900">
                          {new Date(selectedShipment.deliveryDate).toLocaleDateString('en-IN')}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Auction Stats */}
                  <div>
                    <h3 className="text-lg font-bold text-slate-900 mb-4 flex items-center space-x-2">
                      <Activity className="w-5 h-5 text-blue-600" />
                      <span>Auction Status</span>
                    </h3>
                    <div className="grid grid-cols-3 gap-4">
                      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                        <p className="text-xs font-bold text-blue-600 uppercase mb-2">Lowest Bid</p>
                        <p className="text-2xl font-bold text-blue-600">
                          {selectedShipment.lowestBid
                            ? `₹${selectedShipment.lowestBid.bidAmount.toLocaleString('en-IN')}`
                            : 'N/A'}
                        </p>
                        {selectedShipment.lowestBid && (
                          <p className="text-xs text-blue-600 mt-1">
                            by {selectedShipment.lowestBid.vendorName}
                          </p>
                        )}
                      </div>
                      <div className="bg-slate-50 border border-slate-200 rounded-lg p-4">
                        <p className="text-xs font-bold text-slate-600 uppercase mb-2">Total Bids</p>
                        <p className="text-2xl font-bold text-slate-900">{selectedShipment.bids.length}</p>
                      </div>
                      <div className="bg-slate-50 border border-slate-200 rounded-lg p-4">
                        <p className="text-xs font-bold text-slate-600 uppercase mb-2">Highest Bid</p>
                        <p className="text-2xl font-bold text-slate-900">
                          {selectedShipment.highestBid
                            ? `₹${selectedShipment.highestBid.bidAmount.toLocaleString('en-IN')}`
                            : 'N/A'}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Your Bid Status */}
                  {selectedShipment.vendorBid && (
                    <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                      <div className="flex items-center space-x-2 mb-2">
                        <CheckCircle2 className="w-5 h-5 text-green-600" />
                        <p className="font-bold text-green-900">Your Bid Placed</p>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <p className="text-xs text-green-700">Amount</p>
                          <p className="text-2xl font-bold text-green-600">
                            ₹{selectedShipment.vendorBid.bidAmount.toLocaleString('en-IN')}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-green-700">Status</p>
                          <p className="text-lg font-bold text-green-600">
                            {selectedShipment.vendorBid.status}
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Bid Placement */}
                  {selectedShipment.status === 'OPEN' && (
                    <div className="border-t border-slate-200 pt-6">
                      <h3 className="text-lg font-bold text-slate-900 mb-4 flex items-center space-x-2">
                        <Send className="w-5 h-5 text-blue-600" />
                        <span>Place Your Bid</span>
                      </h3>
                      <div className="space-y-4">
                        <div>
                          <label className="block text-sm font-bold text-slate-700 mb-2">
                            Bid Amount (₹)
                          </label>
                          <input
                            type="number"
                            value={bidAmount}
                            onChange={(e) => setBidAmount(e.target.value)}
                            placeholder="Enter your bid amount"
                            className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-lg"
                          />
                          {selectedShipment.lowestBid && (
                            <p className="text-xs text-slate-600 mt-2 flex items-center space-x-1">
                              <TrendingDown className="w-3 h-3" />
                              <span>Current lowest: ₹{selectedShipment.lowestBid.bidAmount.toLocaleString('en-IN')}</span>
                            </p>
                          )}
                        </div>
                        <button
                          onClick={handlePlaceBid}
                          disabled={submitting}
                          className={`w-full py-3 rounded-lg font-bold text-lg flex items-center justify-center space-x-2 transition-all ${
                            submitting
                              ? 'bg-slate-300 text-slate-500 cursor-not-allowed'
                              : 'bg-blue-600 hover:bg-blue-700 text-white shadow-lg hover:shadow-xl'
                          }`}
                        >
                          {submitting && <Loader className="w-5 h-5 animate-spin" />}
                          <TrendingDown className="w-5 h-5" />
                          <span>{submitting ? 'Placing Bid...' : 'Place Bid'}</span>
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Recent Bids */}
                  {selectedShipment.bids.length > 0 && (
                    <div className="border-t border-slate-200 pt-6">
                      <h3 className="text-lg font-bold text-slate-900 mb-4 flex items-center space-x-2">
                        <Users className="w-5 h-5 text-blue-600" />
                        <span>Recent Bids (Anonymous)</span>
                      </h3>
                      <div className="space-y-2 max-h-64 overflow-y-auto">
                        {selectedShipment.bids
                          .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
                          .slice(0, 10)
                          .map((bid, idx) => (
                            <div key={bid.id} className="flex items-center justify-between bg-slate-50 p-3 rounded-lg hover:bg-slate-100 transition-colors">
                              <div>
                                <p className="text-sm font-bold text-slate-900">#{idx + 1}</p>
                                <p className="text-xs text-slate-500">
                                  {new Date(bid.createdAt).toLocaleTimeString('en-IN')}
                                </p>
                              </div>
                              <p className="text-lg font-bold text-blue-600">
                                ₹{bid.bidAmount.toLocaleString('en-IN')}
                              </p>
                            </div>
                          ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ) : null}
          </div>
        </div>
      )}
    </div>
  );
};

export default VendorAuctionMonitor;
