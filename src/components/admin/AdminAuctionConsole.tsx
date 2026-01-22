// src/components/admin/AdminAuctionConsole.tsx
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Clock,
  CheckCircle2,
  AlertCircle,
  Loader,
  Filter,
  X,
  TrendingDown,
  Users,
  ShoppingCart,
  ChevronDown,
  Send
} from 'lucide-react';
import type { SimpleShipment, VendorBid, User } from '../../../types';
import { BiddingService } from '../../services/biddingService';

interface AdminAuctionConsoleProps {
  currentUser: User;
}

interface ShipmentWithBids {
  shipment: SimpleShipment;
  bids: VendorBid[];
  lowestBid: VendorBid | null;
}

type FilterStatus = 'OPEN' | 'PENDING_ADMIN_APPROVAL' | 'FINALIZED' | 'ALL';

const AdminAuctionConsole: React.FC<AdminAuctionConsoleProps> = ({ currentUser }) => {
  const [shipments, setShipments] = useState<SimpleShipment[]>([]);
  const [bidsByShipment, setBidsByShipment] = useState<Record<string, VendorBid[]>>({});
  const [loading, setLoading] = useState(false);
  const [filterStatus, setFilterStatus] = useState<FilterStatus>('OPEN');
  const [expandedShipmentId, setExpandedShipmentId] = useState<string | null>(null);
  const [processingAuction, setProcessingAuction] = useState<Record<string, boolean>>({});
  const [rejectingBid, setRejectingBid] = useState<Record<string, boolean>>({});
  const [finalizingBid, setFinalizingBid] = useState<Record<string, boolean>>({});
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [counterOfferAmount, setCounterOfferAmount] = useState<Record<string, string>>({});

  // Load shipments
  useEffect(() => {
    setLoading(true);
    const unsubscribe = BiddingService.listenToShipments((data) => {
      setShipments(data);
      setLoading(false);
    });
    return () => unsubscribe();
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

  // Feedback timeout
  useEffect(() => {
    if (feedback) {
      const timer = setTimeout(() => setFeedback(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [feedback]);

  // Filter shipments
  const filteredShipments = useMemo<ShipmentWithBids[]>(() => {
    return shipments
      .filter(s => filterStatus === 'ALL' || s.status === filterStatus)
      .map(shipment => ({
        shipment,
        bids: bidsByShipment[shipment.id] || [],
        lowestBid: (bidsByShipment[shipment.id] || []).length > 0 
          ? (bidsByShipment[shipment.id] || [])[0]
          : null
      }))
      .sort((a, b) => {
        // Show PENDING_ADMIN_APPROVAL first
        if (a.shipment.status === 'PENDING_ADMIN_APPROVAL' && b.shipment.status !== 'PENDING_ADMIN_APPROVAL') return -1;
        if (a.shipment.status !== 'PENDING_ADMIN_APPROVAL' && b.shipment.status === 'PENDING_ADMIN_APPROVAL') return 1;
        return new Date(b.shipment.createdAt).getTime() - new Date(a.shipment.createdAt).getTime();
      });
  }, [shipments, bidsByShipment, filterStatus]);

  // Close auction
  const handleCloseAuction = useCallback(async (shipmentId: string) => {
    setProcessingAuction(prev => ({ ...prev, [shipmentId]: true }));

    try {
      const result = await BiddingService.closeAuction(shipmentId);
      if (result.success) {
        const message = result.result === 'NO_BIDS'
          ? 'Auction closed - no bids received'
          : `Winner selected: ${result.winningVendor} - ₹${result.winningAmount?.toLocaleString()}`;
        
        setFeedback({ type: 'success', text: message });
      } else {
        setFeedback({ type: 'error', text: 'Failed to close auction' });
      }
    } catch (error) {
      console.error('Error closing auction:', error);
      setFeedback({ type: 'error', text: 'An error occurred' });
    } finally {
      setProcessingAuction(prev => ({ ...prev, [shipmentId]: false }));
    }
  }, []);

  // Approve lowest bid
  const handleApproveBid = useCallback(async (bidId: string, shipmentId: string) => {
    setFinalizingBid(prev => ({ ...prev, [bidId]: true }));

    try {
      const result = await BiddingService.finalizeBid(bidId, shipmentId);
      if (result.success) {
        setFeedback({ type: 'success', text: 'Bid approved and shipment finalized!' });
      } else {
        setFeedback({ type: 'error', text: 'Failed to approve bid' });
      }
    } catch (error) {
      console.error('Error approving bid:', error);
      setFeedback({ type: 'error', text: 'An error occurred' });
    } finally {
      setFinalizingBid(prev => ({ ...prev, [bidId]: false }));
    }
  }, []);

  // Reject bid and select next
  const handleRejectAndNext = useCallback(async (currentBidId: string, nextBidId: string, shipmentId: string) => {
    setRejectingBid(prev => ({ ...prev, [currentBidId]: true }));

    try {
      const result = await BiddingService.rejectAndSelectNext(currentBidId, nextBidId, shipmentId);
      if (result.success) {
        setFeedback({ type: 'success', text: 'Bid rejected, next lowest selected' });
      } else {
        setFeedback({ type: 'error', text: 'Failed to reject bid' });
      }
    } catch (error) {
      console.error('Error rejecting bid:', error);
      setFeedback({ type: 'error', text: 'An error occurred' });
    } finally {
      setRejectingBid(prev => ({ ...prev, [currentBidId]: false }));
    }
  }, []);

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-slate-800 mb-2">🏆 Auction Management Console</h1>
        <p className="text-slate-600">Close auctions, approve bids, and finalize shipments</p>
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

      {/* Filter Section */}
      <div className="mb-6 flex gap-2 flex-wrap">
        {(['OPEN', 'PENDING_ADMIN_APPROVAL', 'FINALIZED', 'ALL'] as const).map(status => (
          <button
            key={status}
            onClick={() => setFilterStatus(status)}
            className={`px-4 py-2 rounded-lg font-semibold text-sm transition-all ${
              filterStatus === status
                ? 'bg-blue-600 text-white'
                : 'bg-slate-200 text-slate-700 hover:bg-slate-300'
            }`}
          >
            {status === 'PENDING_ADMIN_APPROVAL' ? 'Pending Approval' : status}
          </button>
        ))}
      </div>

      {/* Shipments List */}
      {loading ? (
        <div className="flex items-center justify-center h-96">
          <Loader className="w-8 h-8 text-blue-600 animate-spin" />
        </div>
      ) : filteredShipments.length > 0 ? (
        <div className="space-y-4">
          {filteredShipments.map(({ shipment, bids, lowestBid }) => (
            <div
              key={shipment.id}
              className="bg-white border border-slate-200 rounded-2xl overflow-hidden"
            >
              {/* Header */}
              <button
                onClick={() => setExpandedShipmentId(expandedShipmentId === shipment.id ? null : shipment.id)}
                className="w-full px-6 py-4 hover:bg-slate-50 flex items-center justify-between transition-colors"
              >
                <div className="flex items-center space-x-4 flex-1 text-left">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3 mb-2">
                      <h3 className="text-lg font-bold text-slate-800">
                        {shipment.origin} → {shipment.destination}
                      </h3>
                      <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                        shipment.status === 'OPEN' ? 'bg-blue-100 text-blue-700' :
                        shipment.status === 'PENDING_ADMIN_APPROVAL' ? 'bg-amber-100 text-amber-700' :
                        'bg-emerald-100 text-emerald-700'
                      }`}>
                        {shipment.status}
                      </span>
                    </div>
                    <div className="flex items-center space-x-4 text-sm text-slate-600">
                      <span className="flex items-center space-x-1">
                        <ShoppingCart className="w-4 h-4" />
                        <span>{shipment.material}</span>
                      </span>
                      <span className="flex items-center space-x-1">
                        <Users className="w-4 h-4" />
                        <span>{bids.length} bid(s)</span>
                      </span>
                      {lowestBid && (
                        <span className="flex items-center space-x-1 text-emerald-600 font-semibold">
                          <TrendingDown className="w-4 h-4" />
                          <span>₹{lowestBid.bidAmount.toLocaleString()}</span>
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                <ChevronDown
                  className={`w-5 h-5 text-slate-400 transition-transform ${
                    expandedShipmentId === shipment.id ? 'rotate-180' : ''
                  }`}
                />
              </button>

              {/* Expanded Content */}
              {expandedShipmentId === shipment.id && (
                <div className="border-t border-slate-200 px-6 py-4 bg-slate-50 space-y-4">
                  {/* Shipment Details */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                    <div className="bg-white p-3 rounded-lg">
                      <p className="text-[10px] text-slate-400 font-bold uppercase mb-1">Vehicle Type</p>
                      <p className="text-sm font-semibold text-slate-800">{shipment.vehicleType}</p>
                    </div>
                    <div className="bg-white p-3 rounded-lg">
                      <p className="text-[10px] text-slate-400 font-bold uppercase mb-1">Capacity</p>
                      <p className="text-sm font-semibold text-slate-800">{shipment.capacity}</p>
                    </div>
                    <div className="bg-white p-3 rounded-lg">
                      <p className="text-[10px] text-slate-400 font-bold uppercase mb-1">Pickup</p>
                      <p className="text-sm font-semibold text-slate-800">
                        {new Date(shipment.pickupDate).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="bg-white p-3 rounded-lg">
                      <p className="text-[10px] text-slate-400 font-bold uppercase mb-1">Delivery</p>
                      <p className="text-sm font-semibold text-slate-800">
                        {new Date(shipment.deliveryDate).toLocaleDateString()}
                      </p>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  {shipment.status === 'OPEN' && (
                    <div className="bg-white p-4 rounded-lg border border-slate-200">
                      <p className="text-sm text-slate-600 mb-3">
                        <span className="font-bold">Ready to close this auction?</span> All {bids.length} bids will be evaluated and lowest will be selected.
                      </p>
                      <button
                        onClick={() => handleCloseAuction(shipment.id)}
                        disabled={processingAuction[shipment.id] || bids.length === 0}
                        className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-slate-400 disabled:cursor-not-allowed text-white px-4 py-2 rounded-lg font-bold text-sm transition-all flex items-center justify-center space-x-2"
                      >
                        {processingAuction[shipment.id] ? (
                          <>
                            <Loader className="w-4 h-4 animate-spin" />
                            <span>Closing Auction...</span>
                          </>
                        ) : (
                          <>
                            <Clock className="w-4 h-4" />
                            <span>Close Auction</span>
                          </>
                        )}
                      </button>
                    </div>
                  )}

                  {/* Bids List */}
                  {bids.length > 0 ? (
                    <div>
                      <h4 className="font-bold text-slate-800 mb-3 flex items-center space-x-2">
                        <Users className="w-4 h-4" />
                        <span>{bids.length} Bid(s)</span>
                      </h4>
                      <div className="space-y-3">
                        {bids.map((bid, index) => (
                          <div
                            key={bid.id}
                            className={`bg-white p-4 rounded-lg border-2 transition-all ${
                              index === 0 && shipment.status === 'PENDING_ADMIN_APPROVAL'
                                ? 'border-emerald-500 ring-2 ring-emerald-100'
                                : 'border-slate-200'
                            }`}
                          >
                            <div className="flex items-center justify-between mb-3">
                              <div>
                                <h5 className="font-bold text-slate-800">
                                  {index === 0 && shipment.status === 'PENDING_ADMIN_APPROVAL' && '🏆 '}
                                  {bid.vendorName}
                                </h5>
                                <p className="text-xs text-slate-500">
                                  ID: {bid.vendorId}
                                </p>
                              </div>
                              <div className="text-right">
                                <p className="text-lg font-bold text-slate-800">
                                  ₹{bid.bidAmount.toLocaleString()}
                                </p>
                                <p className="text-xs text-slate-500">
                                  {new Date(bid.createdAt).toLocaleString()}
                                </p>
                              </div>
                            </div>

                            {/* Status Badge */}
                            <div className="flex items-center justify-between">
                              <span className={`text-xs font-bold px-2 py-1 rounded ${
                                bid.status === 'APPROVED' ? 'bg-emerald-100 text-emerald-700' :
                                bid.status === 'REJECTED' ? 'bg-red-100 text-red-700' :
                                'bg-amber-100 text-amber-700'
                              }`}>
                                {bid.status}
                              </span>

                              {/* Actions */}
                              {shipment.status === 'PENDING_ADMIN_APPROVAL' && index === 0 && bid.status === 'APPROVED' && (
                                <button
                                  onClick={() => handleApproveBid(bid.id, shipment.id)}
                                  disabled={finalizingBid[bid.id]}
                                  className="text-sm bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-400 text-white px-3 py-1 rounded font-bold transition-all flex items-center space-x-1"
                                >
                                  {finalizingBid[bid.id] ? (
                                    <>
                                      <Loader className="w-3 h-3 animate-spin" />
                                      <span>Finalizing...</span>
                                    </>
                                  ) : (
                                    <>
                                      <CheckCircle2 className="w-3 h-3" />
                                      <span>Finalize</span>
                                    </>
                                  )}
                                </button>
                              )}

                              {shipment.status === 'PENDING_ADMIN_APPROVAL' && index === 0 && bids.length > 1 && bid.status === 'APPROVED' && (
                                <button
                                  onClick={() => handleRejectAndNext(bid.id, bids[1].id, shipment.id)}
                                  disabled={rejectingBid[bid.id]}
                                  className="text-sm bg-amber-600 hover:bg-amber-700 disabled:bg-slate-400 text-white px-3 py-1 rounded font-bold transition-all flex items-center space-x-1"
                                >
                                  {rejectingBid[bid.id] ? (
                                    <>
                                      <Loader className="w-3 h-3 animate-spin" />
                                    </>
                                  ) : (
                                    <>
                                      <X className="w-3 h-3" />
                                      <span>Reject</span>
                                    </>
                                  )}
                                </button>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div className="bg-white p-4 rounded-lg border border-slate-200 text-center">
                      <AlertCircle className="w-8 h-8 text-slate-400 mx-auto mb-2" />
                      <p className="text-sm text-slate-600">No bids received for this shipment</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      ) : (
        <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center">
          <ShoppingCart className="w-16 h-16 text-slate-300 mx-auto mb-4" />
          <h3 className="text-lg font-bold text-slate-800 mb-2">No Shipments</h3>
          <p className="text-slate-600">No shipments found with status: {filterStatus}</p>
        </div>
      )}
    </div>
  );
};

export default AdminAuctionConsole;
