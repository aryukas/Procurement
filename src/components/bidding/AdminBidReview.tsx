// src/components/bidding/AdminBidReview.tsx
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { 
  ArrowRight, 
  MapPin, 
  CheckCircle2, 
  XCircle, 
  Clock, 
  AlertCircle, 
  Loader,
  TrendingDown
} from 'lucide-react';
import type { SimpleShipment, VendorBid } from '../../../types';
import { BiddingService } from '../../services/biddingService';

interface AdminBidReviewProps {
  onApprovalComplete?: () => void;
}

const AdminBidReview: React.FC<AdminBidReviewProps> = ({ onApprovalComplete }) => {
  const [shipments, setShipments] = useState<SimpleShipment[]>([]);
  const [bidsMap, setBidsMap] = useState<Record<string, VendorBid[]>>({});
  const [selectedShipment, setSelectedShipment] = useState<SimpleShipment | null>(null);
  const [approving, setApproving] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Load shipments
  useEffect(() => {
    setLoading(true);
    const unsubscribeShipments = BiddingService.listenToShipments((data) => {
      setShipments(data);
      setLoading(false);
    });

    return () => unsubscribeShipments();
  }, []);

  // Load bids for each shipment
  useEffect(() => {
    if (shipments.length === 0) return;

    const unsubscribers: Array<() => void> = [];

    shipments.forEach(shipment => {
      const unsubscribe = BiddingService.listenToBidsForShipment(shipment.id, (bids) => {
        setBidsMap(prev => ({ ...prev, [shipment.id]: bids }));
      });
      unsubscribers.push(unsubscribe);
    });

    return () => {
      unsubscribers.forEach(unsub => unsub());
    };
  }, [shipments]);

  // Feedback timeout
  useEffect(() => {
    if (feedback) {
      const timer = setTimeout(() => setFeedback(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [feedback]);

  // Get shipments with bids
  const shipmentsWithBids = useMemo(() => {
    return shipments.map(shipment => ({
      shipment,
      bids: bidsMap[shipment.id] || [],
      lowestBid: (bidsMap[shipment.id] || [])[0]
    }));
  }, [shipments, bidsMap]);

  // Get open shipments
  const openShipments = useMemo(() => {
    return shipmentsWithBids.filter(item => item.shipment.status === 'OPEN' && item.bids.length > 0);
  }, [shipmentsWithBids]);

  // Handle bid approval
  const handleApproveBid = useCallback(async (bidId: string, shipmentId: string) => {
    setApproving(prev => ({ ...prev, [bidId]: true }));

    try {
      const result = await BiddingService.approveBid(bidId, shipmentId);

      if (result.success) {
        setFeedback({ type: 'success', text: 'Bid approved and shipment closed!' });
        setSelectedShipment(null);
        onApprovalComplete?.();
      } else {
        setFeedback({ type: 'error', text: 'Failed to approve bid' });
      }
    } catch (error) {
      console.error('Error approving bid:', error);
      setFeedback({ type: 'error', text: 'An error occurred while approving the bid' });
    } finally {
      setApproving(prev => ({ ...prev, [bidId]: false }));
    }
  }, [onApprovalComplete]);

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto px-4 py-8">
        <div className="flex items-center justify-center h-96">
          <Loader className="w-8 h-8 text-blue-600 animate-spin" />
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-slate-800 mb-2">Bid Management</h1>
        <p className="text-slate-600">Review and approve bids for open shipments</p>
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

      {openShipments.length > 0 ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Shipments List */}
          <div className="lg:col-span-2 space-y-4">
            {openShipments.map(item => (
              <div
                key={item.shipment.id}
                onClick={() => setSelectedShipment(item.shipment)}
                className={`bg-white border-2 rounded-2xl p-6 cursor-pointer transition-all ${
                  selectedShipment?.id === item.shipment.id
                    ? 'border-blue-500 ring-4 ring-blue-50 shadow-lg'
                    : 'border-slate-200 hover:border-slate-300'
                }`}
              >
                <div className="flex justify-between items-start mb-4">
                  <div className="flex items-center space-x-4 flex-1">
                    <div className="bg-blue-50 p-3 rounded-xl">
                      <MapPin className="w-6 h-6 text-blue-600" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-1">
                        <h3 className="text-lg font-bold text-slate-800">{item.shipment.origin}</h3>
                        <ArrowRight className="w-4 h-4 text-slate-300" />
                        <h3 className="text-lg font-bold text-slate-800">{item.shipment.destination}</h3>
                      </div>
                      <p className="text-xs text-slate-400 font-semibold uppercase tracking-widest">
                        ID: {item.shipment.id}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="bg-blue-50 px-3 py-1 rounded-full mb-2">
                      <p className="text-xs font-bold text-blue-700">{item.bids.length} bid(s)</p>
                    </div>
                    {item.lowestBid && (
                      <div className="flex items-center space-x-1 text-emerald-600">
                        <TrendingDown className="w-4 h-4" />
                        <p className="text-sm font-bold">₹{item.lowestBid.bidAmount.toLocaleString()}</p>
                      </div>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-4 text-sm">
                  <div>
                    <p className="text-[10px] text-slate-400 font-bold uppercase mb-1">Vehicle</p>
                    <p className="font-semibold text-slate-800">{item.shipment.vehicleType}</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-slate-400 font-bold uppercase mb-1">Capacity</p>
                    <p className="font-semibold text-slate-800">{item.shipment.capacity}</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-slate-400 font-bold uppercase mb-1">Pickup</p>
                    <p className="font-semibold text-slate-800">
                      {new Date(item.shipment.pickupDate).toLocaleDateString()}
                    </p>
                  </div>
                </div>

                <div className="text-xs text-slate-500">
                  Click to view and manage bids
                </div>
              </div>
            ))}
          </div>

          {/* Bid Details Panel */}
          <div className="lg:col-span-1">
            {selectedShipment ? (
              <div className="bg-white border border-slate-200 rounded-2xl p-6 sticky top-4">
                <h3 className="text-lg font-bold text-slate-800 mb-4">Bids Received</h3>

                {bidsMap[selectedShipment.id] && bidsMap[selectedShipment.id].length > 0 ? (
                  <div className="space-y-3">
                    {bidsMap[selectedShipment.id].map((bid, index) => (
                      <div
                        key={bid.id}
                        className={`p-4 rounded-xl border-2 transition-all ${
                          bid.status === 'APPROVED'
                            ? 'bg-emerald-50 border-emerald-200'
                            : bid.status === 'REJECTED'
                            ? 'bg-slate-50 border-slate-200 opacity-60'
                            : 'bg-white border-slate-200 hover:border-slate-300'
                        }`}
                      >
                        <div className="flex justify-between items-start mb-2">
                          <div className="flex-1">
                            <p className="font-bold text-slate-800">{bid.vendorName}</p>
                            <p className="text-xs text-slate-500">
                              {new Date(bid.createdAt).toLocaleString()}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="font-bold text-lg text-slate-800">₹{bid.bidAmount.toLocaleString()}</p>
                            <p className={`text-[10px] font-bold uppercase mt-1 ${
                              bid.status === 'APPROVED' ? 'text-emerald-700' :
                              bid.status === 'REJECTED' ? 'text-slate-500' :
                              'text-blue-700'
                            }`}>
                              {bid.status}
                            </p>
                          </div>
                        </div>

                        {bid.status === 'PENDING' && (
                          <button
                            onClick={() => handleApproveBid(bid.id, selectedShipment.id)}
                            disabled={approving[bid.id]}
                            className="w-full mt-3 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-400 disabled:cursor-not-allowed text-white py-2 rounded-lg font-bold text-sm transition-all flex items-center justify-center space-x-2"
                          >
                            {approving[bid.id] ? (
                              <>
                                <Loader className="w-4 h-4 animate-spin" />
                                <span>Approving...</span>
                              </>
                            ) : (
                              <>
                                <CheckCircle2 className="w-4 h-4" />
                                <span>Approve</span>
                              </>
                            )}
                          </button>
                        )}

                        {bid.status === 'APPROVED' && (
                          <div className="mt-3 bg-emerald-100 text-emerald-700 py-2 rounded-lg text-center font-bold text-sm flex items-center justify-center space-x-1">
                            <CheckCircle2 className="w-4 h-4" />
                            <span>Approved</span>
                          </div>
                        )}

                        {bid.status === 'REJECTED' && (
                          <div className="mt-3 bg-slate-100 text-slate-600 py-2 rounded-lg text-center font-bold text-sm flex items-center justify-center space-x-1">
                            <XCircle className="w-4 h-4" />
                            <span>Rejected</span>
                          </div>
                        )}
                      </div>
                    ))}

                    <div className="bg-blue-50 border border-blue-200 p-3 rounded-xl text-xs text-blue-700 mt-4">
                      <p className="font-semibold mb-1">ℹ️ How it works</p>
                      <p>Approving a bid will automatically reject all other bids and close this shipment for bidding.</p>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <AlertCircle className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                    <p className="text-sm text-slate-500">No bids received yet</p>
                  </div>
                )}
              </div>
            ) : (
              <div className="bg-slate-50 border-2 border-dashed border-slate-200 rounded-2xl p-6 text-center text-slate-400 sticky top-4">
                <p className="text-sm font-medium">Select a shipment to view bids</p>
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="bg-white border-2 border-dashed border-slate-200 rounded-2xl p-16 text-center">
          <Clock className="w-12 h-12 text-slate-300 mx-auto mb-4" />
          <h3 className="text-lg font-bold text-slate-800 mb-2">No Bids Received</h3>
          <p className="text-slate-600">Check back when vendors place bids on open shipments</p>
        </div>
      )}
    </div>
  );
};

export default AdminBidReview;
