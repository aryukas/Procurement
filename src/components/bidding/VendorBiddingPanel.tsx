// src/components/bidding/VendorBiddingPanel.tsx
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { ArrowRight, MapPin, Truck, Calendar, IndianRupee, Send, CheckCircle2, AlertCircle, Loader, Filter, X } from 'lucide-react';
import type { SimpleShipment, VendorBid, User, LaneMaster } from '../../../types';
import { BiddingService } from '../../services/biddingService';
import { LaneService } from '../../services/laneService';

interface VendorBiddingPanelProps {
  currentUser: User;
  onBidPlaced?: () => void;
}

interface ShipmentWithLane extends SimpleShipment {
  laneId?: string;
  laneName?: string;
}

const VendorBiddingPanel: React.FC<VendorBiddingPanelProps> = ({ currentUser, onBidPlaced }) => {
  const [shipments, setShipments] = useState<ShipmentWithLane[]>([]);
  const [lanes, setLanes] = useState<LaneMaster[]>([]);
  const [vendorBids, setVendorBids] = useState<VendorBid[]>([]);
  const [bidAmounts, setBidAmounts] = useState<Record<string, string>>({});
  const [selectedShipment, setSelectedShipment] = useState<ShipmentWithLane | null>(null);
  const [selectedLanes, setSelectedLanes] = useState<string[]>([]);
  const [showLaneFilter, setShowLaneFilter] = useState(false);
  const [loading, setLoading] = useState(false);
  const [lanesLoading, setLanesLoading] = useState(false);
  const [submitting, setSubmitting] = useState<Record<string, boolean>>({});
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Load lanes
  useEffect(() => {
    setLanesLoading(true);
    const unsubscribeLanes = LaneService.listenToActiveLanes((data) => {
      setLanes(data);
      setLanesLoading(false);
    });

    return () => unsubscribeLanes?.();
  }, []);

  // Load shipments
  useEffect(() => {
    setLoading(true);
    const unsubscribeShipments = BiddingService.listenToShipments((data) => {
      setShipments(data);
      setLoading(false);
    });

    return () => unsubscribeShipments();
  }, []);

  // Load vendor bids
  useEffect(() => {
    if (!currentUser?.id) return;

    const unsubscribeBids = BiddingService.listenToVendorBids(currentUser.id, (data) => {
      setVendorBids(data);
    });

    return () => unsubscribeBids();
  }, [currentUser?.id]);

  // Feedback timeout
  useEffect(() => {
    if (feedback) {
      const timer = setTimeout(() => setFeedback(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [feedback]);

  // Get open shipments only - VENDOR CAN ONLY BID ON SHIPMENTS FROM THEIR ASSIGNED LANES
  const filteredShipments = useMemo(() => {
    const result = shipments.filter(s => s.status === 'OPEN');
    
    // CRITICAL: If vendor has assigned lanes, filter to ONLY those lanes
    // Vendors can only see and bid on shipments from their assigned lanes
    if (currentUser?.lanes && currentUser.lanes.length > 0) {
      return result.filter(s => {
        // Find matching lane for this shipment
        const lane = lanes.find(l => 
          (l.origin.toLowerCase() === s.origin.toLowerCase() && 
           l.destination.toLowerCase() === s.destination.toLowerCase())
        );
        // Only show if lane exists AND vendor is assigned to it
        return lane && currentUser.lanes!.includes(lane.id);
      });
    }
    
    // If vendor has NO assigned lanes, show all open shipments (demo mode)
    return result;
  }, [shipments, lanes, currentUser?.lanes]);

  // Get vendor's assigned lanes only
  const vendorAssignedLanes = useMemo(() => {
    if (!currentUser?.lanes || currentUser.lanes.length === 0) {
      // No assigned lanes - vendor can see all lanes (demo mode)
      return lanes;
    }
    // Filter to only show vendor's assigned lanes
    return lanes.filter(lane => currentUser.lanes!.includes(lane.id));
  }, [lanes, currentUser?.lanes]);

  // Check if vendor already bid on a shipment
  const hasVendorBid = useCallback((shipmentId: string): boolean => {
    return vendorBids.some(bid => bid.shipmentId === shipmentId);
  }, [vendorBids]);

  // Toggle lane selection
  const toggleLaneSelection = useCallback((laneId: string) => {
    setSelectedLanes(prev => 
      prev.includes(laneId) 
        ? prev.filter(l => l !== laneId)
        : [...prev, laneId]
    );
  }, []);

  // Get lane name for shipment
  const getLaneForShipment = useCallback((shipment: ShipmentWithLane): LaneMaster | undefined => {
    return lanes.find(l => 
      l.origin.toLowerCase() === shipment.origin.toLowerCase() && 
      l.destination.toLowerCase() === shipment.destination.toLowerCase()
    );
  }, [lanes]);

  // Get vendor's bid for a shipment
  const getVendorBid = useCallback((shipmentId: string): VendorBid | undefined => {
    return vendorBids.find(bid => bid.shipmentId === shipmentId);
  }, [vendorBids]);

  // Handle bid submission
  const handlePlaceBid = useCallback(async (shipmentId: string) => {
    const amountStr = bidAmounts[shipmentId]?.trim();

    if (!amountStr) {
      setFeedback({ type: 'error', text: 'Please enter a bid amount' });
      return;
    }

    const amount = parseInt(amountStr, 10);
    if (isNaN(amount) || amount <= 0) {
      setFeedback({ type: 'error', text: 'Bid amount must be a positive number' });
      return;
    }

    if (!currentUser?.id || !currentUser?.name) {
      setFeedback({ type: 'error', text: 'User information is missing' });
      return;
    }

    setSubmitting(prev => ({ ...prev, [shipmentId]: true }));

    try {
      const result = await BiddingService.placeBid({
        shipmentId,
        vendorId: currentUser.id,
        vendorName: currentUser.name,
        bidAmount: amount
      });

      if (result.success) {
        setFeedback({ type: 'success', text: 'Bid placed successfully!' });
        setBidAmounts(prev => ({ ...prev, [shipmentId]: '' }));
        onBidPlaced?.();
      } else {
        setFeedback({ type: 'error', text: result.error?.message || 'Failed to place bid' });
      }
    } catch (error) {
      console.error('Error placing bid:', error);
      setFeedback({ type: 'error', text: 'An error occurred while placing the bid' });
    } finally {
      setSubmitting(prev => ({ ...prev, [shipmentId]: false }));
    }
  }, [bidAmounts, currentUser, onBidPlaced]);

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-slate-800 mb-2">Available Shipments</h1>
        <p className="text-slate-600">Select lanes and place your bids on available shipments</p>
      </div>

      {/* Lane Filter Section */}
      <div className="mb-8 bg-white border border-slate-200 rounded-2xl p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-2">
            <Filter className="w-5 h-5 text-blue-600" />
            <h2 className="text-lg font-bold text-slate-800">Filter by Lane</h2>
          </div>
          <button
            onClick={() => setShowLaneFilter(!showLaneFilter)}
            className="text-sm font-semibold text-blue-600 hover:text-blue-700 transition-colors"
          >
            {showLaneFilter ? 'Hide' : 'Show'}
          </button>
        </div>

        {showLaneFilter && (
          <div>
            {lanesLoading ? (
              <div className="flex items-center justify-center py-4">
                <Loader className="w-5 h-5 text-blue-600 animate-spin" />
              </div>
            ) : vendorAssignedLanes.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {vendorAssignedLanes.map(lane => (
                  <label key={lane.id} className="flex items-center p-3 bg-slate-50 border border-slate-200 rounded-lg cursor-pointer hover:bg-slate-100 transition-colors">
                    <input
                      type="checkbox"
                      checked={selectedLanes.includes(lane.id)}
                      onChange={() => toggleLaneSelection(lane.id)}
                      className="w-4 h-4 text-blue-600 rounded"
                    />
                    <span className="ml-3 text-sm font-semibold text-slate-800">
                      {lane.origin} → {lane.destination}
                    </span>
                    <span className="ml-auto text-xs text-slate-500 bg-white px-2 py-1 rounded">
                      {lane.code}
                    </span>
                  </label>
                ))}
              </div>
            ) : (
              <p className="text-slate-600 text-sm">No lanes available</p>
            )}

            {selectedLanes.length > 0 && (
              <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg flex items-center justify-between">
                <span className="text-sm text-blue-700">
                  <span className="font-bold">{selectedLanes.length}</span> lane(s) selected
                </span>
                <button
                  onClick={() => setSelectedLanes([])}
                  className="text-sm text-blue-600 hover:text-blue-700 font-semibold flex items-center space-x-1"
                >
                  <X className="w-4 h-4" />
                  <span>Clear</span>
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Feedback Toast */}
      {feedback && (
        <div className={`mb-6 p-4 rounded-lg text-sm font-medium flex items-center space-x-2 ${
          feedback.type === 'success' 
            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' 
            : 'bg-red-50 text-red-700 border border-red-200'
        }`}>
          {feedback.type === 'success' ? (
            <CheckCircle2 className="w-5 h-5" />
          ) : (
            <AlertCircle className="w-5 h-5" />
          )}
          <span>{feedback.text}</span>
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center h-96">
          <Loader className="w-8 h-8 text-blue-600 animate-spin" />
        </div>
      ) : filteredShipments.length > 0 ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Shipments List */}
          <div className="lg:col-span-2 space-y-4">
            {filteredShipments.map(shipment => {
              const hasAlreadyBid = hasVendorBid(shipment.id);
              const vendorBid = getVendorBid(shipment.id);
              const lane = getLaneForShipment(shipment);

              return (
                <div
                  key={shipment.id}
                  onClick={() => setSelectedShipment(shipment)}
                  className={`bg-white border-2 rounded-2xl p-6 cursor-pointer transition-all ${
                    selectedShipment?.id === shipment.id
                      ? 'border-blue-500 ring-4 ring-blue-50 shadow-lg'
                      : 'border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <div className="flex justify-between items-start mb-4">
                    <div className="flex items-center space-x-4">
                      <div className="bg-blue-50 p-3 rounded-xl">
                        <MapPin className="w-6 h-6 text-blue-600" />
                      </div>
                      <div>
                        <div className="flex items-center space-x-2 mb-1">
                          <h3 className="text-lg font-bold text-slate-800">{shipment.origin}</h3>
                          <ArrowRight className="w-4 h-4 text-slate-300" />
                          <h3 className="text-lg font-bold text-slate-800">{shipment.destination}</h3>
                        </div>
                        <div className="flex items-center space-x-2">
                          <p className="text-xs text-slate-400 font-semibold uppercase tracking-widest">ID: {shipment.id}</p>
                          {lane && (
                            <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded font-semibold">
                              {lane.code}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    {hasAlreadyBid && (
                      <div className="bg-emerald-50 border border-emerald-200 px-3 py-1 rounded-full flex items-center space-x-1">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                        <span className="text-xs font-bold text-emerald-700">Bid Placed</span>
                      </div>
                    )}
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                    <div>
                      <p className="text-[10px] text-slate-400 font-bold uppercase mb-1">Vehicle Type</p>
                      <p className="text-sm font-semibold text-slate-800">{shipment.vehicleType}</p>
                    </div>
                    <div>
                      <p className="text-[10px] text-slate-400 font-bold uppercase mb-1">Load Type</p>
                      <p className="text-sm font-semibold text-slate-800">{shipment.loadType}</p>
                    </div>
                    <div>
                      <p className="text-[10px] text-slate-400 font-bold uppercase mb-1">Capacity</p>
                      <p className="text-sm font-semibold text-slate-800">{shipment.capacity}</p>
                    </div>
                    <div>
                      <p className="text-[10px] text-slate-400 font-bold uppercase mb-1">Pickup Date</p>
                      <p className="text-sm font-semibold text-slate-800">
                        {new Date(shipment.pickupDate).toLocaleDateString()}
                      </p>
                    </div>
                  </div>

                  {/* Bid input for non-bid shipments */}
                  {!hasAlreadyBid ? (
                    <>
                      {shipment.status === 'OPEN' ? (
                        <div className="flex gap-2">
                          <div className="relative flex-1">
                            <IndianRupee className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                            <input
                              type="number"
                              placeholder="Enter bid amount"
                              min="1"
                              className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                              value={bidAmounts[shipment.id] || ''}
                              onChange={e => setBidAmounts(prev => ({ ...prev, [shipment.id]: e.target.value }))}
                            />
                          </div>
                          <button
                            onClick={() => handlePlaceBid(shipment.id)}
                            disabled={submitting[shipment.id] || !bidAmounts[shipment.id]?.trim()}
                            className="bg-blue-600 hover:bg-blue-700 disabled:bg-slate-400 disabled:cursor-not-allowed text-white px-6 py-2.5 rounded-lg font-bold text-sm transition-all flex items-center space-x-2"
                          >
                            {submitting[shipment.id] ? (
                              <>
                                <Loader className="w-4 h-4 animate-spin" />
                                <span>Placing...</span>
                              </>
                            ) : (
                              <>
                                <Send className="w-4 h-4" />
                                <span>Place Bid</span>
                              </>
                            )}
                          </button>
                        </div>
                      ) : (
                        <div className="bg-amber-50 border border-amber-200 p-3 rounded-lg">
                          <p className="text-sm text-amber-700">
                            <span className="font-bold">Auction Closed</span> - Status: {shipment.status}
                          </p>
                        </div>
                      )}
                    </>
                  ) : (
                    <div className="bg-emerald-50 border border-emerald-200 p-3 rounded-lg">
                      <p className="text-sm text-emerald-700">
                        <span className="font-bold">Your bid:</span> ₹{vendorBid?.bidAmount.toLocaleString()}
                      </p>
                      <p className="text-[10px] text-emerald-600 mt-1">Status: {vendorBid?.status}</p>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Details Panel */}
          <div className="lg:col-span-1">
            {selectedShipment ? (
              <div className="bg-white border border-slate-200 rounded-2xl p-6 sticky top-4">
                <h3 className="text-lg font-bold text-slate-800 mb-4">Shipment Details</h3>

                <div className="space-y-4">
                  <div>
                    <p className="text-[10px] text-slate-400 font-bold uppercase mb-1">Route / Lane</p>
                    <p className="text-sm font-semibold text-slate-800">
                      {selectedShipment.origin} → {selectedShipment.destination}
                    </p>
                    {getLaneForShipment(selectedShipment) && (
                      <p className="text-xs text-slate-500 mt-1">
                        Lane: <span className="font-semibold">{getLaneForShipment(selectedShipment)?.code}</span>
                      </p>
                    )}
                  </div>

                  <div>
                    <p className="text-[10px] text-slate-400 font-bold uppercase mb-1">Material</p>
                    <p className="text-sm font-semibold text-slate-800">{selectedShipment.material}</p>
                  </div>

                  <div>
                    <p className="text-[10px] text-slate-400 font-bold uppercase mb-1">Capacity</p>
                    <p className="text-sm font-semibold text-slate-800">{selectedShipment.capacity}</p>
                  </div>

                  <div>
                    <p className="text-[10px] text-slate-400 font-bold uppercase mb-1">Vehicle Type</p>
                    <p className="text-sm font-semibold text-slate-800">{selectedShipment.vehicleType}</p>
                  </div>

                  <div>
                    <p className="text-[10px] text-slate-400 font-bold uppercase mb-1">Load Type</p>
                    <p className="text-sm font-semibold text-slate-800">{selectedShipment.loadType}</p>
                  </div>

                  <div className="border-t border-slate-100 pt-4">
                    <p className="text-[10px] text-slate-400 font-bold uppercase mb-2">Timeline</p>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-slate-600">Pickup:</span>
                        <span className="font-semibold">
                          {new Date(selectedShipment.pickupDate).toLocaleDateString()}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-600">Delivery:</span>
                        <span className="font-semibold">
                          {new Date(selectedShipment.deliveryDate).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="bg-slate-50 border-2 border-dashed border-slate-200 rounded-2xl p-6 text-center text-slate-400">
                <p className="text-sm font-medium">Select a shipment to view details</p>
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="bg-white border-2 border-dashed border-slate-200 rounded-2xl p-16 text-center">
          <AlertCircle className="w-12 h-12 text-slate-300 mx-auto mb-4" />
          <h3 className="text-lg font-bold text-slate-800 mb-2">
            {selectedLanes.length > 0 ? 'No Shipments on Selected Lanes' : 'No Available Shipments'}
          </h3>
          <p className="text-slate-600">
            {selectedLanes.length > 0 
              ? 'Try selecting different lanes or check back later' 
              : 'Select lanes above to see available shipments'}
          </p>
        </div>
      )}
    </div>
  );
};

export default VendorBiddingPanel;