import React, { useState, useEffect } from 'react';
import { Clock, MapPin, Check, X, AlertCircle, CheckCircle2, Loader } from 'lucide-react';
import type { LiveAuction, ReverseBid } from '../../../types';
import { LiveAuctionService } from '../../services/liveAuctionService';

interface AdminAuctionMonitorProps {
  adminId: string;
}

const AdminAuctionMonitor: React.FC<AdminAuctionMonitorProps> = ({ adminId }) => {
  const [auctions, setAuctions] = useState<LiveAuction[]>([]);
  const [auctionBids, setAuctionBids] = useState<Record<string, ReverseBid[]>>({});
  const [selectedAuctionId, setSelectedAuctionId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [approving, setApproving] = useState<Record<string, boolean>>({});
  const [closing, setClosing] = useState<Record<string, boolean>>({});

  // Load auctions on mount
  useEffect(() => {
    const loadAuctions = async () => {
      try {
        setLoading(true);
        const activeAuctions = await LiveAuctionService.getAllActiveAuctions();
        setAuctions(activeAuctions);
        if (activeAuctions.length > 0 && !selectedAuctionId) {
          setSelectedAuctionId(activeAuctions[0].id);
        }
      } catch (error) {
        console.error('Error loading auctions:', error);
        setFeedback({ type: 'error', message: 'Failed to load auctions' });
      } finally {
        setLoading(false);
      }
    };

    loadAuctions();
  }, []);

  // Listen to bids for each auction
  useEffect(() => {
    const unsubscribers: (() => void)[] = [];

    auctions.forEach(auction => {
      const unsubscribe = LiveAuctionService.listenToBidsForAuction(auction.id, (bids) => {
        setAuctionBids(prev => ({
          ...prev,
          [auction.id]: bids
        }));
      });
      unsubscribers.push(unsubscribe);
    });

    return () => unsubscribers.forEach(unsub => unsub());
  }, [auctions]);

  // Auto-dismiss feedback
  useEffect(() => {
    if (feedback) {
      const timer = setTimeout(() => setFeedback(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [feedback]);

  const handleApproveBid = async (bidId: string, auctionId: string) => {
    setApproving(prev => ({ ...prev, [bidId]: true }));
    try {
      const result = await LiveAuctionService.approveBid(bidId, auctionId);
      if (result.success) {
        setFeedback({ type: 'success', message: 'Bid approved! Auction closed.' });
        // Update auctions list
        const updated = auctions.map(a =>
          a.id === auctionId ? { ...a, status: 'CLOSED' as const } : a
        );
        setAuctions(updated.filter(a => a.status === 'ACTIVE'));
      } else {
        setFeedback({ type: 'error', message: result.error?.message || 'Failed to approve bid' });
      }
    } catch (error) {
      setFeedback({ type: 'error', message: 'An error occurred while approving bid' });
      console.error('Error approving bid:', error);
    } finally {
      setApproving(prev => ({ ...prev, [bidId]: false }));
    }
  };

  const handleCloseAuction = async (auctionId: string) => {
    setClosing(prev => ({ ...prev, [auctionId]: true }));
    try {
      const result = await LiveAuctionService.closeAuction(auctionId);
      if (result.success) {
        setFeedback({ type: 'success', message: 'Auction closed without selection' });
        const updated = auctions.map(a =>
          a.id === auctionId ? { ...a, status: 'CLOSED' as const } : a
        );
        setAuctions(updated.filter(a => a.status === 'ACTIVE'));
      } else {
        setFeedback({ type: 'error', message: 'Failed to close auction' });
      }
    } catch (error) {
      setFeedback({ type: 'error', message: 'An error occurred while closing auction' });
      console.error('Error closing auction:', error);
    } finally {
      setClosing(prev => ({ ...prev, [auctionId]: false }));
    }
  };

  const selectedAuction = auctions.find(a => a.id === selectedAuctionId);
  const selectedBids = selectedAuctionId ? (auctionBids[selectedAuctionId] || []) : [];

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <Loader className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (auctions.length === 0) {
    return (
      <div className="bg-slate-50 border border-slate-200 rounded-lg p-6 text-center">
        <Clock className="w-12 h-12 text-slate-400 mx-auto mb-3" />
        <h3 className="text-lg font-bold text-slate-900 mb-2">No Active Auctions</h3>
        <p className="text-slate-600 text-sm">There are no active auctions at this time.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Feedback Messages */}
      {feedback && (
        <div className={`p-4 rounded-lg flex items-center space-x-3 ${
          feedback.type === 'success'
            ? 'bg-emerald-50 border border-emerald-200'
            : 'bg-red-50 border border-red-200'
        }`}>
          {feedback.type === 'success' ? (
            <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0" />
          ) : (
            <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0" />
          )}
          <span className={feedback.type === 'success' ? 'text-emerald-700' : 'text-red-700'}>
            {feedback.message}
          </span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Auctions List */}
        <div className="lg:col-span-1">
          <h3 className="font-bold text-slate-900 mb-4">Active Auctions</h3>
          <div className="space-y-3">
            {auctions.map(auction => (
              <button
                key={auction.id}
                onClick={() => setSelectedAuctionId(auction.id)}
                className={`w-full p-4 rounded-xl border-2 transition-all text-left ${
                  selectedAuctionId === auction.id
                    ? 'border-blue-600 bg-blue-50'
                    : 'border-slate-200 bg-white hover:border-slate-300'
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <p className="font-bold text-slate-900 text-sm">{auction.laneId}</p>
                    <p className="text-xs text-slate-500">
                      {(auctionBids[auction.id] || []).length} bids
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-blue-600 text-sm">
                      ₹{auction.lowestBid?.toLocaleString('en-IN') || 'N/A'}
                    </p>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Auction Details & Bids */}
        <div className="lg:col-span-2">
          {selectedAuction ? (
            <div className="bg-white rounded-2xl border border-slate-200 p-6">
              {/* Auction Header */}
              <div className="mb-6">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <div className="flex items-center space-x-2 mb-2">
                      <MapPin className="w-5 h-5 text-blue-600" />
                      <h2 className="text-2xl font-bold text-slate-900">{selectedAuction.laneId}</h2>
                    </div>
                    <p className="text-slate-500 text-sm">ID: {selectedAuction.id}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs font-bold text-slate-500 uppercase">Lowest Bid</p>
                    <p className="text-3xl font-bold text-blue-600">
                      {selectedAuction.lowestBid
                        ? `₹${selectedAuction.lowestBid.toLocaleString('en-IN')}`
                        : 'N/A'}
                    </p>
                  </div>
                </div>
                <div className="flex items-center space-x-4 pt-4 border-t border-slate-200">
                  <div>
                    <p className="text-xs font-bold text-slate-500 uppercase">Total Bids</p>
                    <p className="text-2xl font-bold text-slate-900">{selectedBids.length}</p>
                  </div>
                  <div>
                    <p className="text-xs font-bold text-slate-500 uppercase">Status</p>
                    <p className="text-lg font-bold text-green-600">{selectedAuction.status}</p>
                  </div>
                </div>
              </div>

              {/* Bids Table */}
              <div className="border-t border-slate-200 pt-6">
                <h3 className="font-bold text-slate-900 mb-4">Vendor Bids</h3>
                {selectedBids.length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b border-slate-200">
                          <th className="text-left text-xs font-bold text-slate-500 uppercase pb-3">Rank</th>
                          <th className="text-left text-xs font-bold text-slate-500 uppercase pb-3">Vendor</th>
                          <th className="text-left text-xs font-bold text-slate-500 uppercase pb-3">Bid Amount</th>
                          <th className="text-left text-xs font-bold text-slate-500 uppercase pb-3">Time</th>
                          <th className="text-right text-xs font-bold text-slate-500 uppercase pb-3">Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {selectedBids.map((bid, idx) => (
                          <tr key={bid.id} className="border-b border-slate-100 hover:bg-slate-50">
                            <td className="py-3 font-bold text-slate-900">#{idx + 1}</td>
                            <td className="py-3">
                              <p className="font-bold text-slate-900">{bid.vendorName}</p>
                              <p className="text-xs text-slate-500">{bid.vendorId}</p>
                            </td>
                            <td className="py-3">
                              <p className="text-lg font-bold text-blue-600">
                                ₹{bid.amount.toLocaleString('en-IN')}
                              </p>
                            </td>
                            <td className="py-3 text-sm text-slate-600">
                              {new Date(bid.createdAt).toLocaleTimeString()}
                            </td>
                            <td className="py-3 text-right">
                              <button
                                onClick={() => handleApproveBid(bid.id, selectedAuction.id)}
                                disabled={approving[bid.id]}
                                className={`px-3 py-1.5 rounded-lg font-bold text-sm flex items-center space-x-1 ml-auto transition-colors ${
                                  approving[bid.id]
                                    ? 'bg-slate-300 text-slate-500'
                                    : 'bg-green-100 text-green-700 hover:bg-green-200'
                                }`}
                              >
                                {approving[bid.id] ? (
                                  <Loader className="w-4 h-4 animate-spin" />
                                ) : (
                                  <Check className="w-4 h-4" />
                                )}
                                <span>Approve</span>
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <p className="text-center text-slate-500 py-6">No bids yet</p>
                )}
              </div>

              {/* Close Auction Button */}
              <div className="border-t border-slate-200 mt-6 pt-6">
                <button
                  onClick={() => handleCloseAuction(selectedAuction.id)}
                  disabled={closing[selectedAuction.id]}
                  className={`w-full py-2.5 rounded-lg font-bold flex items-center justify-center space-x-2 transition-colors ${
                    closing[selectedAuction.id]
                      ? 'bg-slate-300 text-slate-500'
                      : 'bg-red-100 text-red-700 hover:bg-red-200'
                  }`}
                >
                  {closing[selectedAuction.id] ? (
                    <Loader className="w-4 h-4 animate-spin" />
                  ) : (
                    <X className="w-4 h-4" />
                  )}
                  <span>Close Auction Without Selection</span>
                </button>
              </div>
            </div>
          ) : (
            <div className="text-center text-slate-500">Select an auction</div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AdminAuctionMonitor;
