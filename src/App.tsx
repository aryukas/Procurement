
import React, { useState, useEffect, useMemo } from 'react';
import { 
  Infinity, 
  LayoutDashboard, 
  PlusCircle, 
  Bell, 
  LogOut, 
  Search, 
  ArrowRight, 
  MapPin, 
  Clock, 
  ChevronRight,
  TrendingDown,
  User as UserIcon,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Truck
} from 'lucide-react';

// Error Boundary Component
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    this.setState({
      error: error,
      errorInfo: errorInfo
    });
    console.error('Error caught by boundary:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
          <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-6 text-center">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <XCircle className="w-8 h-8 text-red-600" />
            </div>
            <h2 className="text-xl font-bold text-slate-800 mb-2">Something went wrong</h2>
            <p className="text-slate-600 mb-4">We encountered an error while loading the dashboard. Please try refreshing the page.</p>
            <button 
              onClick={() => window.location.reload()} 
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium"
            >
              Refresh Page
            </button>
            {process.env.NODE_ENV === 'development' && (
              <details className="mt-4 text-left">
                <summary className="cursor-pointer text-sm text-slate-500 hover:text-slate-700">
                  Error Details (Development)
                </summary>
                <pre className="mt-2 text-xs bg-slate-100 p-2 rounded overflow-auto max-h-32">
                  {this.state.error && this.state.error.toString()}
                  {this.state.errorInfo.componentStack}
                </pre>
              </details>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
import { MOCK_USERS } from '../mockData';
import { 
  User, 
  UserRole, 
  ShipmentBid, 
  BidStatus, 
  BidOffer, 
  Notification, 
  VehicleType, 
  LoadType, 
  VehicleDetails 
} from '../types';
import AdminDashboard from '../components/AdminDashboard';
import VendorDashboard from '../components/VendorDashboard';
import Login from '../components/Login';
import AdminAuth from '../components/AdminAuth';
import { useBids } from './hooks/useFirebaseData';
import { FirebaseService } from './services/firebaseService';

const App: React.FC = () => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [showAdminAuth, setShowAdminAuth] = useState(false);
  const { bids, loading: bidsLoading } = useBids();
  const [notifications, setNotifications] = useState<Notification[]>([]);

  // Simulation of "real-time" clock or bid updates could happen here
  
  const addNotification = (userId: string, title: string, message: string, type: 'info' | 'success' | 'warning' | 'alert' = 'info') => {
    const newNotif: Notification = {
      id: `n-${Date.now()}`,
      userId,
      title,
      message,
      timestamp: new Date().toISOString(),
      read: false,
      type
    };
    setNotifications(prev => [newNotif, ...prev]);
  };

  const handleLogin = (user: User) => {
    setCurrentUser(user);
    setShowAdminAuth(false);
    addNotification(user.id, 'Welcome Back', `Logged in as ${user.name}`, 'info');
  };

  const handleAdminAuthRequest = () => {
    setShowAdminAuth(true);
  };

  const handleLogout = () => {
    setCurrentUser(null);
  };

  const createBid = async (newBidData: Partial<ShipmentBid>) => {
    try {
      // Create the bid data structure for Firebase
      const bidData = {
        origin: newBidData.origin || '',
        destination: newBidData.destination || '',
        lane: `${(newBidData.origin || '').toUpperCase()}-${(newBidData.destination || '').toUpperCase()}`,
        vehicleType: newBidData.vehicleType || VehicleType.TRUCK,
        loadType: newBidData.loadType || LoadType.FTL,
        capacity: newBidData.capacity || '',
        noOfPackages: newBidData.noOfPackages || 1,
        weightKg: newBidData.weightKg || 0,
        materialType: newBidData.materialType || '',
        pickupTime: newBidData.pickupTime || '',
        deliveryTimeline: newBidData.deliveryTimeline || '',
        endTime: newBidData.endTime || '',
        requestDate: newBidData.requestDate || new Date().toISOString().split('T')[0],
        pickupDate: newBidData.pickupDate || new Date().toISOString().split('T')[0],
        pickupLocation: newBidData.pickupLocation || '',
        pickupCity: newBidData.pickupCity || '',
        deliveryDate: newBidData.deliveryDate || new Date().toISOString().split('T')[0],
        deliveryLocation: newBidData.deliveryLocation || '',
        deliveryCity: newBidData.deliveryCity || '',
        reservedPrice: newBidData.reservedPrice || 0,
        ceilingRate: newBidData.ceilingRate || 0,
        stepValue: newBidData.stepValue || 0,
        bidStartDate: newBidData.bidStartDate || new Date().toISOString().split('T')[0],
        bidStartTime: newBidData.bidStartTime || '00:00',
        bidEndDate: newBidData.bidEndDate || new Date().toISOString().split('T')[0],
        bidEndTime: newBidData.bidEndTime || '00:00',
        showL1Value: newBidData.showL1Value || false,
      };

      const result = await FirebaseService.createShipmentBid(bidData);
      
      if (result.success) {
        // Notify matching vendors
        MOCK_USERS.forEach(user => {
          if (user.role === UserRole.VENDOR && user.lanes?.includes(bidData.lane)) {
            addNotification(user.id, 'New Bid Opportunity', `New shipment available for lane ${bidData.lane}`, 'warning');
          }
        });
      } else {
        console.error('Failed to create bid:', result.error);
      }
    } catch (error) {
      console.error('Error creating bid:', error);
    }
  };

  const placeOffer = async (bidId: string, vendorId: string, vendorName: string, amount: number) => {
    try {
      const offer: BidOffer = {
        vendorId,
        vendorName,
        amount,
        timestamp: new Date().toISOString()
      };

      const result = await FirebaseService.placeBidOffer(bidId, offer);
      
      if (result.success) {
        // Notify Admin
        addNotification('u-1', 'New Bid Submitted', `A vendor submitted a bid of ₹${amount} for ${bidId}`, 'info');
      } else {
        console.error('Failed to place offer:', result.error);
      }
    } catch (error) {
      console.error('Error placing offer:', error);
    }
  };

  const updateBidStatus = async (bidId: string, status: BidStatus, extras?: Partial<ShipmentBid>) => {
    try {
      const updates = { status, ...extras };
      const result = await FirebaseService.updateShipmentBid(bidId, updates);
      
      if (!result.success) {
        console.error('Failed to update bid status:', result.error);
      }
    } catch (error) {
      console.error('Error updating bid status:', error);
    }
  };

  const handleCounterOffer = async (bidId: string, amount: number) => {
    const bid = bids.find(b => b.id === bidId);
    if (!bid || bid.offers.length === 0) return;

    const winner = bid.offers[0]; // Lowest bid
    await updateBidStatus(bidId, BidStatus.NEGOTIATING, { 
      counterOffer: amount,
      winningVendorId: winner.vendorId
    });

    addNotification(winner.vendorId, 'Counter Offer Received', `Admin has countered your bid for ${bidId} with ₹${amount}`, 'alert');
  };

  const respondToCounter = async (bidId: string, accept: boolean) => {
    const bid = bids.find(b => b.id === bidId);
    if (!bid) return;

    if (accept) {
      await updateBidStatus(bidId, BidStatus.FINALIZED, { finalAmount: bid.counterOffer });
      addNotification('u-1', 'Counter Offer Accepted', `Vendor ${bid.winningVendorId} accepted the counter offer.`, 'success');
      addNotification(bid.winningVendorId!, 'Bid Finalized', `Congratulations! Your bid for ${bidId} is finalized.`, 'success');
    } else {
      await updateBidStatus(bidId, BidStatus.OPEN, { counterOffer: undefined });
      addNotification('u-1', 'Counter Offer Rejected', `Vendor ${bid.winningVendorId} rejected the counter offer.`, 'warning');
    }
  };

  const submitVehicleDetails = async (bidId: string, details: VehicleDetails) => {
    const result = await FirebaseService.submitVehicleDetails(bidId, details);
    if (result.success) {
      await updateBidStatus(bidId, BidStatus.ASSIGNED, { vehicleDetails: details });
      addNotification('u-1', 'Vehicle Assigned', `Vendor has submitted vehicle details for ${bidId}`, 'success');
    } else {
      console.error('Failed to submit vehicle details:', result.error);
    }
  };

  if (showAdminAuth) {
    return <AdminAuth onLogin={handleLogin} />;
  }

  if (!currentUser) {
    return <Login onLogin={handleLogin} onAdminAuth={handleAdminAuthRequest} />;
  }

  return (
    <div className="min-h-screen flex flex-col bg-slate-50">
      {/* Header */}
      <header className="bg-blue-900 text-white shadow-lg sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="bg-white p-1.5 rounded-lg">
              <Infinity className="w-6 h-6 text-blue-900" />
            </div>
            <h1 className="text-xl font-bold tracking-tight">WEBXPRESS</h1>
            <span className="hidden sm:inline-block px-2 py-0.5 bg-blue-700 rounded text-[10px] uppercase font-bold tracking-widest">
              Logistics
            </span>
          </div>

          <div className="flex items-center space-x-4">
            <div className="hidden md:flex flex-col items-end mr-2">
              <p className="text-xs text-blue-200 uppercase font-semibold">{currentUser.role}</p>
              <p className="text-sm font-medium">{currentUser.name}</p>
            </div>
            
            <button className="p-2 hover:bg-blue-800 rounded-full transition-colors relative">
              <Bell className="w-5 h-5" />
              {notifications.filter(n => !n.read && n.userId === currentUser.id).length > 0 && (
                <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full border-2 border-blue-900"></span>
              )}
            </button>
            
            <button 
              onClick={handleLogout}
              className="flex items-center space-x-2 bg-blue-800 hover:bg-blue-700 px-3 py-1.5 rounded-lg transition-colors text-sm font-medium"
            >
              <LogOut className="w-4 h-4" />
              <span>Logout</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-grow">
        {currentUser.role === UserRole.ADMIN ? (
          <ErrorBoundary>
            <AdminDashboard 
              bids={bids} 
              onCreateBid={createBid} 
              onCloseBid={async (id) => await updateBidStatus(id, BidStatus.CLOSED)}
              onCounter={handleCounterOffer}
              onFinalize={async (id, vendorId, amount) => await updateBidStatus(id, BidStatus.FINALIZED, { winningVendorId: vendorId, finalAmount: amount })}
              notifications={notifications.filter(n => n.userId === currentUser.id)}
            />
          </ErrorBoundary>
        ) : (
          <VendorDashboard 
            currentUser={currentUser}
            bids={bids} 
            onPlaceOffer={placeOffer}
            onRespondToCounter={respondToCounter}
            onSubmitVehicle={submitVehicleDetails}
            notifications={notifications.filter(n => n.userId === currentUser.id)}
          />
        )}
      </main>

      {/* Simple Footer */}
      <footer className="bg-white border-t py-6">
        <div className="max-w-7xl mx-auto px-4 text-center">
          <p className="text-slate-400 text-xs">© 2024 WebXpress Logistics. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
};

export default App;
