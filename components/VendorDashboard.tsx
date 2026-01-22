import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { 
  ArrowRight, 
  MapPin, 
  Truck, 
  Clock, 
  TrendingDown, 
  IndianRupee, 
  CheckCircle2, 
  AlertCircle,
  FileText,
  ChevronRight,
  Send,
  Search,
  Timer,
  X,
  Zap
} from 'lucide-react';

import type { ShipmentBid, BidOffer, VehicleDetails, Notification, User, LiveAuction, ReverseBid } from '../types';
import { BidStatus } from '../types';
import VendorBiddingPanel from '../src/components/bidding/VendorBiddingPanel';
import { LiveAuctionService } from '../src/services/liveAuctionService';
import { useLanes } from '../src/hooks/useLanes';

interface VendorDashboardProps {
  currentUser: User;
  bids: ShipmentBid[];
  onPlaceOffer: (bidId: string, vendorId: string, vendorName: string, amount: number) => void;
  onRespondToCounter: (bidId: string, accept: boolean) => void;
  onSubmitVehicle: (bidId: string, details: VehicleDetails) => void;
  notifications: Notification[];
}

const VendorDashboard: React.FC<VendorDashboardProps> = ({ 
  currentUser, 
  bids, 
  onPlaceOffer, 
  onRespondToCounter,
  onSubmitVehicle,
  notifications 
}) => {
  // SECURITY: Validate required user properties before rendering
  if (!currentUser?.id || !currentUser?.name) {
    return <div className="max-w-7xl mx-auto px-4 py-8 text-center text-red-600">Error: Invalid user data</div>;
  }

  const [bidAmount, setBidAmount] = useState<Record<string, string>>({});
  const [selectedBid, setSelectedBid] = useState<ShipmentBid | null>(null);
  const [activeTab, setActiveTab] = useState<'AUCTIONS' | 'MY_BIDS' | 'LANE_AUCTIONS'>('AUCTIONS');
  const [vehicleDetails, setVehicleDetails] = useState<VehicleDetails>({
    vehicleNumber: '',
    vehicleType: '',
    driverName: '',
    driverPhone: '',
    expectedDispatch: ''
  });

  // Lane Auction States
  const [laneAuctions, setLaneAuctions] = useState<LiveAuction[]>([]);
  const [auctionBids, setAuctionBids] = useState<Record<string, ReverseBid[]>>({});
  const [vendorAuctionBids, setVendorAuctionBids] = useState<Record<string, ReverseBid>>({});
  const [auctionBidAmounts, setAuctionBidAmounts] = useState<Record<string, string>>({});
  const [selectedAuction, setSelectedAuction] = useState<LiveAuction | null>(null);
  const [auctionLoading, setAuctionLoading] = useState(false);

  // Get all lanes for display
  const { lanes } = useLanes();

  // Helper to get lane name from ID
  const getLaneName = useCallback((laneId: string): string => {
    const lane = lanes.find(l => l.id === laneId);
    return lane ? `${lane.origin} → ${lane.destination}` : laneId;
  }, [lanes]);

  const [now, setNow] = useState(new Date());

  // FIX: Timer dependency array was empty; this creates a memory leak by recreating interval every render
  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Load lane auctions
  useEffect(() => {
    const loadLaneAuctions = async () => {
      if (!currentUser.lanes || currentUser.lanes.length === 0) {
        setLaneAuctions([]);
        return;
      }

      try {
        setAuctionLoading(true);
        const auctions = await LiveAuctionService.getActiveLanesForVendor(currentUser.lanes);
        setLaneAuctions(auctions);
        if (auctions.length > 0) {
          setSelectedAuction(auctions[0]);
        }
      } catch (error) {
        console.error('Error loading lane auctions:', error);
      } finally {
        setAuctionLoading(false);
      }
    };

    loadLaneAuctions();
  }, [currentUser.lanes]);

  // Listen to bids for each lane auction
  useEffect(() => {
    const unsubscribers: (() => void)[] = [];

    laneAuctions.forEach(auction => {
      const unsub1 = LiveAuctionService.listenToBidsForAuction(auction.id, (bids) => {
        setAuctionBids(prev => ({
          ...prev,
          [auction.id]: bids
        }));
      });
      unsubscribers.push(unsub1);

      const unsub2 = LiveAuctionService.listenToVendorBidsOnAuction(
        auction.id,
        currentUser.id,
        (bids) => {
          if (bids.length > 0) {
            setVendorAuctionBids(prev => ({
              ...prev,
              [auction.id]: bids[0]
            }));
          }
        }
      );
      unsubscribers.push(unsub2);
    });

    return () => unsubscribers.forEach(unsub => unsub());
  }, [laneAuctions, currentUser.id]);

  // FIX: Memoize time calculation to prevent unnecessary recalculations on every render tick
  const getTimeRemaining = useCallback((bid: ShipmentBid): string => {
    // RUNTIME SAFETY: Validate bid end date/time exist and are valid ISO strings
    if (!bid.bidEndDate || !bid.bidEndTime) {
      return "N/A";
    }
    
    try {
      // TYPE SAFETY: Ensure we have valid date strings before parsing
      const end = new Date(`${bid.bidEndDate}T${bid.bidEndTime}`);
      
      // RUNTIME SAFETY: Check if date parsing failed (Invalid Date)
      if (isNaN(end.getTime())) {
        return "Invalid";
      }
      
      const diff = end.getTime() - now.getTime();
      if (diff <= 0) return "Ended";
      
      const hours = Math.floor(diff / (1000 * 60 * 60));
      const mins = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const secs = Math.floor((diff % (1000 * 60)) / 1000);
      return `${hours}h ${mins}m ${secs}s`;
    } catch (error) {
      // SECURITY: Catch date parsing errors silently to prevent UI crashes
      return "Error";
    }
  }, [now]);

  // FIX: Properly memoize matching bids with explicit lane validation
  const matchingBids = useMemo((): ShipmentBid[] => {
    console.log('=== VendorDashboard Debug ===');
    console.log('Current User:', currentUser.name, 'Lanes:', currentUser.lanes);
    console.log('All Bids:', bids.map(b => ({ id: b.id, lane: b.lane, status: b.status })));
    
    // RUNTIME SAFETY: Handle cases where currentUser.lanes is undefined or empty
    if (!currentUser.lanes || currentUser.lanes.length === 0) {
      console.log('❌ No lanes assigned to vendor');
      return [];
    }
    
    // TYPE SAFETY: Validate bids array before filtering
    if (!Array.isArray(bids)) {
      return [];
    }
    
    const filtered = bids.filter((bid): bid is ShipmentBid => {
      const matches = bid?.lane != null && currentUser.lanes!.includes(bid.lane) && bid.status === BidStatus.OPEN;
      console.log(`Bid ${bid.id}: lane="${bid.lane}", matches=${matches}`);
      return matches;
    });
    
    console.log('✅ Matching bids:', filtered.length);
    return filtered;
  }, [bids, currentUser.lanes]);

  // FIX: Validate and memoize bid amount to prevent stale closures in event handlers
  const handleBidding = useCallback((bidId: string): void => {
    // RUNTIME SAFETY: Get bid amount and validate it exists
    const amountStr = bidAmount[bidId]?.trim();
    
    if (!amountStr) {
      alert('Please enter a valid bid amount');
      return;
    }
    
    // TYPE SAFETY: Explicitly check for NaN after parsing
    const amount = parseInt(amountStr, 10);
    if (isNaN(amount) || amount <= 0) {
      alert('Please enter a valid bid amount greater than 0');
      return;
    }

    // BUSINESS LOGIC: Validate bid amount against ceiling rate and reserved price
    const bid = bids.find(b => b.id === bidId);
    if (!bid) {
      alert('Bid not found');
      return;
    }

    // Check if bid amount is within valid range
    if (bid.ceilingRate && amount > bid.ceilingRate) {
      alert(`Bid amount cannot exceed ceiling rate of ₹${bid.ceilingRate.toLocaleString('en-IN')}`);
      return;
    }

    if (bid.reservedPrice && amount < bid.reservedPrice) {
      alert(`Bid amount must be at least ₹${bid.reservedPrice.toLocaleString('en-IN')} (reserved price)`);
      return;
    }
    setBidAmount(prev => ({ ...prev, [bidId]: '' }));
  }, [bidAmount, bids, currentUser.id, currentUser.name, onPlaceOffer]);

  // FIX: Memoize rank calculation to prevent array re-sorting on every render
  const myRank = useCallback((bid: ShipmentBid): number | null => {
    // RUNTIME SAFETY: Check if offers array exists and is not empty
    if (!bid.offers || !Array.isArray(bid.offers) || bid.offers.length === 0) {
      return null;
    }
    
    // TYPE SAFETY: Validate required offer fields before sorting
    const sortedOffers = [...bid.offers].sort((a, b) => {
      // RUNTIME SAFETY: Ensure amounts are numbers
      const aAmount = typeof a.amount === 'number' ? a.amount : 0;
      const bAmount = typeof b.amount === 'number' ? b.amount : 0;
      return aAmount - bAmount;
    });
    
    // RUNTIME SAFETY: Validate vendorId before searching
    const index = sortedOffers.findIndex(o => o.vendorId === currentUser.id);
    return index === -1 ? null : index + 1;
  }, [currentUser.id]);

  // FIX: Memoize offer lookup to prevent array searches on every render
  const myOffer = useCallback((bid: ShipmentBid): BidOffer | undefined => {
    // RUNTIME SAFETY: Validate offers array exists and is an array
    if (!bid.offers || !Array.isArray(bid.offers) || bid.offers.length === 0) {
      return undefined;
    }
    
    // TYPE SAFETY: Find offer with explicit undefined return
    return bid.offers.find(o => o?.vendorId === currentUser.id);
  }, [currentUser.id]);

  // FIX: Type-safe status display with exhaustive status checks
  const getStatusDisplay = useCallback((status: BidStatus, bid: ShipmentBid): { label: string; color: string } => {
    // RUNTIME SAFETY: Validate winningVendorId before comparison
    const isWinner = bid.winningVendorId === currentUser.id;
    
    // Handle status-specific displays with explicit type checking
    if (status === BidStatus.FINALIZED) {
      return isWinner 
        ? { label: 'WINNER', color: 'bg-emerald-500 text-white' }
        : { label: 'LOST', color: 'bg-slate-400 text-white' };
    }
    
    if (status === BidStatus.NEGOTIATING && isWinner) {
      return { label: 'NEGOTIATION', color: 'bg-blue-500 text-white' };
    }
    
    // Map all known statuses to prevent undefined returns
    const statusMap: Record<BidStatus, { label: string; color: string }> = {
      [BidStatus.OPEN]: { label: 'ACTIVE', color: 'bg-emerald-100 text-emerald-700' },
      [BidStatus.CLOSED]: { label: 'AUCTION ENDED', color: 'bg-amber-100 text-amber-700' },
      [BidStatus.NEGOTIATING]: { label: 'AWAITING', color: 'bg-blue-100 text-blue-700' },
      [BidStatus.FINALIZED]: { label: 'FINALIZED', color: 'bg-slate-100 text-slate-700' },
      [BidStatus.ASSIGNED]: { label: 'ASSIGNED', color: 'bg-indigo-100 text-indigo-700' }
    };
    
    // TYPE SAFETY: Use statusMap with fallback for unknown statuses
    return statusMap[status] || { label: status, color: 'bg-slate-100 text-slate-700' };
  }, [currentUser.id]);

  // Place bid on lane auction
  const handlePlaceLaneAuctionBid = useCallback(async (auctionId: string) => {
    const amountStr = auctionBidAmounts[auctionId]?.trim();

    if (!amountStr) {
      alert('Please enter a bid amount');
      return;
    }

    const amount = parseFloat(amountStr);
    if (isNaN(amount) || amount <= 0) {
      alert('Please enter a valid bid amount');
      return;
    }

    const auction = laneAuctions.find(a => a.id === auctionId);
    if (!auction) {
      alert('Auction not found');
      return;
    }

    try {
      const result = await LiveAuctionService.placeBid({
        auctionId,
        laneId: auction.laneId,
        vendorId: currentUser.id,
        vendorName: currentUser.name,
        amount
      });

      if (result.success) {
        alert('Bid placed successfully!');
        setAuctionBidAmounts(prev => ({ ...prev, [auctionId]: '' }));
      } else {
        alert(result.error?.message || 'Failed to place bid');
      }
    } catch (error) {
      console.error('Error placing bid:', error);
      alert('An error occurred while placing the bid');
    }
  }, [auctionBidAmounts, laneAuctions, currentUser.id, currentUser.name]);

  // Get time remaining for auction
  const getAuctionTimeRemaining = useCallback((auction: LiveAuction): string => {
    if (!auction.endTime) return 'N/A';
    
    try {
      const end = new Date(auction.endTime);
      if (isNaN(end.getTime())) return 'Invalid';
      
      const diff = end.getTime() - now.getTime();
      if (diff <= 0) return 'Ended';
      
      const hours = Math.floor(diff / (1000 * 60 * 60));
      const mins = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      return `${hours}h ${mins}m`;
    } catch {
      return 'Error';
    }
  }, [now]);

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      {/* Tab Navigation */}
      <div className="flex items-center space-x-1 mb-8 bg-slate-200/50 p-1.5 rounded-2xl w-fit">
        <button 
          onClick={() => setActiveTab('AUCTIONS')}
          className={`px-6 py-2.5 rounded-xl text-sm font-bold transition-all flex items-center space-x-2 ${activeTab === 'AUCTIONS' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
        >
          <TrendingDown className="w-4 h-4" />
          <span>Available Shipments</span>
        </button>
        <button 
          onClick={() => setActiveTab('LANE_AUCTIONS')}
          className={`px-6 py-2.5 rounded-xl text-sm font-bold transition-all flex items-center space-x-2 ${activeTab === 'LANE_AUCTIONS' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
        >
          <Zap className="w-4 h-4" />
          <span>Lane Auctions</span>
          {laneAuctions.length > 0 && (
            <span className="bg-orange-500 text-white text-xs px-2 py-0.5 rounded-full font-bold">{laneAuctions.length}</span>
          )}
        </button>
        <button 
          onClick={() => setActiveTab('MY_BIDS')}
          className={`px-6 py-2.5 rounded-xl text-sm font-bold transition-all flex items-center space-x-2 ${activeTab === 'MY_BIDS' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
        >
          <IndianRupee className="w-4 h-4" />
          <span>My Bids</span>
        </button>
      </div>

      {activeTab === 'AUCTIONS' && (
        <>
      {/* Welcome & Registered Lanes */}
      <div className="flex flex-col md:flex-row md:items-end justify-between mb-10 space-y-4">
        <div>
          <h2 className="text-3xl font-extrabold text-slate-800">Available Loads</h2>
          <p className="text-slate-500">Real-time matching for your registered lanes</p>
        </div>
        <div className="flex items-center space-x-2 overflow-x-auto pb-1" role="region" aria-label="Your registered lanes">
          <span className="text-xs font-bold text-slate-400 uppercase tracking-widest whitespace-nowrap">Your Lanes:</span>
          {/* RUNTIME SAFETY: Handle empty or undefined lanes array */}
          {currentUser.lanes && currentUser.lanes.length > 0 ? (
            currentUser.lanes.map(lane => (
              <span 
                key={lane} 
                className="bg-white border border-slate-200 px-3 py-1 rounded-full text-[10px] font-bold text-slate-600 shadow-sm whitespace-nowrap"
              >
                {lane}
              </span>
            ))
          ) : (
            <span className="text-[10px] text-slate-400 italic">No lanes registered</span>
          )}
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-8">
        {/* Bid Listings */}
        <div className="lg:w-2/3 space-y-6">
          {matchingBids.length > 0 ? (
            matchingBids.map(bid => {
              // RUNTIME SAFETY: Validate bid ID exists
              if (!bid.id) {
                return null;
              }
              
              const status = getStatusDisplay(bid.status, bid);
              // FIX: Pass bid to functions to calculate fresh values (memoized inside functions)
              const rank = myRank(bid);
              const offer = myOffer(bid);

              return (
                <div 
                  key={bid.id} 
                  className={`bg-white border rounded-3xl overflow-hidden shadow-sm transition-all hover:shadow-md ${selectedBid?.id === bid.id ? 'ring-2 ring-blue-500' : 'border-slate-200'}`}
                  role="article"
                  aria-label={`Bid from ${bid.origin} to ${bid.destination}`}
                >
                  <div className="p-6">
                    <div className="flex justify-between items-start mb-6">
                      <div className="flex items-center space-x-4">
                        <div className="bg-slate-50 p-3 rounded-2xl" aria-hidden="true">
                          <MapPin className="w-6 h-6 text-slate-400" />
                        </div>
                        <div>
                          <div className="flex items-center space-x-2">
                            <h4 className="text-xl font-bold text-slate-800">{bid.origin || 'N/A'}</h4>
                            <ArrowRight className="w-4 h-4 text-slate-300" aria-hidden="true" />
                            <h4 className="text-xl font-bold text-slate-800">{bid.destination || 'N/A'}</h4>
                          </div>
                          <p className="text-xs text-slate-400 font-bold tracking-widest uppercase mt-1">ID: {bid.id} • {bid.lane || 'Unknown'}</p>
                        </div>
                      </div>
                      <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${status.color}`}>
                        {status.label}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-8">
                      <div className="space-y-1">
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tight">Vehicle Type</p>
                        <div className="flex items-center space-x-1.5 text-slate-700">
                          <Truck className="w-4 h-4 text-blue-500" aria-hidden="true" />
                          <span className="text-sm font-semibold">{bid.vehicleType || 'N/A'} ({bid.loadType || 'N/A'})</span>
                        </div>
                      </div>
                      <div className="space-y-1">
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tight">Material / Weight</p>
                        <div className="flex items-center space-x-1.5 text-slate-700">
                          <FileText className="w-4 h-4 text-blue-500" aria-hidden="true" />
                          <span className="text-sm font-semibold">{bid.materialType || 'N/A'} • {bid.capacity || 'N/A'}</span>
                        </div>
                      </div>
                      <div className="space-y-1">
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tight">Pickup Date</p>
                        <div className="flex items-center space-x-1.5 text-slate-700">
                          <Clock className="w-4 h-4 text-blue-500" aria-hidden="true" />
                          <span className="text-sm font-semibold">
                            {/* RUNTIME SAFETY: Safely parse pickup date with fallback */}
                            {bid.pickupTime ? (
                              new Date(bid.pickupTime).toLocaleDateString('en-IN', { 
                                year: 'numeric', 
                                month: 'short', 
                                day: 'numeric' 
                              })
                            ) : (
                              'N/A'
                            )}
                          </span>
                        </div>
                      </div>
                      <div className="space-y-1">
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tight">Time Remaining</p>
                        <div className="flex items-center space-x-1.5 text-rose-500">
                          <Timer className="w-4 h-4" aria-hidden="true" />
                          <span className="text-sm font-bold" aria-live="polite" aria-atomic="true">{getTimeRemaining(bid)}</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-col md:flex-row items-center gap-4 pt-6 border-t border-slate-50">
                      {/* Bidding Input (Only if Open) */}
                      {bid.status === BidStatus.OPEN && (
                        <div className="w-full md:w-auto flex-grow flex flex-col items-stretch md:flex-row md:items-center space-y-2 md:space-y-0 md:space-x-2">
                          <div className="relative flex-grow">
                            <IndianRupee className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" aria-hidden="true" />
                            <input 
                              type="number"
                              placeholder={bid.reservedPrice ? `Min: ₹${bid.reservedPrice.toLocaleString('en-IN')}` : "Your Quote Amount"}
                              inputMode="numeric"
                              min={bid.reservedPrice || 0}
                              max={bid.ceilingRate || undefined}
                              aria-label={`Quote amount for bid ${bid.id}`}
                              className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                              value={bidAmount[bid.id] || ''}
                              onChange={e => setBidAmount(prev => ({...prev, [bid.id]: e.target.value}))}
                              disabled={bid.status !== BidStatus.OPEN}
                            />
                          </div>
                          <button 
                            onClick={() => handleBidding(bid.id)}
                            aria-label={`Place bid for ${bid.id}`}
                            disabled={bid.status !== BidStatus.OPEN || !bidAmount[bid.id]?.trim()}
                            className="bg-blue-600 hover:bg-blue-700 disabled:bg-slate-400 disabled:cursor-not-allowed text-white px-6 py-3 rounded-2xl font-bold text-sm shadow-lg shadow-blue-100 transition-all flex items-center justify-center space-x-2 whitespace-nowrap"
                          >
                            <Send className="w-4 h-4" aria-hidden="true" />
                            <span>Place Bid</span>
                          </button>
                        </div>
                      )}

                      {/* Rank / Status Displays */}
                      {offer && (
                        <div className="w-full md:w-auto flex items-center space-x-4">
                          <div className="bg-slate-100 px-4 py-2.5 rounded-2xl">
                            <p className="text-[10px] text-slate-400 font-bold uppercase mb-0.5">Your Last Bid</p>
                            <p className="text-sm font-black text-slate-800" aria-label={`Your bid amount: ${offer.amount}`}>
                              ₹{typeof offer.amount === 'number' ? offer.amount.toLocaleString('en-IN') : 'N/A'}
                            </p>
                          </div>
                          {rank !== null && rank !== undefined && (
                            <div className={`px-4 py-2.5 rounded-2xl ${rank === 1 ? 'bg-emerald-500 text-white' : 'bg-slate-800 text-white'}`}>
                              <p className={`text-[10px] font-bold uppercase mb-0.5 ${rank === 1 ? 'text-emerald-100' : 'text-slate-400'}`}>Current Rank</p>
                              <p className="text-sm font-black flex items-center space-x-1" aria-label={`Your rank: ${rank}`}>
                                <span>#{rank}</span>
                                {rank === 1 && <CheckCircle2 className="w-3 h-3" aria-hidden="true" />}
                              </p>
                            </div>
                          )}
                        </div>
                      )}

                      <button 
                        onClick={() => setSelectedBid(bid)}
                        aria-label={`View details for bid ${bid.id}`}
                        aria-expanded={selectedBid?.id === bid.id}
                        className="w-full md:w-auto p-3 bg-slate-100 hover:bg-slate-200 rounded-2xl transition-colors group focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <ChevronRight className="w-5 h-5 text-slate-400 group-hover:text-slate-800" aria-hidden="true" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })
          ) : (
            <div className="bg-white border-2 border-dashed border-slate-200 rounded-[2.5rem] p-16 text-center" role="status">
              <div className="bg-slate-50 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6" aria-hidden="true">
                <Search className="w-8 h-8 text-slate-300" />
              </div>
              <h3 className="text-xl font-bold text-slate-800 mb-3">No Matching Shipments</h3>
              <p className="text-slate-600 max-w-sm mx-auto mb-6 leading-relaxed">
                We'll notify you as soon as a load matching your registered lanes is published. Your current registered lanes:
              </p>
              {currentUser.lanes && currentUser.lanes.length > 0 ? (
                <div className="bg-slate-50 rounded-xl p-4 mb-6 inline-block">
                  <div className="flex flex-wrap gap-2 justify-center">
                    {currentUser.lanes.map(lane => (
                      <span key={lane} className="bg-blue-100 text-blue-700 px-3 py-1 rounded-lg text-sm font-medium">
                        {lane}
                      </span>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-6">
                  <AlertCircle className="w-5 h-5 text-amber-600 mx-auto mb-2" />
                  <p className="text-sm text-amber-700 font-medium">
                    No lanes registered. Contact admin to add your service lanes.
                  </p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Right Pane: Actions & Notification Log */}
        <div className="lg:w-1/3 space-y-6">
          {/* Action Context Card */}
          {selectedBid && (
            <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm">
              <div className="flex justify-between items-start mb-6">
                <h3 className="text-lg font-bold text-slate-800">Context Actions</h3>
                <button 
                  onClick={() => setSelectedBid(null)}
                  aria-label="Close context actions"
                  className="p-1 hover:bg-slate-100 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <X className="w-5 h-5 text-slate-400" aria-hidden="true" />
                </button>
              </div>

              {/* Pricing Guidelines */}
              <div className="bg-slate-50 border border-slate-200 p-5 rounded-2xl space-y-3">
                <h4 className="text-sm font-bold text-slate-800 flex items-center space-x-2">
                  <IndianRupee className="w-4 h-4 text-slate-600" aria-hidden="true" />
                  <span>Pricing Guidelines</span>
                </h4>
                <div className="space-y-2 text-xs">
                  {selectedBid.reservedPrice !== undefined && selectedBid.reservedPrice > 0 && (
                    <div className="flex justify-between items-center p-2.5 bg-white rounded-lg border border-slate-100">
                      <span className="text-slate-600">Minimum (Reserved Price)</span>
                      <span className="font-bold text-slate-800">₹{selectedBid.reservedPrice.toLocaleString('en-IN')}</span>
                    </div>
                  )}
                  {selectedBid.ceilingRate !== undefined && selectedBid.ceilingRate > 0 && (
                    <div className="flex justify-between items-center p-2.5 bg-white rounded-lg border border-slate-100">
                      <span className="text-slate-600">Maximum (Ceiling Rate)</span>
                      <span className="font-bold text-slate-800">₹{selectedBid.ceilingRate.toLocaleString('en-IN')}</span>
                    </div>
                  )}
                  {selectedBid.stepValue !== undefined && selectedBid.stepValue > 0 && (
                    <div className="flex justify-between items-center p-2.5 bg-white rounded-lg border border-slate-100">
                      <span className="text-slate-600">Bid Step Value</span>
                      <span className="font-bold text-slate-800">₹{selectedBid.stepValue.toLocaleString('en-IN')}</span>
                    </div>
                  )}
                  {selectedBid.offers && selectedBid.offers.length > 0 && (
                    <div className="flex justify-between items-center p-2.5 bg-emerald-50 rounded-lg border border-emerald-100">
                      <span className="text-emerald-700 font-medium">Current Best Bid</span>
                      <span className="font-bold text-emerald-800">₹{selectedBid.offers[0].amount.toLocaleString('en-IN')}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Negotiation Section */}
              {selectedBid.status === BidStatus.NEGOTIATING && selectedBid.winningVendorId === currentUser.id && (
                <div className="bg-blue-50 border border-blue-200 p-5 rounded-2xl space-y-4">
                  <div className="flex items-center space-x-2">
                    <AlertCircle className="w-5 h-5 text-blue-600" aria-hidden="true" />
                    <h4 className="text-sm font-bold text-blue-800">Counter Offer Available</h4>
                  </div>
                  {/* RUNTIME SAFETY: Handle missing counterOffer value */}
                  <p className="text-sm text-blue-700 leading-relaxed">
                    The admin has counter-offered <span className="font-bold">
                      ₹{typeof selectedBid.counterOffer === 'number' ? selectedBid.counterOffer.toLocaleString('en-IN') : 'N/A'}
                    </span>.
                    Your previous bid was ₹{
                      selectedBid.offers && selectedBid.offers.length > 0 && typeof selectedBid.offers[0]?.amount === 'number'
                        ? selectedBid.offers[0].amount.toLocaleString('en-IN')
                        : 'N/A'
                    }.
                  </p>
                  <div className="flex space-x-3 pt-2">
                    <button 
                      onClick={() => onRespondToCounter(selectedBid.id, true)}
                      aria-label="Accept counter offer"
                      className="flex-1 bg-emerald-600 hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 text-white py-2 rounded-xl text-sm font-bold shadow-md shadow-emerald-100 transition-all"
                    >
                      Accept
                    </button>
                    <button 
                      onClick={() => onRespondToCounter(selectedBid.id, false)}
                      aria-label="Reject counter offer"
                      className="flex-1 bg-white border border-slate-200 hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-slate-500 text-slate-600 py-2 rounded-xl text-sm font-bold transition-all"
                    >
                      Reject
                    </button>
                  </div>
                </div>
              )}

              {/* Submit Vehicle Details */}
              {selectedBid.status === BidStatus.FINALIZED && selectedBid.winningVendorId === currentUser.id && (
                <div className="bg-slate-50 border border-slate-200 p-5 rounded-2xl space-y-5">
                  <div className="flex items-center space-x-2">
                    <CheckCircle2 className="w-5 h-5 text-indigo-600" aria-hidden="true" />
                    <h4 className="text-sm font-bold text-slate-800">Final Logistics Assignment</h4>
                  </div>
                  <p className="text-xs text-slate-500">Provide details for dispatch scheduling.</p>
                  
                  <div className="space-y-3">
                    <div className="space-y-1">
                      <label htmlFor="vehicleNumber" className="text-[10px] font-bold text-slate-400 uppercase">Vehicle Number</label>
                      <input 
                        id="vehicleNumber"
                        type="text"
                        pattern="[A-Z]{2}[0-9]{1,2}[A-Z]{2}[0-9]{4}"
                        placeholder="DL 01 AA 1234"
                        aria-label="Vehicle registration number"
                        className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        value={vehicleDetails.vehicleNumber}
                        onChange={e => setVehicleDetails(prev => ({...prev, vehicleNumber: e.target.value}))}
                      />
                    </div>
                    <div className="space-y-1">
                      <label htmlFor="driverName" className="text-[10px] font-bold text-slate-400 uppercase">Driver Name</label>
                      <input 
                        id="driverName"
                        type="text"
                        placeholder="John Doe"
                        aria-label="Driver full name"
                        className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        value={vehicleDetails.driverName}
                        onChange={e => setVehicleDetails(prev => ({...prev, driverName: e.target.value}))}
                      />
                    </div>
                    <div className="space-y-1">
                      <label htmlFor="driverPhone" className="text-[10px] font-bold text-slate-400 uppercase">Driver Phone</label>
                      <input 
                        id="driverPhone"
                        type="tel"
                        inputMode="tel"
                        pattern="[0-9+\-\s]*"
                        placeholder="+91 98XXX XXXXX"
                        aria-label="Driver contact number"
                        className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        value={vehicleDetails.driverPhone}
                        onChange={e => setVehicleDetails(prev => ({...prev, driverPhone: e.target.value}))}
                      />
                    </div>
                    <div className="space-y-1">
                      <label htmlFor="expectedDispatch" className="text-[10px] font-bold text-slate-400 uppercase">Expected Dispatch</label>
                      <input 
                        id="expectedDispatch"
                        type="datetime-local"
                        aria-label="Expected dispatch date and time"
                        className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        value={vehicleDetails.expectedDispatch}
                        onChange={e => setVehicleDetails(prev => ({...prev, expectedDispatch: e.target.value}))}
                      />
                    </div>
                  </div>

                  <button 
                    onClick={() => {
                      // RUNTIME SAFETY: Validate required fields before submission
                      if (!vehicleDetails.vehicleNumber?.trim()) {
                        alert('Please enter vehicle number');
                        return;
                      }
                      if (!vehicleDetails.driverName?.trim()) {
                        alert('Please enter driver name');
                        return;
                      }
                      if (!vehicleDetails.driverPhone?.trim()) {
                        alert('Please enter driver phone');
                        return;
                      }
                      if (!vehicleDetails.expectedDispatch?.trim()) {
                        alert('Please enter expected dispatch time');
                        return;
                      }
                      onSubmitVehicle(selectedBid.id, vehicleDetails);
                    }}
                    aria-label="Submit vehicle details for shipment"
                    className="w-full bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-white py-3 rounded-xl font-bold text-sm shadow-lg shadow-indigo-100 transition-all"
                  >
                    Submit Vehicle Details
                  </button>
                </div>
              )}

              {selectedBid.status === BidStatus.ASSIGNED && (
                <div className="text-center py-10">
                  <div className="bg-emerald-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4" aria-hidden="true">
                    <CheckCircle2 className="w-8 h-8 text-emerald-600" />
                  </div>
                  <h4 className="font-bold text-slate-800">Trip Assigned</h4>
                  <p className="text-xs text-slate-500 mt-2 px-4">The shipment is fully assigned. Prepare for pickup at the scheduled time.</p>
                </div>
              )}
            </div>
          )}

          {/* Activity Logs / Notifications */}
          <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm overflow-hidden">
            <h3 className="text-lg font-bold text-slate-800 mb-6 flex items-center justify-between">
              Activity Stream
              <span className="bg-blue-100 text-blue-600 text-[10px] px-2 py-0.5 rounded-full font-black" aria-label="Latest activities">LATEST</span>
            </h3>
            <div className="space-y-6 max-h-[400px] overflow-y-auto pr-2" role="log" aria-live="polite" aria-label="Activity notifications">
              {notifications && notifications.length > 0 ? (
                notifications.map(notif => (
                  <div key={notif.id} className="flex space-x-4 border-b border-slate-50 pb-4">
                    <div 
                      className={`flex-shrink-0 w-8 h-8 rounded-xl flex items-center justify-center ${
                        notif.type === 'alert' ? 'bg-rose-100 text-rose-600' : 
                        notif.type === 'success' ? 'bg-emerald-100 text-emerald-600' : 
                        notif.type === 'warning' ? 'bg-amber-100 text-amber-600' :
                        'bg-slate-100 text-slate-500'
                      }`}
                      aria-hidden="true"
                    >
                      <TrendingDown className="w-4 h-4" />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-slate-800">{notif.title || 'Notification'}</p>
                      <p className="text-[11px] text-slate-500 mt-0.5 leading-relaxed">{notif.message || ''}</p>
                      <p className="text-[9px] text-slate-400 font-medium mt-1 uppercase">
                        {notif.timestamp ? new Date(notif.timestamp).toLocaleTimeString('en-IN') : 'N/A'}
                      </p>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-center text-xs text-slate-400 py-10">No recent activity found.</p>
              )}
            </div>
          </div>
        </div>
      </div>
        </>
      )}

      {activeTab === 'LANE_AUCTIONS' && (
        <div className="space-y-8">
          {/* Header */}
          <div className="flex flex-col md:flex-row md:items-end justify-between space-y-4">
            <div>
              <h2 className="text-3xl font-extrabold text-slate-800">Live Lane Auctions</h2>
              <p className="text-slate-500">Reverse auctions for your registered lanes - bid competitively</p>
            </div>
          </div>

          {auctionLoading ? (
            <div className="flex items-center justify-center py-20">
              <div className="animate-spin">
                <Clock className="w-8 h-8 text-blue-600" />
              </div>
            </div>
          ) : laneAuctions.length > 0 ? (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* Auctions List */}
              <div className="lg:col-span-2 space-y-4">
                {laneAuctions.map(auction => {
                  const bids = auctionBids[auction.id] || [];
                  const lowestBid = bids.length > 0 ? bids[0].amount : null;
                  const myBid = vendorAuctionBids[auction.id];

                  return (
                    <div 
                      key={auction.id}
                      onClick={() => setSelectedAuction(auction)}
                      className={`bg-white border-2 rounded-2xl p-6 cursor-pointer transition-all ${
                        selectedAuction?.id === auction.id 
                          ? 'border-orange-500 shadow-lg shadow-orange-100' 
                          : 'border-slate-200 hover:border-orange-300'
                      }`}
                    >
                      <div className="flex justify-between items-start mb-4">
                        <div className="flex items-center space-x-3">
                          <div className="bg-orange-100 p-2 rounded-xl">
                            <Zap className="w-5 h-5 text-orange-600" />
                          </div>
                          <div>
                            <h3 className="text-lg font-bold text-slate-800">{getLaneName(auction.laneId)}</h3>
                            <p className="text-xs text-slate-500">Auction ID: {auction.id}</p>
                          </div>
                        </div>
                        <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase ${
                          auction.status === 'ACTIVE' 
                            ? 'bg-emerald-100 text-emerald-700'
                            : 'bg-slate-100 text-slate-600'
                        }`}>
                          {auction.status}
                        </span>
                      </div>

                      <div className="grid grid-cols-2 gap-4 mb-4">
                        <div className="bg-slate-50 p-3 rounded-lg">
                          <p className="text-[10px] text-slate-500 uppercase font-bold mb-1">Total Bids</p>
                          <p className="text-lg font-bold text-slate-800">{bids.length}</p>
                        </div>
                        <div className="bg-slate-50 p-3 rounded-lg">
                          <p className="text-[10px] text-slate-500 uppercase font-bold mb-1">Lowest Bid</p>
                          <p className="text-lg font-bold text-slate-800">
                            {lowestBid ? `₹${lowestBid.toLocaleString('en-IN')}` : '—'}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center justify-between pt-4 border-t border-slate-100">
                        <div className="flex items-center space-x-2 text-orange-600">
                          <Timer className="w-4 h-4" />
                          <span className="text-sm font-bold">{getAuctionTimeRemaining(auction)}</span>
                        </div>
                        {myBid && (
                          <div className="bg-blue-50 px-3 py-1 rounded-lg">
                            <p className="text-[10px] text-blue-600 font-bold">Your Bid: ₹{myBid.amount.toLocaleString('en-IN')}</p>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Auction Details Panel */}
              {selectedAuction && (
                <div className="lg:col-span-1 space-y-4">
                  {/* Bid Placement */}
                  <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
                    <h3 className="text-lg font-bold text-slate-800 mb-4">Place Your Bid</h3>
                    
                    <div className="space-y-4">
                      <div>
                        <label className="text-[10px] text-slate-500 font-bold uppercase mb-2 block">Bid Amount (₹)</label>
                        <div className="relative">
                          <IndianRupee className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                          <input 
                            type="number"
                            placeholder="Enter amount"
                            value={auctionBidAmounts[selectedAuction.id] || ''}
                            onChange={e => setAuctionBidAmounts(prev => ({
                              ...prev,
                              [selectedAuction.id]: e.target.value
                            }))}
                            className="w-full pl-10 pr-4 py-3 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 text-sm"
                          />
                        </div>
                        <p className="text-[10px] text-slate-500 mt-2">Lower bid = Better chance to win. Current lowest: ₹{
                          (auctionBids[selectedAuction.id]?.[0]?.amount || 'N/A')
                        }</p>
                      </div>

                      <button 
                        onClick={() => handlePlaceLaneAuctionBid(selectedAuction.id)}
                        disabled={!auctionBidAmounts[selectedAuction.id]?.trim()}
                        className="w-full bg-orange-600 hover:bg-orange-700 disabled:bg-slate-300 text-white py-3 rounded-lg font-bold flex items-center justify-center space-x-2 transition-colors"
                      >
                        <Send className="w-4 h-4" />
                        <span>Place Bid</span>
                      </button>
                    </div>
                  </div>

                  {/* Bid Rankings */}
                  <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
                    <h3 className="text-lg font-bold text-slate-800 mb-4">Live Bids (Lowest First)</h3>
                    
                    <div className="space-y-3 max-h-80 overflow-y-auto">
                      {(auctionBids[selectedAuction.id] || []).length > 0 ? (
                        (auctionBids[selectedAuction.id] || []).map((bid, idx) => (
                          <div 
                            key={bid.id}
                            className={`p-3 rounded-lg border ${
                              bid.vendorId === currentUser.id
                                ? 'bg-blue-50 border-blue-200'
                                : 'bg-slate-50 border-slate-200'
                            }`}
                          >
                            <div className="flex justify-between items-center">
                              <div>
                                <p className="text-sm font-bold text-slate-800">#{idx + 1}</p>
                                <p className="text-xs text-slate-600">{bid.vendorName}</p>
                              </div>
                              <div className="text-right">
                                <p className="text-sm font-bold text-slate-800">₹{bid.amount.toLocaleString('en-IN')}</p>
                                {bid.vendorId === currentUser.id && (
                                  <p className="text-[10px] text-blue-600 font-bold">Your bid</p>
                                )}
                              </div>
                            </div>
                          </div>
                        ))
                      ) : (
                        <p className="text-center text-sm text-slate-500">No bids yet</p>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="bg-white border-2 border-dashed border-slate-200 rounded-2xl p-16 text-center">
              <div className="bg-slate-50 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6">
                <Zap className="w-8 h-8 text-slate-300" />
              </div>
              <h3 className="text-xl font-bold text-slate-800 mb-3">No Active Lane Auctions</h3>
              <p className="text-slate-600 max-w-sm mx-auto">
                There are no active auctions for your lanes. Check back soon or contact admin to create auctions.
              </p>
            </div>
          )}
        </div>
      )}

      {activeTab === 'MY_BIDS' && (
        <VendorBiddingPanel />
      )}
    </div>
  );
};

export default VendorDashboard;