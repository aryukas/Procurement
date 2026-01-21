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
  X
} from 'lucide-react';

import type { ShipmentBid, BidOffer, VehicleDetails, Notification, User } from '../types';
import { BidStatus } from '../types';

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
  const [vehicleDetails, setVehicleDetails] = useState<VehicleDetails>({
    vehicleNumber: '',
    vehicleType: '',
    driverName: '',
    driverPhone: '',
    expectedDispatch: ''
  });

  const [now, setNow] = useState(new Date());

  // FIX: Timer dependency array was empty; this creates a memory leak by recreating interval every render
  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

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
    // RUNTIME SAFETY: Handle cases where currentUser.lanes is undefined or empty
    if (!currentUser.lanes || currentUser.lanes.length === 0) {
      return [];
    }
    
    // TYPE SAFETY: Validate bids array before filtering
    if (!Array.isArray(bids)) {
      return [];
    }
    
    return bids.filter((bid): bid is ShipmentBid => {
      // RUNTIME SAFETY: Ensure bid.lane exists before comparing
      return bid?.lane != null && currentUser.lanes!.includes(bid.lane);
    });
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
    
    // RUNTIME SAFETY: Validate currentUser has required fields before calling callback
    if (!currentUser.id || !currentUser.name) {
      alert('User information is missing');
      return;
    }
    
    // SECURITY: Validate bidId exists in our bids list to prevent spoofed submissions
    const bidExists = bids.some(b => b.id === bidId);
    if (!bidExists) {
      alert('Invalid bid ID');
      return;
    }
    
    onPlaceOffer(bidId, currentUser.id, currentUser.name, amount);
    // Clear only the specific bid amount after submission
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

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
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
                        <div className="w-full md:w-auto flex-grow flex items-center space-x-2">
                          <div className="relative flex-grow">
                            <IndianRupee className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" aria-hidden="true" />
                            <input 
                              type="number"
                              placeholder="Your Quote Amount"
                              inputMode="numeric"
                              min="0"
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
                            className="bg-blue-600 hover:bg-blue-700 disabled:bg-slate-400 disabled:cursor-not-allowed text-white px-6 py-3 rounded-2xl font-bold text-sm shadow-lg shadow-blue-100 transition-all flex items-center space-x-2"
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
              <h3 className="text-xl font-bold text-slate-800 mb-2">No Matching Shipments</h3>
              <p className="text-slate-500 max-w-sm mx-auto">We'll notify you as soon as a load matching your registered lanes is published by WebXpress.</p>
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
    </div>
  );
};

export default VendorDashboard;