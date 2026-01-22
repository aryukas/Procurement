import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Clock, MapPin, Truck, TrendingDown, AlertCircle, CheckCircle2, Loader } from 'lucide-react';
import type { User, LiveAuction, ReverseBid } from '../../../types';
import { LiveAuctionService } from '../../services/liveAuctionService';

interface VendorAuctionConsoleProps {
  currentUser: User;
}

const VendorAuctionConsole: React.FC<VendorAuctionConsoleProps> = ({ currentUser }) => {
  const [activeAuctions, setActiveAuctions] = useState<LiveAuction[]>([]);
  const [auctionBids, setAuctionBids] = useState<Record<string, ReverseBid[]>>({});
  const [vendorBids, setVendorBids] = useState<Record<string, ReverseBid>>({});
  const [bidAmounts, setBidAmounts] = useState<Record<string, string>>({});
  const [selectedAuction, setSelectedAuction] = useState<LiveAuction | null>(null);
  const [loading, setLoading] = useState(true);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [submitting, setSubmitting] = useState<Record<string, boolean>>({});

  const vendorLaneIds = useMemo(() => currentUser.lanes || [], [currentUser.lanes]);

  // Load active auctions on mount
  useEffect(() => {
    const loadAuctions = async () => {
      try {
        setLoading(true);
        const auctions = await LiveAuctionService.getActiveLanesForVendor(vendorLaneIds);
        setActiveAuctions(auctions);
        if (auctions.length > 0) {
          setSelectedAuction(auctions[0]);
        }
      } catch (error) {
        console.error('Error loading auctions:', error);
        setFeedback({ type: 'error', message: 'Failed to load auctions' });
      } finally {
        setLoading(false);
      }
    };

    if (vendorLaneIds.length > 0) {
      loadAuctions();
    } else {
      setLoading(false);
    }
  }, [vendorLaneIds]);

  // Listen to bids for each auction
  useEffect(() => {
    const unsubscribers: (() => void)[] = [];

    activeAuctions.forEach(auction => {
      const unsubscribe = LiveAuctionService.listenToBidsForAuction(auction.id, (bids) => {
        setAuctionBids(prev => ({
          ...prev,
          [auction.id]: bids
        }));
      });
      unsubscribers.push(unsubscribe);

      // Listen to vendor's own bids
      const vendorUnsubscribe = LiveAuctionService.listenToVendorBidsOnAuction(
        auction.id,
        currentUser.id,
        (bids) => {
          if (bids.length > 0) {
            setVendorBids(prev => ({
              ...prev,
              [auction.id]: bids[0] // Most recent
            }));
          }
        }
      );
      unsubscribers.push(vendorUnsubscribe);
    });

    return () => unsubscribers.forEach(unsub => unsub());
  }, [activeAuctions, currentUser.id]);

  // Auto-dismiss feedback
  useEffect(() => {
    if (feedback) {
      const timer = setTimeout(() => setFeedback(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [feedback]);

  const handlePlaceBid = useCallback(async (auctionId: string) => {
    const amountStr = bidAmounts[auctionId]?.trim();
    
    if (!amountStr) {
      setFeedback({ type: 'error', message: 'Please enter a bid amount' });
      return;
    }

    const amount = parseFloat(amountStr);
    if (isNaN(amount) || amount <= 0) {
      setFeedback({ type: 'error', message: 'Please enter a valid bid amount' });
      return;
    }

    const auction = activeAuctions.find(a => a.id === auctionId);
    if (!auction) {
      setFeedback({ type: 'error', message: 'Auction not found' });
      return;
    }

    setSubmitting(prev => ({ ...prev, [auctionId]: true }));
    try {
      const result = await LiveAuctionService.placeBid({
        auctionId,
        laneId: auction.laneId,
        vendorId: currentUser.id,
        vendorName: currentUser.name,
        amount
      });

      if (result.success) {
        setFeedback({ type: 'success', message: 'Bid placed successfully!' });
        setBidAmounts(prev => ({ ...prev, [auctionId]: '' }));
      } else {
        setFeedback({ type: 'error', message: result.error?.message || 'Failed to place bid' });
      }
    } catch (error) {
      setFeedback({ type: 'error', message: 'An error occurred while placing bid' });
      console.error('Error placing bid:', error);
    } finally {
      setSubmitting(prev => ({ ...prev, [auctionId]: false }));
    }
  }, [bidAmounts, activeAuctions, currentUser.id, currentUser.name]);

  const getLowestBid = useCallback((auctionId: string) => {
    const bids = auctionBids[auctionId] || [];
    return bids.length > 0 ? bids[0].amount : null;
  }, [auctionBids]);

  const getVendorLastBid = useCallback((auctionId: string) => {
    return vendorBids[auctionId] || null;
  }, [vendorBids]);

  if (!currentUser?.id) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="text-center text-red-600">Invalid user data</div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-8 flex items-center justify-center min-h-96">
        <Loader className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (activeAuctions.length === 0) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 text-center">
          <Clock className="w-12 h-12 text-blue-600 mx-auto mb-3" />
          <h3 className="text-lg font-bold text-blue-900 mb-2">No Active Auctions</h3>
          <p className="text-blue-700 text-sm">
            There are no active auctions for your registered lanes at this time.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      {/* Feedback Messages */}
      {feedback && (
        <div className={`mb-6 p-4 rounded-lg flex items-center space-x-3 ${
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

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Auctions List */}
        <div className="lg:col-span-1">
          <h2 className="text-lg font-bold text-slate-900 mb-4">Active Auctions</h2>
          <div className="space-y-3">
            {activeAuctions.map(auction => (
              <button
                key={auction.id}
                onClick={() => setSelectedAuction(auction)}
                className={`w-full p-4 rounded-xl border-2 transition-all text-left ${
                  selectedAuction?.id === auction.id
                    ? 'border-blue-600 bg-blue-50'
                    : 'border-slate-200 bg-white hover:border-slate-300'
                }`}
              >
                <div className="flex items-start space-x-3">
                  <div className="bg-blue-100 p-2 rounded-lg">
                    <MapPin className="w-5 h-5 text-blue-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-slate-900 text-sm">{auction.laneId}</p>
                    <p className="text-xs text-slate-500">
                      Lowest: ₹{auction.lowestBid ? auction.lowestBid.toLocaleString('en-IN') : 'Pending'}
                    </p>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Selected Auction Details */}
        <div className="lg:col-span-2">
          {selectedAuction ? (
            <div className="bg-white rounded-2xl border border-slate-200 p-6">
              {/* Auction Header */}
              <div className="mb-6">
                <div className="flex items-center space-x-2 mb-2">
                  <MapPin className="w-5 h-5 text-blue-600" />
                  <h2 className="text-2xl font-bold text-slate-900">{selectedAuction.laneId}</h2>
                </div>
                <p className="text-slate-500 text-sm">
                  Auction ID: {selectedAuction.id}
                </p>
              </div>

              {/* Auction Stats */}
              <div className="grid grid-cols-2 gap-4 mb-6">
                <div className="bg-slate-50 rounded-lg p-4">
                  <p className="text-xs font-bold text-slate-500 uppercase">Lowest Bid</p>
                  <p className="text-2xl font-bold text-blue-600">
                    {getLowestBid(selectedAuction.id)
                      ? `₹${getLowestBid(selectedAuction.id)?.toLocaleString('en-IN')}`
                      : 'N/A'}
                  </p>
                </div>
                <div className="bg-slate-50 rounded-lg p-4">
                  <p className="text-xs font-bold text-slate-500 uppercase">Total Bids</p>
                  <p className="text-2xl font-bold text-slate-900">
                    {(auctionBids[selectedAuction.id] || []).length}
                  </p>
                </div>
              </div>

              {/* Your Bid Info */}
              {getVendorLastBid(selectedAuction.id) && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
                  <div className="flex items-center space-x-2 mb-2">
                    <CheckCircle2 className="w-5 h-5 text-blue-600" />
                    <p className="font-bold text-blue-900">Your Last Bid</p>
                  </div>
                  <p className="text-2xl font-bold text-blue-600">
                    ₹{getVendorLastBid(selectedAuction.id)?.amount.toLocaleString('en-IN')}
                  </p>
                  <p className="text-xs text-blue-700 mt-1">
                    {new Date(getVendorLastBid(selectedAuction.id)?.updatedAt || '').toLocaleString()}
                  </p>
                </div>
              )}

              {/* Bid Placement Form */}
              <div className="border-t border-slate-200 pt-6">
                <h3 className="font-bold text-slate-900 mb-4">Place a New Bid</h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-2">
                      Bid Amount (₹)
                    </label>
                    <input
                      type="number"
                      value={bidAmounts[selectedAuction.id] || ''}
                      onChange={(e) =>
                        setBidAmounts(prev => ({
                          ...prev,
                          [selectedAuction.id]: e.target.value
                        }))
                      }
                      placeholder="Enter amount"
                      className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      disabled={selectedAuction.status !== 'ACTIVE'}
                    />
                    {getVendorLastBid(selectedAuction.id) && (
                      <p className="text-xs text-slate-600 mt-1">
                        Must be lower than your previous bid: ₹{getVendorLastBid(selectedAuction.id)?.amount.toLocaleString('en-IN')}
                      </p>
                    )}
                    {getLowestBid(selectedAuction.id) && (
                      <p className="text-xs text-slate-600 mt-1">
                        Current lowest bid: ₹{getLowestBid(selectedAuction.id)?.toLocaleString('en-IN')}
                      </p>
                    )}
                  </div>

                  <button
                    onClick={() => handlePlaceBid(selectedAuction.id)}
                    disabled={
                      selectedAuction.status !== 'ACTIVE' ||
                      submitting[selectedAuction.id]
                    }
                    className={`w-full py-3 rounded-lg font-bold flex items-center justify-center space-x-2 transition-colors ${
                      selectedAuction.status !== 'ACTIVE' || submitting[selectedAuction.id]
                        ? 'bg-slate-300 text-slate-500 cursor-not-allowed'
                        : 'bg-blue-600 hover:bg-blue-700 text-white'
                    }`}
                  >
                    {submitting[selectedAuction.id] && (
                      <Loader className="w-4 h-4 animate-spin" />
                    )}
                    <TrendingDown className="w-5 h-5" />
                    <span>Place Bid</span>
                  </button>

                  {selectedAuction.status === 'CLOSED' && (
                    <p className="text-center text-sm font-bold text-red-600">
                      This auction is closed
                    </p>
                  )}
                </div>
              </div>

              {/* Bid History */}
              <div className="border-t border-slate-200 mt-6 pt-6">
                <h3 className="font-bold text-slate-900 mb-4">Recent Bids (Anonymous)</h3>
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {(auctionBids[selectedAuction.id] || []).slice(0, 10).map((bid, idx) => (
                    <div
                      key={bid.id}
                      className="flex items-center justify-between bg-slate-50 p-3 rounded-lg"
                    >
                      <div>
                        <p className="text-sm font-bold text-slate-900">#{idx + 1}</p>
                        <p className="text-xs text-slate-500">
                          {new Date(bid.createdAt).toLocaleTimeString()}
                        </p>
                      </div>
                      <p className="text-lg font-bold text-blue-600">
                        ₹{bid.amount.toLocaleString('en-IN')}
                      </p>
                    </div>
                  ))}
                  {(auctionBids[selectedAuction.id] || []).length === 0 && (
                    <p className="text-center text-slate-500 text-sm">No bids yet</p>
                  )}
                </div>
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

export default VendorAuctionConsole;
