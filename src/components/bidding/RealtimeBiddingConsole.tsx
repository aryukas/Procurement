// src/components/bidding/RealtimeBiddingConsole.tsx
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Activity,
  TrendingDown,
  Clock,
  Users,
  AlertCircle,
  CheckCircle2,
  Loader,
  Send,
  ArrowDown,
  Target,
  IndianRupee,
  Zap,
  Eye,
  Volume2
} from 'lucide-react';
import type { SimpleShipment, VendorBid, VendorBidStatus, User, LaneMaster } from '../../../types';
import { BiddingService } from '../../services/biddingService';
import { LaneService } from '../../services/laneService';

interface RealtimeBiddingConsoleProps {
  currentUser: User;
  shipmentId?: string;
}

interface BidWithTimestamp extends VendorBid {
  displayTime: string;
  isYourBid: boolean;
}

interface AuctionStats {
  totalBids: number;
  activeBidders: number;
  lowestBid: number;
  lowestBidder: string;
  highestBid: number;
  averageBid: number;
  bidRange: number;
}

const RealtimeBiddingConsole: React.FC<RealtimeBiddingConsoleProps> = ({
  currentUser,
  shipmentId
}) => {
  const [shipments, setShipments] = useState<SimpleShipment[]>([]);
  const [selectedShipment, setSelectedShipment] = useState<SimpleShipment | null>(null);
  const [allBids, setAllBids] = useState<VendorBid[]>([]);
  const [lanes, setLanes] = useState<LaneMaster[]>([]);
  const [newBidAmount, setNewBidAmount] = useState('');
  const [loading, setLoading] = useState(true);
  const [bidSubmitting, setBidSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [showBidHistory, setShowBidHistory] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);

  // Load shipments
  useEffect(() => {
    setLoading(true);
    const unsubscribe = BiddingService.listenToShipments((data) => {
      const openShipments = data.filter(s => s.status === 'OPEN');
      setShipments(openShipments);
      
      // If shipmentId provided, select it
      if (shipmentId) {
        const selected = openShipments.find(s => s.id === shipmentId);
        if (selected) setSelectedShipment(selected);
      } else if (openShipments.length > 0 && !selectedShipment) {
        setSelectedShipment(openShipments[0]);
      }
      
      setLoading(false);
    });

    return () => unsubscribe();
  }, [shipmentId]);

  // Load lanes
  useEffect(() => {
    const unsubscribe = LaneService.listenToActiveLanes((data) => {
      setLanes(data);
    });
    return () => unsubscribe?.();
  }, []);

  // Load bids for selected shipment
  useEffect(() => {
    if (!selectedShipment?.id) return;

    const unsubscribe = BiddingService.listenToBidsForShipment(selectedShipment.id, (bids) => {
      setAllBids(bids);
    });

    return () => unsubscribe();
  }, [selectedShipment?.id]);

  // Play sound on new bid
  useEffect(() => {
    if (soundEnabled && allBids.length > 0) {
      const audio = new Audio('data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAAB9AAACABAAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj==');
      audio.play().catch(() => {});
    }
  }, [allBids.length, soundEnabled]);

  // Feedback timeout
  useEffect(() => {
    if (feedback) {
      const timer = setTimeout(() => setFeedback(null), 4000);
      return () => clearTimeout(timer);
    }
  }, [feedback]);

  // Calculate stats
  const stats = useMemo<AuctionStats>(() => {
    if (allBids.length === 0) {
      return {
        totalBids: 0,
        activeBidders: 0,
        lowestBid: 0,
        lowestBidder: 'N/A',
        highestBid: 0,
        averageBid: 0,
        bidRange: 0
      };
    }

    const sortedBids = [...allBids].sort((a, b) => a.bidAmount - b.bidAmount);
    const lowest = sortedBids[0];
    const highest = sortedBids[sortedBids.length - 1];
    const uniqueVendors = new Set(allBids.map(b => b.vendorId)).size;
    const average = Math.round(allBids.reduce((sum, b) => sum + b.bidAmount, 0) / allBids.length);

    return {
      totalBids: allBids.length,
      activeBidders: uniqueVendors,
      lowestBid: lowest.bidAmount,
      lowestBidder: lowest.vendorName,
      highestBid: highest.bidAmount,
      averageBid: average,
      bidRange: highest.bidAmount - lowest.bidAmount
    };
  }, [allBids]);

  // Get your current bid
  const yourBid = useMemo(() => {
    return allBids.find(b => b.vendorId === currentUser.id);
  }, [allBids, currentUser.id]);

  // Get lane name
  const getLaneName = useCallback(() => {
    if (!selectedShipment) return '';
    const lane = lanes.find(
      l =>
        l.origin.toLowerCase() === selectedShipment.origin.toLowerCase() &&
        l.destination.toLowerCase() === selectedShipment.destination.toLowerCase()
    );
    return lane?.code || `${selectedShipment.origin} → ${selectedShipment.destination}`;
  }, [selectedShipment, lanes]);

  // Get sorted bids with timestamps
  const bidsWithTimestamps = useMemo<BidWithTimestamp[]>(() => {
    return allBids
      .map(bid => ({
        ...bid,
        displayTime: new Date(bid.createdAt).toLocaleTimeString(),
        isYourBid: bid.vendorId === currentUser.id
      }))
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [allBids, currentUser.id]);

  // Handle bid submission
  const handleSubmitBid = useCallback(async () => {
    if (!selectedShipment || !newBidAmount.trim()) {
      setFeedback({ type: 'error', text: 'Please enter a bid amount' });
      return;
    }

    const amount = parseInt(newBidAmount, 10);
    if (isNaN(amount) || amount <= 0) {
      setFeedback({ type: 'error', text: 'Bid must be a positive number' });
      return;
    }

    // Check if new bid should be lower than current lowest
    if (stats.lowestBid > 0 && amount >= stats.lowestBid) {
      setFeedback({
        type: 'error',
        text: `Bid must be lower than current lowest: ₹${stats.lowestBid.toLocaleString()}`
      });
      return;
    }

    setBidSubmitting(true);

    try {
      // If already has a bid, remove it first
      if (yourBid) {
        await BiddingService.rejectBid(yourBid.id);
      }

      // Place new bid
      const result = await BiddingService.placeBid({
        shipmentId: selectedShipment.id,
        vendorId: currentUser.id,
        vendorName: currentUser.name,
        bidAmount: amount
      });

      if (result.success) {
        setFeedback({ type: 'success', text: '🎉 Bid placed! You\'re now the lowest bidder!' });
        setNewBidAmount('');
      } else {
        setFeedback({ type: 'error', text: result.error?.message || 'Failed to place bid' });
      }
    } catch (error) {
      console.error('Error placing bid:', error);
      setFeedback({ type: 'error', text: 'An error occurred while placing the bid' });
    } finally {
      setBidSubmitting(false);
    }
  }, [selectedShipment, newBidAmount, currentUser, stats.lowestBid, yourBid]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader className="w-8 h-8 text-blue-600 animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-slate-800 mb-2 flex items-center space-x-2">
          <Zap className="w-8 h-8 text-yellow-500" />
          <span>Real-Time Bidding Console</span>
        </h1>
        <p className="text-slate-600">Live auction for available shipments</p>
      </div>

      {shipments.length === 0 ? (
        <div className="bg-white border-2 border-dashed border-slate-200 rounded-2xl p-16 text-center">
          <AlertCircle className="w-12 h-12 text-slate-300 mx-auto mb-4" />
          <h3 className="text-lg font-bold text-slate-800 mb-2">No Active Auctions</h3>
          <p className="text-slate-600">No open shipments available for bidding right now</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Shipment List */}
          <div className="lg:col-span-1">
            <div className="bg-white border border-slate-200 rounded-2xl p-4 sticky top-4 max-h-[80vh] overflow-y-auto">
              <h3 className="text-lg font-bold text-slate-800 mb-4">Available Auctions</h3>
              <div className="space-y-2">
                {shipments.map(shipment => (
                  <button
                    key={shipment.id}
                    onClick={() => setSelectedShipment(shipment)}
                    className={`w-full text-left p-3 rounded-lg transition-all border-2 ${
                      selectedShipment?.id === shipment.id
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    <div className="font-semibold text-sm text-slate-800">
                      {shipment.origin} → {shipment.destination}
                    </div>
                    <div className="text-xs text-slate-500 mt-1">{shipment.material}</div>
                    <div className="text-xs font-bold text-blue-600 mt-1">
                      {allBids.filter(b => b.shipmentId === shipment.id).length} bids
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Main Bidding Interface */}
          {selectedShipment && (
            <div className="lg:col-span-3 space-y-6">
              {/* Shipment Header */}
              <div className="bg-gradient-to-r from-blue-50 to-purple-50 border-2 border-blue-200 rounded-2xl p-6">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h2 className="text-2xl font-bold text-slate-800 mb-2">
                      {selectedShipment.origin} → {selectedShipment.destination}
                    </h2>
                    <p className="text-sm text-slate-600 flex items-center space-x-2">
                      <span className="font-semibold">{getLaneName()}</span>
                      <span>•</span>
                      <span>{selectedShipment.material}</span>
                      <span>•</span>
                      <span>{selectedShipment.capacity}</span>
                    </p>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Activity className="w-5 h-5 text-green-500 animate-pulse" />
                    <span className="text-sm font-bold text-green-600">LIVE</span>
                  </div>
                </div>

                {/* Quick Stats */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div>
                    <p className="text-xs text-slate-600 uppercase mb-1">Total Bids</p>
                    <p className="text-2xl font-bold text-blue-600">{stats.totalBids}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-600 uppercase mb-1">Active Bidders</p>
                    <p className="text-2xl font-bold text-purple-600 flex items-center space-x-1">
                      <Users className="w-5 h-5" />
                      <span>{stats.activeBidders}</span>
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-600 uppercase mb-1">Lowest Bid</p>
                    <p className="text-2xl font-bold text-emerald-600">
                      ₹{stats.lowestBid.toLocaleString()}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-600 uppercase mb-1">Average</p>
                    <p className="text-2xl font-bold text-slate-600">
                      ₹{stats.averageBid.toLocaleString()}
                    </p>
                  </div>
                </div>
              </div>

              {/* Current Leader */}
              {stats.lowestBid > 0 && (
                <div className={`border-2 rounded-2xl p-6 ${
                  yourBid && yourBid.vendorId === allBids[0]?.vendorId
                    ? 'bg-emerald-50 border-emerald-300'
                    : 'bg-amber-50 border-amber-300'
                }`}>
                  <div className="flex items-center space-x-3 mb-3">
                    <Target className="w-6 h-6 text-amber-600" />
                    <h3 className="text-lg font-bold text-slate-800">Current Leader</h3>
                  </div>
                  <div className="flex items-end justify-between">
                    <div>
                      <p className="text-sm text-slate-600">Lowest Bid by</p>
                      <p className="text-2xl font-bold text-slate-800">{stats.lowestBidder}</p>
                      {yourBid && yourBid.vendorId === allBids[0]?.vendorId && (
                        <p className="text-xs text-emerald-600 font-bold mt-2">
                          ✓ That's you! Keep it up!
                        </p>
                      )}
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-slate-600">Amount</p>
                      <p className="text-3xl font-bold text-emerald-600">
                        ₹{stats.lowestBid.toLocaleString()}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Your Bid Info */}
              {yourBid && (
                <div className="bg-blue-50 border-2 border-blue-300 rounded-2xl p-4">
                  <p className="text-sm font-semibold text-blue-700 flex items-center space-x-2">
                    <CheckCircle2 className="w-5 h-5" />
                    <span>Your Current Bid: ₹{yourBid.bidAmount.toLocaleString()}</span>
                  </p>
                  <p className="text-xs text-blue-600 mt-1">Status: {yourBid.status}</p>
                </div>
              )}

              {/* Bid Input Section */}
              <div className="bg-white border border-slate-200 rounded-2xl p-6">
                <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center space-x-2">
                  <Send className="w-5 h-5 text-blue-600" />
                  <span>Place Your Bid</span>
                </h3>

                <div className="space-y-4">
                  {stats.lowestBid > 0 && (
                    <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg flex items-start space-x-2">
                      <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                      <div className="text-sm text-amber-700">
                        <p className="font-semibold">Your bid must be lower than ₹{stats.lowestBid.toLocaleString()}</p>
                        <p className="text-xs mt-1">Current bid range: ₹{(stats.lowestBid - stats.bidRange).toLocaleString()} - ₹{stats.highestBid.toLocaleString()}</p>
                      </div>
                    </div>
                  )}

                  <div className="flex gap-3">
                    <div className="relative flex-1">
                      <IndianRupee className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                      <input
                        type="number"
                        placeholder={stats.lowestBid > 0 ? `Less than ₹${stats.lowestBid}` : 'Enter bid amount'}
                        value={newBidAmount}
                        onChange={e => setNewBidAmount(e.target.value)}
                        max={stats.lowestBid > 0 ? stats.lowestBid - 1 : undefined}
                        className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-300 rounded-lg text-lg focus:outline-none focus:ring-2 focus:ring-blue-500 font-semibold"
                      />
                    </div>
                    <button
                      onClick={handleSubmitBid}
                      disabled={bidSubmitting || !newBidAmount.trim()}
                      className="bg-blue-600 hover:bg-blue-700 disabled:bg-slate-400 disabled:cursor-not-allowed text-white px-8 py-3 rounded-lg font-bold transition-all flex items-center space-x-2 whitespace-nowrap"
                    >
                      {bidSubmitting ? (
                        <>
                          <Loader className="w-5 h-5 animate-spin" />
                          <span>Bidding...</span>
                        </>
                      ) : (
                        <>
                          <Zap className="w-5 h-5" />
                          <span>Place Bid</span>
                        </>
                      )}
                    </button>
                  </div>

                  {/* Suggested Bids */}
                  {stats.lowestBid > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {[
                        stats.lowestBid - 500,
                        stats.lowestBid - 1000,
                        stats.lowestBid - 5000
                      ].map((suggestedAmount, idx) => (
                        suggestedAmount > 0 && (
                          <button
                            key={idx}
                            onClick={() => setNewBidAmount(suggestedAmount.toString())}
                            className="text-xs px-3 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-full transition-all"
                          >
                            ₹{suggestedAmount.toLocaleString()}
                          </button>
                        )
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Feedback */}
              {feedback && (
                <div className={`p-4 rounded-lg text-sm font-medium flex items-center space-x-2 ${
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

              {/* Bid History */}
              <div className="bg-white border border-slate-200 rounded-2xl p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-bold text-slate-800 flex items-center space-x-2">
                    <Activity className="w-5 h-5 text-blue-600" />
                    <span>Live Bid Feed</span>
                  </h3>
                  <div className="flex items-center space-x-3">
                    <button
                      onClick={() => setSoundEnabled(!soundEnabled)}
                      className={`p-2 rounded-lg transition-all ${
                        soundEnabled
                          ? 'bg-blue-100 text-blue-600'
                          : 'bg-slate-100 text-slate-600'
                      }`}
                    >
                      <Volume2 className="w-5 h-5" />
                    </button>
                    <span className="text-xs text-slate-600">
                      {bidsWithTimestamps.length} bids
                    </span>
                  </div>
                </div>

                {bidsWithTimestamps.length === 0 ? (
                  <div className="text-center py-8 text-slate-500">
                    <Eye className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                    <p>No bids yet. Be the first!</p>
                  </div>
                ) : (
                  <div className="space-y-2 max-h-64 overflow-y-auto">
                    {bidsWithTimestamps.map((bid, idx) => (
                      <div
                        key={bid.id}
                        className={`p-3 rounded-lg border-2 transition-all ${
                          bid.isYourBid
                            ? 'bg-blue-50 border-blue-300'
                            : idx === 0
                            ? 'bg-emerald-50 border-emerald-300'
                            : 'bg-slate-50 border-slate-200'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-2 flex-1">
                            {idx === 0 && <TrendingDown className="w-4 h-4 text-emerald-600" />}
                            {bid.isYourBid && <CheckCircle2 className="w-4 h-4 text-blue-600" />}
                            <div>
                              <p className="font-semibold text-slate-800">
                                {bid.vendorName}
                                {bid.isYourBid && ' (You)'}
                              </p>
                              <p className="text-xs text-slate-500">{bid.displayTime}</p>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="font-bold text-slate-800">
                              ₹{bid.bidAmount.toLocaleString()}
                            </p>
                            <p className="text-xs text-slate-500">{bid.status}</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default RealtimeBiddingConsole;
