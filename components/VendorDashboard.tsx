import React, { useState, useMemo, useEffect } from 'react';
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
  Timer
} from 'lucide-react';
import { ref, onValue, push, set, update, get, getDatabase } from 'firebase/database';
import { initializeApp } from 'firebase/app';

// Initialize Firebase inline
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  databaseURL: import.meta.env.VITE_FIREBASE_DATABASE_URL,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID
};

const app = initializeApp(firebaseConfig);
const database = getDatabase(app);

// Type definitions
enum BidStatus {
  OPEN = 'OPEN',
  CLOSED = 'CLOSED',
  NEGOTIATING = 'NEGOTIATING',
  FINALIZED = 'FINALIZED',
  ASSIGNED = 'ASSIGNED'
}

interface BidOffer {
  vendorId: string;
  vendorName: string;
  amount: number;
  timestamp: number;
}

interface VehicleDetails {
  vehicleNumber: string;
  vehicleType: string;
  driverName: string;
  driverPhone: string;
  expectedDispatch: string;
}

interface ShipmentBid {
  id: string;
  origin: string;
  destination: string;
  lane: string;
  vehicleType: string;
  loadType: string;
  materialType: string;
  capacity: string;
  pickupTime: number;
  status: BidStatus;
  offers: BidOffer[];
  winningVendorId?: string;
  counterOffer?: number;
  finalAmount?: number;
  vehicleDetailsSubmitted?: boolean;
}

interface User {
  id: string;
  name: string;
  email: string;
  role: 'admin' | 'vendor';
  lanes?: string[];
}

interface Notification {
  id: string;
  type: 'success' | 'alert' | 'info';
  title: string;
  message: string;
  timestamp: number;
  read?: boolean;
}

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
  const [bidAmount, setBidAmount] = useState<{[key: string]: string}>({});
  const [selectedBid, setSelectedBid] = useState<ShipmentBid | null>(null);
  const [vehicleDetails, setVehicleDetails] = useState<VehicleDetails>({
    vehicleNumber: '',
    vehicleType: '',
    driverName: '',
    driverPhone: '',
    expectedDispatch: ''
  });

  // Firebase State
  const [firebaseBids, setFirebaseBids] = useState<ShipmentBid[]>([]);
  const [firebaseNotifications, setFirebaseNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);

  // Listen to Firebase Bids in Real-time
  useEffect(() => {
    const bidsRef = ref(database, 'bids');
    const unsubscribe = onValue(bidsRef, (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.val();
        const bidsArray: ShipmentBid[] = Object.keys(data).map(key => ({
          id: key,
          ...data[key],
          offers: data[key].offers || []
        }));
        setFirebaseBids(bidsArray);
      } else {
        setFirebaseBids([]);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // Listen to Firebase Notifications in Real-time
  useEffect(() => {
    const notificationsRef = ref(database, `notifications/${currentUser.id}`);
    const unsubscribe = onValue(notificationsRef, (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.val();
        const notifArray: Notification[] = Object.keys(data).map(key => ({
          id: key,
          ...data[key]
        }));
        setFirebaseNotifications(notifArray.sort((a, b) => b.timestamp - a.timestamp));
      } else {
        setFirebaseNotifications([]);
      }
    });

    return () => unsubscribe();
  }, [currentUser.id]);

  // Merge local and Firebase bids
  const allBids = useMemo(() => {
    return [...bids, ...firebaseBids];
  }, [bids, firebaseBids]);

  // Merge local and Firebase notifications
  const allNotifications = useMemo(() => {
    return [...notifications, ...firebaseNotifications];
  }, [notifications, firebaseNotifications]);

  // Filter bids by lane
  const matchingBids = useMemo(() => {
    return allBids.filter(bid => currentUser.lanes?.includes(bid.lane));
  }, [allBids, currentUser.lanes]);

  // Firebase: Place Bid
  const handleBiddingFirebase = async (bidId: string) => {
    const amount = parseInt(bidAmount[bidId]);
    if (!amount || isNaN(amount)) {
      alert('Please enter a valid bid amount');
      return;
    }

    try {
      const bidRef = ref(database, `bids/${bidId}`);
      const snapshot = await get(bidRef);
      
      if (snapshot.exists()) {
        const bidData = snapshot.val();
        const existingOffers: BidOffer[] = bidData.offers || [];
        
        const newOffer: BidOffer = {
          vendorId: currentUser.id,
          vendorName: currentUser.name,
          amount: amount,
          timestamp: Date.now()
        };

        await update(bidRef, {
          offers: [...existingOffers, newOffer]
        });

        // Create notification
        await createNotification(
          currentUser.id,
          'success',
          'Bid Placed Successfully',
          `Your bid of ₹${amount.toLocaleString()} has been placed for shipment ${bidId}`
        );

        setBidAmount({...bidAmount, [bidId]: ''});
      }
    } catch (error) {
      console.error('Error placing bid:', error);
      alert('Failed to place bid. Please try again.');
    }
  };

  // Firebase: Respond to Counter Offer
  const handleRespondToCounterFirebase = async (bidId: string, accept: boolean) => {
    try {
      const bidRef = ref(database, `bids/${bidId}`);
      
      if (accept) {
        await update(bidRef, {
          status: BidStatus.FINALIZED,
          finalAmount: selectedBid?.counterOffer || 0
        });

        await createNotification(
          currentUser.id,
          'success',
          'Counter Offer Accepted',
          `You have accepted the counter offer of ₹${selectedBid?.counterOffer?.toLocaleString()}`
        );
      } else {
        await update(bidRef, {
          status: BidStatus.OPEN,
          counterOffer: null,
          winningVendorId: null
        });

        await createNotification(
          currentUser.id,
          'info',
          'Counter Offer Rejected',
          'The counter offer has been rejected. The bid is now open again.'
        );
      }

      setSelectedBid(null);
    } catch (error) {
      console.error('Error responding to counter offer:', error);
      alert('Failed to respond. Please try again.');
    }
  };

  // Firebase: Submit Vehicle Details
  const handleSubmitVehicleFirebase = async (bidId: string, details: VehicleDetails) => {
    if (!details.vehicleNumber || !details.driverName || !details.driverPhone || !details.expectedDispatch) {
      alert('Please fill in all vehicle details');
      return;
    }

    try {
      const vehicleRef = ref(database, `vehicleDetails/${bidId}`);
      await set(vehicleRef, {
        ...details,
        vendorId: currentUser.id,
        submittedAt: Date.now()
      });

      const bidRef = ref(database, `bids/${bidId}`);
      await update(bidRef, {
        status: BidStatus.ASSIGNED,
        vehicleDetailsSubmitted: true
      });

      await createNotification(
        currentUser.id,
        'success',
        'Vehicle Details Submitted',
        `Vehicle details for shipment ${bidId} have been submitted successfully`
      );

      setVehicleDetails({
        vehicleNumber: '',
        vehicleType: '',
        driverName: '',
        driverPhone: '',
        expectedDispatch: ''
      });
      setSelectedBid(null);
    } catch (error) {
      console.error('Error submitting vehicle details:', error);
      alert('Failed to submit vehicle details. Please try again.');
    }
  };

  // Create Notification
  const createNotification = async (
    userId: string, 
    type: 'success' | 'alert' | 'info', 
    title: string, 
    message: string
  ) => {
    try {
      const notifRef = ref(database, `notifications/${userId}`);
      const newNotifRef = push(notifRef);
      await set(newNotifRef, {
        type,
        title,
        message,
        timestamp: Date.now(),
        read: false
      });
    } catch (error) {
      console.error('Error creating notification:', error);
    }
  };

  const handleBidding = (bidId: string) => {
    handleBiddingFirebase(bidId);
  };

  const myRank = (bid: ShipmentBid) => {
    if (!bid.offers || bid.offers.length === 0) return null;
    const sortedOffers = [...bid.offers].sort((a, b) => a.amount - b.amount);
    const index = sortedOffers.findIndex(o => o.vendorId === currentUser.id);
    return index === -1 ? null : index + 1;
  };

  const myOffer = (bid: ShipmentBid) => {
    if (!bid.offers || bid.offers.length === 0) return undefined;
    return bid.offers.find(o => o.vendorId === currentUser.id);
  };

  const getStatusDisplay = (status: BidStatus, bid: ShipmentBid) => {
    const winner = bid.winningVendorId === currentUser.id;
    if (status === BidStatus.FINALIZED && winner) return { label: 'WINNER', color: 'bg-emerald-500 text-white' };
    if (status === BidStatus.FINALIZED && !winner) return { label: 'LOST', color: 'bg-slate-400 text-white' };
    if (status === BidStatus.NEGOTIATING && bid.winningVendorId === currentUser.id) return { label: 'NEGOTIATION', color: 'bg-blue-500 text-white' };
    
    switch (status) {
      case BidStatus.OPEN: return { label: 'ACTIVE', color: 'bg-emerald-100 text-emerald-700' };
      case BidStatus.CLOSED: return { label: 'AUCTION ENDED', color: 'bg-amber-100 text-amber-700' };
      default: return { label: status, color: 'bg-slate-100 text-slate-700' };
    }
  };

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="flex items-center justify-center h-96">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-slate-600">Loading shipments...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      {/* Welcome & Registered Lanes */}
      <div className="flex flex-col md:flex-row md:items-end justify-between mb-10 space-y-4">
        <div>
          <h2 className="text-3xl font-extrabold text-slate-800">Available Loads</h2>
          <p className="text-slate-500">Real-time matching for your registered lanes</p>
        </div>
        <div className="flex items-center space-x-2 overflow-x-auto pb-1">
          <span className="text-xs font-bold text-slate-400 uppercase tracking-widest whitespace-nowrap">Your Lanes:</span>
          {currentUser.lanes?.map(lane => (
            <span key={lane} className="bg-white border border-slate-200 px-3 py-1 rounded-full text-[10px] font-bold text-slate-600 shadow-sm whitespace-nowrap">
              {lane}
            </span>
          ))}
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-8">
        {/* Bid Listings */}
        <div className="lg:w-2/3 space-y-6">
          {matchingBids.length > 0 ? (
            matchingBids.map(bid => {
              const status = getStatusDisplay(bid.status, bid);
              const rank = myRank(bid);
              const offer = myOffer(bid);

              return (
                <div 
                  key={bid.id} 
                  className={`bg-white border rounded-3xl overflow-hidden shadow-sm transition-all hover:shadow-md ${selectedBid?.id === bid.id ? 'ring-2 ring-blue-500' : 'border-slate-200'}`}
                >
                  <div className="p-6">
                    <div className="flex justify-between items-start mb-6">
                      <div className="flex items-center space-x-4">
                        <div className="bg-slate-50 p-3 rounded-2xl">
                          <MapPin className="w-6 h-6 text-slate-400" />
                        </div>
                        <div>
                          <div className="flex items-center space-x-2">
                            <h4 className="text-xl font-bold text-slate-800">{bid.origin}</h4>
                            <ArrowRight className="w-4 h-4 text-slate-300" />
                            <h4 className="text-xl font-bold text-slate-800">{bid.destination}</h4>
                          </div>
                          <p className="text-xs text-slate-400 font-bold tracking-widest uppercase mt-1">ID: {bid.id} • {bid.lane}</p>
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
                          <Truck className="w-4 h-4 text-blue-500" />
                          <span className="text-sm font-semibold">{bid.vehicleType} ({bid.loadType})</span>
                        </div>
                      </div>
                      <div className="space-y-1">
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tight">Material / Weight</p>
                        <div className="flex items-center space-x-1.5 text-slate-700">
                          <FileText className="w-4 h-4 text-blue-500" />
                          <span className="text-sm font-semibold">{bid.materialType} • {bid.capacity}</span>
                        </div>
                      </div>
                      <div className="space-y-1">
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tight">Pickup Date</p>
                        <div className="flex items-center space-x-1.5 text-slate-700">
                          <Clock className="w-4 h-4 text-blue-500" />
                          <span className="text-sm font-semibold">{new Date(bid.pickupTime).toLocaleDateString()}</span>
                        </div>
                      </div>
                      <div className="space-y-1">
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tight">Time Remaining</p>
                        <div className="flex items-center space-x-1.5 text-rose-500">
                          <Timer className="w-4 h-4" />
                          <span className="text-sm font-bold">4h 22m</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-col md:flex-row items-center gap-4 pt-6 border-t border-slate-50">
                      {/* Bidding Input (Only if Open) */}
                      {bid.status === BidStatus.OPEN && (
                        <div className="w-full md:w-auto flex-grow flex items-center space-x-2">
                          <div className="relative flex-grow">
                            <IndianRupee className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                            <input 
                              type="number"
                              placeholder="Your Quote Amount"
                              className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                              value={bidAmount[bid.id] || ''}
                              onChange={e => setBidAmount({...bidAmount, [bid.id]: e.target.value})}
                            />
                          </div>
                          <button 
                            onClick={() => handleBidding(bid.id)}
                            className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-2xl font-bold text-sm shadow-lg shadow-blue-100 transition-all flex items-center space-x-2"
                          >
                            <Send className="w-4 h-4" />
                            <span>Place Bid</span>
                          </button>
                        </div>
                      )}

                      {/* Rank / Status Displays */}
                      {offer && (
                        <div className="w-full md:w-auto flex items-center space-x-4">
                          <div className="bg-slate-100 px-4 py-2.5 rounded-2xl">
                            <p className="text-[10px] text-slate-400 font-bold uppercase mb-0.5">Your Last Bid</p>
                            <p className="text-sm font-black text-slate-800">₹{offer.amount.toLocaleString()}</p>
                          </div>
                          {rank && (
                            <div className={`px-4 py-2.5 rounded-2xl ${rank === 1 ? 'bg-emerald-500 text-white' : 'bg-slate-800 text-white'}`}>
                              <p className={`text-[10px] font-bold uppercase mb-0.5 ${rank === 1 ? 'text-emerald-100' : 'text-slate-400'}`}>Current Rank</p>
                              <p className="text-sm font-black flex items-center space-x-1">
                                <span>#{rank}</span>
                                {rank === 1 && <CheckCircle2 className="w-3 h-3" />}
                              </p>
                            </div>
                          )}
                        </div>
                      )}

                      <button 
                        onClick={() => setSelectedBid(bid)}
                        className="w-full md:w-auto p-3 bg-slate-100 hover:bg-slate-200 rounded-2xl transition-colors group"
                      >
                        <ChevronRight className="w-5 h-5 text-slate-400 group-hover:text-slate-800" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })
          ) : (
            <div className="bg-white border-2 border-dashed border-slate-200 rounded-[2.5rem] p-16 text-center">
              <div className="bg-slate-50 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6">
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
                <button onClick={() => setSelectedBid(null)} className="p-1 hover:bg-slate-100 rounded-lg">
                  <IndianRupee className="w-5 h-5 text-slate-400" />
                </button>
              </div>

              {/* Negotiation Section */}
              {selectedBid.status === BidStatus.NEGOTIATING && selectedBid.winningVendorId === currentUser.id && (
                <div className="bg-blue-50 border border-blue-200 p-5 rounded-2xl space-y-4">
                  <div className="flex items-center space-x-2">
                    <AlertCircle className="w-5 h-5 text-blue-600" />
                    <h4 className="text-sm font-bold text-blue-800">Counter Offer Available</h4>
                  </div>
                  <p className="text-sm text-blue-700 leading-relaxed">
                    The admin has counter-offered <span className="font-bold">₹{selectedBid.counterOffer?.toLocaleString()}</span>. 
                    Your previous bid was ₹{selectedBid.offers[0]?.amount.toLocaleString()}.
                  </p>
                  <div className="flex space-x-3 pt-2">
                    <button 
                      onClick={() => handleRespondToCounterFirebase(selectedBid.id, true)}
                      className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white py-2 rounded-xl text-sm font-bold shadow-md shadow-emerald-100 transition-all"
                    >
                      Accept
                    </button>
                    <button 
                      onClick={() => handleRespondToCounterFirebase(selectedBid.id, false)}
                      className="flex-1 bg-white border border-slate-200 hover:bg-slate-50 text-slate-600 py-2 rounded-xl text-sm font-bold transition-all"
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
                    <CheckCircle2 className="w-5 h-5 text-indigo-600" />
                    <h4 className="text-sm font-bold text-slate-800">Final Logistics Assignment</h4>
                  </div>
                  <p className="text-xs text-slate-500">Provide details for dispatch scheduling.</p>
                  
                  <div className="space-y-3">
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-400 uppercase">Vehicle Number</label>
                      <input 
                        className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="DL 01 AA 1234"
                        value={vehicleDetails.vehicleNumber}
                        onChange={e => setVehicleDetails({...vehicleDetails, vehicleNumber: e.target.value})}
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-400 uppercase">Driver Name</label>
                      <input 
                        className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="John Doe"
                        value={vehicleDetails.driverName}
                        onChange={e => setVehicleDetails({...vehicleDetails, driverName: e.target.value})}
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-400 uppercase">Driver Phone</label>
                      <input 
                        className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="+91 98XXX XXXXX"
                        value={vehicleDetails.driverPhone}
                        onChange={e => setVehicleDetails({...vehicleDetails, driverPhone: e.target.value})}
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-400 uppercase">Expected Dispatch</label>
                      <input 
                        type="datetime-local"
                        className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        value={vehicleDetails.expectedDispatch}
                        onChange={e => setVehicleDetails({...vehicleDetails, expectedDispatch: e.target.value})}
                      />
                    </div>
                  </div>

                  <button 
                    onClick={() => handleSubmitVehicleFirebase(selectedBid.id, vehicleDetails)}
                    className="w-full bg-indigo-600 hover:bg-indigo-700 text-white py-3 rounded-xl font-bold text-sm shadow-lg shadow-indigo-100 transition-all"
                  >
                    Submit Vehicle Details
                  </button>
                </div>
              )}

              {selectedBid.status === BidStatus.ASSIGNED && (
                <div className="text-center py-10">
                  <div className="bg-emerald-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
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
              <span className="bg-blue-100 text-blue-600 text-[10px] px-2 py-0.5 rounded-full font-black">LATEST</span>
            </h3>
            <div className="space-y-6 max-h-[400px] overflow-y-auto pr-2">
              {allNotifications.length > 0 ? (
                allNotifications.map(notif => (
                  <div key={notif.id} className="flex space-x-4 border-b border-slate-50 pb-4">
                    <div className={`flex-shrink-0 w-8 h-8 rounded-xl flex items-center justify-center ${
                      notif.type === 'alert' ? 'bg-rose-100 text-rose-600' : 
                      notif.type === 'success' ? 'bg-emerald-100 text-emerald-600' : 'bg-slate-100 text-slate-500'
                    }`}>
                      <TrendingDown className="w-4 h-4" />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-slate-800">{notif.title}</p>
                      <p className="text-[11px] text-slate-500 mt-0.5 leading-relaxed">{notif.message}</p>
                      <p className="text-[9px] text-slate-400 font-medium mt-1 uppercase">{new Date(notif.timestamp).toLocaleTimeString()}</p>
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