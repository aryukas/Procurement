
import React, { useState, useEffect, useMemo } from 'react';
import { 
 Plus,
  ChevronRight,
  ArrowRight,
  MapPin,
  Clock,
  Truck,
  Users,
  BarChart3,
  TrendingDown,
  ChevronDown,
  ChevronUp,
  X,
  Trash,
  History,
  CheckCircle2,
  AlertCircle,
  Calendar,
  LayoutGrid,
  List as ListIcon,
  Timer,
  Info,
  Infinity as InfinityIcon,
  Globe,
  Settings,
  Building2,
  Route,
  Edit,
  Trash2
} from 'lucide-react';
import { ShipmentBid, BidStatus, VehicleType, LoadType, Notification, User, UserRole, Lane } from '../types';
import { INITIAL_LANES, MOCK_USERS } from '../mockData';
import { useVendors, useLanes } from '../src/hooks/useFirebaseData';
import { FirebaseService } from '../src/services/firebaseService';

interface AdminDashboardProps {
  bids: ShipmentBid[];
  onCreateBid: (bid: Partial<ShipmentBid>) => void;
  onCloseBid: (id: string) => void;
  onCounter: (id: string, amount: number) => void;
  onFinalize: (id: string, vendorId: string, amount: number) => void;
  notifications: Notification[];
}

type AdminTab = 'AUCTIONS' | 'VENDORS' | 'LANES';

const AdminDashboard: React.FC<AdminDashboardProps> = ({ 
  bids, 
  onCreateBid, 
  onCloseBid, 
  onCounter, 
  onFinalize,
  notifications 
}) => {
  const [activeTab, setActiveTab] = useState<AdminTab>('AUCTIONS');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isVendorModalOpen, setIsVendorModalOpen] = useState(false);
  const [isLaneModalOpen, setIsLaneModalOpen] = useState(false);
  
  const [selectedBid, setSelectedBid] = useState<ShipmentBid | null>(null);
  const [counterAmount, setCounterAmount] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [now, setNow] = useState(new Date());

  // Use Firebase for vendors and lanes instead of local state
  const { vendors, loading: vendorsLoading } = useVendors();
  const { lanes, loading: lanesLoading } = useLanes();

  // Vendor creation state
  const [vendorCreationStatus, setVendorCreationStatus] = useState<{ loading: boolean; error: string | null }>({ loading: false, error: null });
  const [editingVendor, setEditingVendor] = useState<User | null>(null);

  // Form States for Masters
  const [newVendor, setNewVendor] = useState({ name: '', lanes: [] as string[] });
  const [newLane, setNewLane] = useState({ origin: '', destination: '' });

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const [expandedSections, setExpandedSections] = useState({
    summary: true,
    pickup: true,
    auction: true
  });

  const [newBid, setNewBid] = useState<Partial<ShipmentBid>>({
    requestByCustomer: '',
    requestDate: new Date().toISOString().split('T')[0],
    loadType: LoadType.FTL,
    capacity: '',
    entryLocation: '',
    product: '',
    packagingType: '',
    noOfPackages: 0,
    weightKg: 0,
    comments: '',
    pickupParty: '',
    pickupDate: new Date().toISOString().split('T')[0],
    pickupPincode: '',
    pickupLocation: '',
    pickupCity: '',
    pickupAddress: '',
    deliveryParty: '',
    deliveryDate: new Date().toISOString().split('T')[0],
    deliveryPincode: '',
    deliveryLocation: '',
    deliveryCity: '',
    deliveryAddress: '',
    reservedPrice: 0,
    ceilingRate: 0,
    stepValue: 0,
    bidStartDate: new Date().toISOString().split('T')[0],
    bidStartTime: '16:10',
    bidEndDate: new Date().toISOString().split('T')[0],
    bidEndTime: '18:00',
    showL1Value: false,
    vehicleType: VehicleType.TRUCK
  });

  // Computed values for lane-based city selection
  const pickupCities = useMemo(() => {
    const uniqueOrigins = [...new Set(lanes.map(lane => lane.origin))];
    return uniqueOrigins.sort();
  }, [lanes]);

  const deliveryCities = useMemo(() => {
    if (!newBid.pickupCity) return [];
    const availableDestinations = lanes
      .filter(lane => lane.origin === newBid.pickupCity)
      .map(lane => lane.destination);
    return [...new Set(availableDestinations)].sort();
  }, [lanes, newBid.pickupCity]);

  const getBidLifecycleStatus = (bid: ShipmentBid) => {
    if (bid.status === BidStatus.FINALIZED || bid.status === BidStatus.ASSIGNED) return "Completed";
    const start = new Date(`${bid.bidStartDate}T${bid.bidStartTime}`);
    const end = new Date(`${bid.bidEndDate}T${bid.bidEndTime}`);
    if (now < start) return "Not Started Yet";
    if (now >= end || bid.status === BidStatus.CLOSED) return "Completed";
    return "In Process";
  };

  const handleEditBid = (bid: ShipmentBid) => {
    setNewBid({
      ...bid,
      requestDate: bid.requestDate || new Date().toISOString().split('T')[0],
      pickupDate: bid.pickupDate || new Date().toISOString().split('T')[0],
      deliveryDate: bid.deliveryDate || new Date().toISOString().split('T')[0],
      bidStartDate: bid.bidStartDate || new Date().toISOString().split('T')[0],
      bidEndDate: bid.bidEndDate || new Date().toISOString().split('T')[0]
    });
    setIsModalOpen(true);
  };

  const handleDeleteBid = async (bidId: string) => {
    if (confirm('Are you sure you want to delete this bid?')) {
      try {
        await FirebaseService.deleteShipmentBid(bidId);
        setSelectedBid(null);
      } catch (error) {
        console.error('Error deleting bid:', error);
      }
    }
  };

  const getTimeRemaining = (bid: ShipmentBid) => {
    const end = new Date(`${bid.bidEndDate}T${bid.bidEndTime}`);
    const diff = end.getTime() - now.getTime();
    if (diff <= 0) return "Ended";
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const mins = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    const secs = Math.floor((diff % (1000 * 60)) / 1000);
    return `${hours}h ${mins}m ${secs}s`;
  };

  const activeBidsCount = useMemo(() => {
    return bids.filter(b => getBidLifecycleStatus(b) === "In Process").length;
  }, [bids, now]);

  const toggleSection = (section: keyof typeof expandedSections) => {
    setExpandedSections(prev => ({ ...prev, [section]: !prev[section] }));
  };

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const processedBid = {
      ...newBid,
      origin: newBid.pickupCity || newBid.pickupLocation || 'Unknown',
      destination: newBid.deliveryCity || newBid.deliveryLocation || 'Unknown',
      materialType: newBid.product || 'Goods',
      lane: `${(newBid.pickupCity || '').toUpperCase()}-${(newBid.deliveryCity || '').toUpperCase()}`,
      deliveryTimeline: 'Standard',
      pickupTime: `${newBid.pickupDate}T10:00:00`,
      endTime: `${newBid.bidEndDate}T${newBid.bidEndTime}:00`,
    };
    onCreateBid(processedBid);
    setIsModalOpen(false);
  };

  const handleAddVendor = async (e: React.FormEvent) => {
    e.preventDefault();
    setVendorCreationStatus({ loading: true, error: null });

    const vendorData = {
      name: newVendor.name,
      role: UserRole.VENDOR,
      lanes: newVendor.lanes
    };

    try {
      const result = await FirebaseService.createVendor(vendorData);
      if (result.success) {
        setNewVendor({ name: '', lanes: [] });
        setIsVendorModalOpen(false);
        setVendorCreationStatus({ loading: false, error: null });
        // The vendors list will automatically update via the useVendors hook
      } else {
        setVendorCreationStatus({ loading: false, error: result.error?.message || 'Failed to create vendor' });
      }
    } catch (error) {
      console.error('Error creating vendor:', error);
      setVendorCreationStatus({ loading: false, error: 'An unexpected error occurred' });
    }
  };

  const handleEditVendor = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingVendor) return;

    setVendorCreationStatus({ loading: true, error: null });

    const updates = {
      name: newVendor.name,
      lanes: newVendor.lanes
    };

    try {
      const result = await FirebaseService.updateVendor(editingVendor.id, updates);
      if (result.success) {
        setNewVendor({ name: '', lanes: [] });
        setIsVendorModalOpen(false);
        setEditingVendor(null);
        setVendorCreationStatus({ loading: false, error: null });
        // The vendors list will automatically update via the useVendors hook
      } else {
        setVendorCreationStatus({ loading: false, error: result.error?.message || 'Failed to update vendor' });
      }
    } catch (error) {
      console.error('Error updating vendor:', error);
      setVendorCreationStatus({ loading: false, error: 'An unexpected error occurred' });
    }
  };

  const handleEditVendorClick = (vendor: User) => {
    setEditingVendor(vendor);
    setNewVendor({ name: vendor.name, lanes: vendor.lanes || [] });
    setIsVendorModalOpen(true);
  };

  const handleCancelEdit = () => {
    setEditingVendor(null);
    setNewVendor({ name: '', lanes: [] });
    setIsVendorModalOpen(false);
    setVendorCreationStatus({ loading: false, error: null });
  };

  const handleAddLane = async (e: React.FormEvent) => {
    e.preventDefault();
    const laneData = {
      origin: newLane.origin,
      destination: newLane.destination
    };
    
    const result = await FirebaseService.createLane(laneData);
    if (result.success) {
      setNewLane({ origin: '', destination: '' });
      setIsLaneModalOpen(false);
    } else {
      console.error('Failed to create lane:', result.error);
      // You could add error handling UI here
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "In Process": return 'text-rose-600 bg-rose-50 border-rose-100';
      case "Not Started Yet": return 'text-slate-500 bg-slate-50 border-slate-100';
      case "Completed": return 'text-emerald-600 bg-emerald-50 border-emerald-100';
      default: return 'text-slate-400 bg-slate-50 border-slate-100';
    }
  };

  const inputClasses = "w-full bg-white border-b border-slate-200 py-1.5 text-sm text-slate-900 font-medium outline-none focus:border-blue-500 placeholder:text-slate-300";
  const boxInputClasses = "w-full bg-white border border-slate-200 px-3 py-2 text-sm text-slate-900 font-medium outline-none rounded focus:ring-1 focus:ring-blue-500 placeholder:text-slate-300";

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      {/* Tab Navigation */}
      <div className="flex items-center space-x-1 mb-8 bg-slate-200/50 p-1.5 rounded-2xl w-fit">
        <button 
          onClick={() => setActiveTab('AUCTIONS')}
          className={`px-6 py-2.5 rounded-xl text-sm font-bold transition-all flex items-center space-x-2 ${activeTab === 'AUCTIONS' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
        >
          <Globe className="w-4 h-4" />
          <span>Auction Console</span>
        </button>
        <button 
          onClick={() => setActiveTab('VENDORS')}
          className={`px-6 py-2.5 rounded-xl text-sm font-bold transition-all flex items-center space-x-2 ${activeTab === 'VENDORS' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
        >
          <Building2 className="w-4 h-4" />
          <span>Vendor Master</span>
        </button>
        <button 
          onClick={() => setActiveTab('LANES')}
          className={`px-6 py-2.5 rounded-xl text-sm font-bold transition-all flex items-center space-x-2 ${activeTab === 'LANES' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
        >
          <Route className="w-4 h-4" />
          <span>Lane Master</span>
        </button>
      </div>

      {activeTab === 'AUCTIONS' && (
        <>
          {/* Summary Stats */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 flex items-center space-x-4">
              <div className="bg-blue-50 p-3 rounded-xl">
                <Truck className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <p className="text-slate-500 text-sm">Active Bids</p>
                <h3 className="text-2xl font-bold">{activeBidsCount}</h3>
              </div>
            </div>
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 flex items-center space-x-4">
              <div className="bg-emerald-50 p-3 rounded-xl">
                <BarChart3 className="w-6 h-6 text-emerald-600" />
              </div>
              <div>
                <p className="text-slate-500 text-sm">Avg. Savings</p>
                <h3 className="text-2xl font-bold">14.2%</h3>
              </div>
            </div>
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 flex items-center space-x-4">
              <div className="bg-amber-50 p-3 rounded-xl">
                <Users className="w-6 h-6 text-amber-600" />
              </div>
              <div>
                <p className="text-slate-500 text-sm">Partners</p>
                <h3 className="text-2xl font-bold">{vendors.length}</h3>
              </div>
            </div>
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 flex items-center space-x-4">
              <div className="bg-purple-50 p-3 rounded-xl">
                <CheckCircle2 className="w-6 h-6 text-purple-600" />
              </div>
              <div>
                <p className="text-slate-500 text-sm">Finalized</p>
                <h3 className="text-2xl font-bold">{bids.filter(b => b.status === BidStatus.FINALIZED || b.status === BidStatus.ASSIGNED).length}</h3>
              </div>
            </div>
          </div>

          <div className="flex flex-col lg:flex-row gap-8">
            <div className="lg:w-2/3 space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="space-y-1">
                  <h2 className="text-2xl font-bold text-slate-800 tracking-tight">Auction Console</h2>
                  <p className="text-sm text-slate-500">Monitor live negotiations and manage logistics requests.</p>
                </div>
                <div className="flex items-center space-x-3">
                  <div className="bg-white border border-slate-200 rounded-xl p-1 flex">
                    <button onClick={() => setViewMode('grid')} className={`p-2 rounded-lg transition-all ${viewMode === 'grid' ? 'bg-blue-50 text-blue-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}><LayoutGrid className="w-5 h-5" /></button>
                    <button onClick={() => setViewMode('list')} className={`p-2 rounded-lg transition-all ${viewMode === 'list' ? 'bg-blue-50 text-blue-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}><ListIcon className="w-5 h-5" /></button>
                  </div>
                  <button onClick={() => setIsModalOpen(true)} className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-xl flex items-center space-x-2 transition-all shadow-lg shadow-blue-100 font-bold">
                    <Plus className="w-5 h-5" />
                    <span>Create Bid</span>
                  </button>
                </div>
              </div>

              <div className={viewMode === 'grid' ? 'grid grid-cols-1 sm:grid-cols-2 gap-4' : 'space-y-4'}>
                {(bids || []).map((bid) => {
                  const lifecycle = getBidLifecycleStatus(bid);
                  const timer = getTimeRemaining(bid);
                  const isSelected = selectedBid?.id === bid.id;
                  return (
                    <div key={`${bid.id}-${now.getTime()}`} onClick={() => setSelectedBid(bid)} className={`bg-white border p-5 rounded-2xl cursor-pointer transition-all hover:shadow-lg relative overflow-hidden group ${isSelected ? 'border-blue-500 ring-4 ring-blue-50' : 'border-slate-200'}`}>
                      <div className={`absolute top-0 left-0 w-1 h-full ${lifecycle === 'In Process' ? 'bg-rose-500' : lifecycle === 'Completed' ? 'bg-emerald-500' : 'bg-slate-300'}`}></div>
                      <div className="flex justify-between items-start mb-3">
                        <div className="space-y-0.5">
                          <p className="text-[10px] text-slate-400 font-bold tracking-widest uppercase">{bid.id} • {bid.lane}</p>
                          <h4 className="font-bold text-slate-800 flex items-center">{bid.origin} <ArrowRight className="w-3 h-3 mx-2 text-slate-300" /> {bid.destination}</h4>
                        </div>
                        <span className={`px-2 py-0.5 rounded text-[10px] font-black border uppercase tracking-tighter ${getStatusColor(lifecycle)}`}>{lifecycle}</span>
                      </div>
                      <div className="grid grid-cols-2 gap-3 mb-4">
                        <div className="flex items-center space-x-2 text-slate-500 text-xs"><Truck className="w-3.5 h-3.5" /><span>{bid.vehicleType}</span></div>
                        <div className="flex items-center space-x-2 text-slate-500 text-xs"><BarChart3 className="w-3.5 h-3.5" /><span>{(bid.offers || []).length} offers</span></div>
                      </div>
                      {lifecycle === "In Process" && (
                        <div className="flex items-center justify-between bg-rose-50 border border-rose-100 rounded-xl px-3 py-2 animate-pulse">
                          <div className="flex items-center space-x-2 text-rose-600"><Timer className="w-4 h-4" /><span className="text-xs font-black tracking-tighter">{timer}</span></div>
                          {(bid.offers || []).length > 0 && <span className="text-xs font-bold text-rose-800">L1: ₹{bid.offers[0].amount.toLocaleString()}</span>}
                        </div>
                      )}
                      {lifecycle === "Completed" && (bid.offers || []).length > 0 && (
                        <div className="flex items-center justify-between bg-emerald-50 border border-emerald-100 rounded-xl px-3 py-2">
                          <div className="flex items-center space-x-2 text-emerald-600"><CheckCircle2 className="w-4 h-4" /><span className="text-[10px] font-bold uppercase">Auction Ended</span></div>
                          <span className="text-xs font-bold text-emerald-800">Final: ₹{bid.offers[0].amount.toLocaleString()}</span>
                        </div>
                      )}
                      {lifecycle === "Not Started Yet" && (
                        <div className="flex items-center space-x-2 bg-slate-50 border border-slate-100 rounded-xl px-3 py-2 text-slate-500"><Clock className="w-4 h-4" /><span className="text-[10px] font-bold uppercase">Starts: {new Date(bid.bidStartDate).toLocaleDateString()}</span></div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="lg:w-1/3">
              {selectedBid ? (
                <div className="bg-white border border-slate-200 rounded-3xl overflow-hidden sticky top-24 shadow-sm">
                  <div className="bg-slate-900 text-white p-6">
                    <div className="flex justify-between items-start mb-4">
                      <div><h3 className="text-lg font-bold">Shipment Insights</h3><p className="text-[10px] text-slate-400 uppercase font-black">ID: {selectedBid.id}</p></div>
                      <div className="flex items-center space-x-2">
                        <button onClick={() => handleEditBid(selectedBid)} className="p-1 hover:bg-white/10 rounded-lg" title="Edit bid">
                          <Edit className="w-4 h-4" />
                        </button>
                        <button onClick={() => handleDeleteBid(selectedBid.id)} className="p-1 hover:bg-red-500/20 rounded-lg text-red-400" title="Delete bid">
                          <Trash2 className="w-4 h-4" />
                        </button>
                        <button onClick={() => setSelectedBid(null)} className="p-1 hover:bg-white/10 rounded-lg"><X className="w-5 h-5" /></button>
                      </div>
                    </div>
                    <div className="flex items-center space-x-4 text-xs">
                      <div className="bg-white/10 px-3 py-1 rounded-full flex items-center"><MapPin className="w-3 h-3 mr-1" /> {selectedBid.origin}</div>
                      <ArrowRight className="w-3 h-3 text-white/40" />
                      <div className="bg-white/10 px-3 py-1 rounded-full flex items-center"><MapPin className="w-3 h-3 mr-1" /> {selectedBid.destination}</div>
                    </div>
                  </div>
                  <div className="p-6 space-y-8 max-h-[calc(100vh-300px)] overflow-y-auto scrollbar-thin">
                    <div>
                      <h5 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 flex items-center"><Info className="w-3 h-3 mr-1.5" /> Request Summary</h5>
                      <div className="grid grid-cols-2 gap-y-4 gap-x-2 text-sm">
                        <div><p className="text-slate-400 text-[10px] font-bold uppercase">Product</p><p className="font-semibold text-slate-800">{selectedBid.product || 'Goods'}</p></div>
                        <div><p className="text-slate-400 text-[10px] font-bold uppercase">Load Type</p><p className="font-semibold text-slate-800">{selectedBid.loadType}</p></div>
                        <div><p className="text-slate-400 text-[10px] font-bold uppercase">Capacity</p><p className="font-semibold text-slate-800">{selectedBid.capacity}</p></div>
                        <div><p className="text-slate-400 text-[10px] font-bold uppercase">Weight</p><p className="font-semibold text-slate-800">{selectedBid.weightKg} Kg</p></div>
                      </div>
                    </div>
                    <div className="pt-6 border-t border-slate-50">
                      <h5 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 flex items-center"><MapPin className="w-3 h-3 mr-1.5" /> Routes & Parties</h5>
                      <div className="space-y-4">
                        <div className="bg-slate-50 p-3 rounded-xl border border-slate-100"><p className="text-[10px] text-blue-500 font-bold uppercase mb-1">Pickup</p><p className="text-xs font-bold text-slate-800">{selectedBid.pickupParty || 'N/A'}</p><p className="text-[10px] text-slate-500 leading-tight mt-1">{selectedBid.pickupAddress || 'Address not specified'}</p></div>
                        <div className="bg-slate-50 p-3 rounded-xl border border-slate-100"><p className="text-[10px] text-emerald-500 font-bold uppercase mb-1">Delivery</p><p className="text-xs font-bold text-slate-800">{selectedBid.deliveryParty || 'N/A'}</p><p className="text-[10px] text-slate-500 leading-tight mt-1">{selectedBid.deliveryAddress || 'Address not specified'}</p></div>
                      </div>
                    </div>
                    <div className="pt-6 border-t border-slate-50">
                      <div className="flex justify-between items-center mb-4"><h5 className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center"><History className="w-3 h-3 mr-1.5" /> Bid Ladder</h5><span className="text-[9px] bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded">Live</span></div>
                      {selectedBid && (selectedBid.offers || []).length > 0 ? (
                        <div className="space-y-2">
                          {(selectedBid.offers || []).map((offer, idx) => (
                            <div key={idx} className={`p-3 rounded-xl border flex items-center justify-between ${idx === 0 ? 'bg-emerald-50 border-emerald-100' : 'bg-white border-slate-100'}`}>
                              <div className="flex items-center space-x-2"><span className={`w-5 h-5 rounded-lg flex items-center justify-center text-[10px] font-bold ${idx === 0 ? 'bg-emerald-500 text-white' : 'bg-slate-100 text-slate-500'}`}>{idx + 1}</span><div><p className="text-xs font-bold text-slate-800">{offer.vendorName}</p><p className="text-[9px] text-slate-400">{new Date(offer.timestamp).toLocaleTimeString()}</p></div></div>
                              <span className={`text-sm font-black ${idx === 0 ? 'text-emerald-700' : 'text-slate-800'}`}>₹{offer.amount.toLocaleString()}</span>
                            </div>
                          ))}
                        </div>
                      ) : (<div className="text-center py-6 border border-dashed rounded-2xl"><AlertCircle className="w-6 h-6 text-slate-200 mx-auto mb-2" /><p className="text-[10px] text-slate-400 font-bold uppercase">Awaiting Submissions</p></div>)}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="bg-white border-2 border-dashed border-slate-200 rounded-3xl p-12 text-center text-slate-400 sticky top-24">
                  <InfinityIcon className="w-12 h-12 mx-auto mb-4 opacity-10" />
                  <h5 className="font-bold text-slate-500 mb-1">No Selection</h5>
                  <p className="text-xs leading-relaxed max-w-[200px] mx-auto opacity-60">Pick an active or past auction to view high-level parameters and rankings.</p>
                </div>
              )}
            </div>
          </div>
        </>
      )}

      {activeTab === 'VENDORS' && (
        <div className="space-y-6">
          {/* Header with Stats */}
          <div className="bg-gradient-to-r from-blue-600 to-indigo-600 rounded-3xl p-8 text-white">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-3xl font-bold mb-2">Vendor Master</h2>
                <p className="text-blue-100">Manage transport partners and their operating lanes</p>
              </div>
              <button 
                onClick={() => {
                  setEditingVendor(null);
                  setNewVendor({ name: '', lanes: [] });
                  setIsVendorModalOpen(true);
                }}
                className="bg-white text-blue-600 px-6 py-3 rounded-xl flex items-center space-x-2 font-bold shadow-lg hover:shadow-xl transition-all"
              >
                <Plus className="w-5 h-5" />
                <span>Add Partner</span>
              </button>
            </div>
            <div className="grid grid-cols-3 gap-6">
              <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-4">
                <div className="flex items-center space-x-3">
                  <Building2 className="w-8 h-8 text-white/80" />
                  <div>
                    <p className="text-2xl font-bold">{vendors.length}</p>
                    <p className="text-blue-100 text-sm">Active Partners</p>
                  </div>
                </div>
              </div>
              <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-4">
                <div className="flex items-center space-x-3">
                  <Route className="w-8 h-8 text-white/80" />
                  <div>
                    <p className="text-2xl font-bold">{lanes.length}</p>
                    <p className="text-blue-100 text-sm">Total Lanes</p>
                  </div>
                </div>
              </div>
              <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-4">
                <div className="flex items-center space-x-3">
                  <CheckCircle2 className="w-8 h-8 text-white/80" />
                  <div>
                    <p className="text-2xl font-bold">{vendors.filter(v => v.lanes && v.lanes.length > 0).length}</p>
                    <p className="text-blue-100 text-sm">Assigned</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Vendor Grid */}
          {vendorsLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="bg-white rounded-2xl p-6 shadow-sm border animate-pulse">
                  <div className="flex items-center space-x-4 mb-4">
                    <div className="w-12 h-12 bg-slate-200 rounded-xl"></div>
                    <div className="flex-1">
                      <div className="h-4 bg-slate-200 rounded mb-2"></div>
                      <div className="h-3 bg-slate-200 rounded w-20"></div>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <div className="h-3 bg-slate-200 rounded"></div>
                    <div className="h-3 bg-slate-200 rounded w-3/4"></div>
                  </div>
                </div>
              ))}
            </div>
          ) : vendors.length === 0 ? (
            <div className="bg-white rounded-3xl p-16 text-center border-2 border-dashed border-slate-200">
              <Building2 className="w-16 h-16 mx-auto mb-4 text-slate-300" />
              <h3 className="text-xl font-bold text-slate-600 mb-2">No Transport Partners</h3>
              <p className="text-slate-500 mb-6 max-w-md mx-auto">Start building your logistics network by adding your first transport partner</p>
              <button 
                onClick={() => {
                  setEditingVendor(null);
                  setNewVendor({ name: '', lanes: [] });
                  setIsVendorModalOpen(true);
                }}
                className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 rounded-xl font-bold shadow-lg"
              >
                Add First Partner
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {vendors.filter(vendor => vendor && vendor.name && vendor.name.trim() !== '').map(vendor => {
                const assignedLanes = vendor.lanes || [];
                const isActive = assignedLanes.length > 0;
                return (
                  <div key={vendor.id} className="bg-white rounded-2xl p-6 shadow-sm border hover:shadow-lg transition-all group">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center space-x-4">
                        <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-white font-bold text-lg ${
                          isActive ? 'bg-gradient-to-br from-blue-500 to-indigo-600' : 'bg-slate-400'
                        }`}>
                          {vendor.name?.charAt(0)?.toUpperCase() || '?'}
                        </div>
                        <div>
                          <h4 className="font-bold text-slate-800 text-lg">{vendor.name || 'Unnamed Vendor'}</h4>
                          <div className="flex items-center space-x-2">
                            <span className={`w-2 h-2 rounded-full ${
                              isActive ? 'bg-emerald-500' : 'bg-slate-300'
                            }`}></span>
                            <span className={`text-xs font-medium ${
                              isActive ? 'text-emerald-600' : 'text-slate-500'
                            }`}>
                              {isActive ? 'Active' : 'Inactive'}
                            </span>
                          </div>
                        </div>
                      </div>
                      <button 
                        onClick={() => handleEditVendorClick(vendor)}
                        className="opacity-0 group-hover:opacity-100 p-2 hover:bg-slate-100 rounded-lg transition-all"
                        title="Edit vendor"
                      >
                        <Settings className="w-4 h-4 text-slate-400" />
                      </button>
                    </div>
                    
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-slate-600">Operating Lanes</span>
                        <span className="bg-slate-100 text-slate-700 text-xs font-bold px-2 py-1 rounded-full">
                          {assignedLanes.length}
                        </span>
                      </div>
                      
                      {assignedLanes.length > 0 ? (
                        <div className="space-y-2 max-h-32 overflow-y-auto">
                          {assignedLanes.map(lane => {
                            const [origin, destination] = lane.split('-');
                            return (
                              <div key={lane} className="flex items-center justify-between bg-slate-50 rounded-lg p-2">
                                <div className="flex items-center space-x-2 text-sm">
                                  <MapPin className="w-3 h-3 text-blue-500" />
                                  <span className="font-medium text-slate-700">{origin}</span>
                                  <ArrowRight className="w-3 h-3 text-slate-400" />
                                  <span className="font-medium text-slate-700">{destination}</span>
                                </div>
                                <span className="text-xs text-slate-500 bg-white px-2 py-0.5 rounded border">
                                  {lane}
                                </span>
                              </div>
                            );
                          })}
                        </div>
                      ) : (
                        <div className="text-center py-6 border-2 border-dashed border-slate-200 rounded-lg">
                          <Route className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                          <p className="text-xs text-slate-400 font-medium">No lanes assigned</p>
                          <button 
                            onClick={() => handleEditVendorClick(vendor)}
                            className="text-xs text-blue-600 hover:text-blue-700 font-medium mt-1"
                          >
                            Assign Lanes
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {activeTab === 'LANES' && (
        <div className="bg-white border border-slate-200 rounded-3xl overflow-hidden shadow-sm">
          <div className="p-8 border-b border-slate-100 flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold text-slate-800">Lane Master</h2>
              <p className="text-sm text-slate-500">Define operational routes and review vendor availability.</p>
            </div>
            <button 
              onClick={() => setIsLaneModalOpen(true)}
              className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-xl flex items-center space-x-2 transition-all font-bold shadow-lg shadow-blue-50"
            >
              <Plus className="w-5 h-5" />
              <span>Add New Lane</span>
            </button>
          </div>
          <div className="p-8 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {lanesLoading ? (
              Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="bg-slate-50 border border-slate-100 rounded-2xl p-6 animate-pulse">
                  <div className="flex items-center justify-between mb-4">
                    <div className="h-3 bg-slate-200 rounded w-12"></div>
                    <div className="w-5 h-5 bg-slate-200 rounded"></div>
                  </div>
                  <div className="h-6 bg-slate-200 rounded mb-6"></div>
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <div className="h-3 bg-slate-200 rounded w-24"></div>
                      <div className="h-4 bg-slate-200 rounded w-6"></div>
                    </div>
                    <div className="flex -space-x-2">
                      <div className="w-8 h-8 bg-slate-200 rounded-full"></div>
                      <div className="w-8 h-8 bg-slate-200 rounded-full"></div>
                    </div>
                  </div>
                </div>
              ))
            ) : lanes.filter(lane => lane && lane.origin && lane.destination && lane.name).length === 0 ? (
              <div className="col-span-full text-center py-12">
                <Route className="w-16 h-16 mx-auto mb-4 text-slate-300" />
                <h3 className="text-lg font-bold text-slate-600 mb-2">No lanes defined</h3>
                <p className="text-slate-500 mb-6">Create your first operational route to get started</p>
                <button 
                  onClick={() => setIsLaneModalOpen(true)}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-xl font-bold shadow-lg shadow-blue-50"
                >
                  Add First Lane
                </button>
              </div>
            ) : (
              lanes
                .filter(lane => lane && lane.origin && lane.destination && lane.name) // Only show complete lanes
                .map(lane => {
                const assignedVendors = vendors.filter(v => v.lanes?.includes(lane.name));
                return (
                  <div key={lane.id} className="bg-slate-50 border border-slate-100 rounded-2xl p-6 hover:shadow-md transition-all group">
                    <div className="flex items-center justify-between mb-4">
                      <span className="text-[10px] text-blue-500 font-black uppercase tracking-widest">{lane.id?.slice(-6) || 'N/A'}</span>
                      <Route className="w-5 h-5 text-slate-300 group-hover:text-blue-500 transition-colors" />
                    </div>
                    <h4 className="text-lg font-bold text-slate-800 flex items-center mb-6">
                      {lane.origin || 'Unknown'} <ArrowRight className="w-3 h-3 mx-3 text-slate-300" /> {lane.destination || 'Unknown'}
                    </h4>
                    <div className="space-y-4">
                      <div className="flex justify-between items-center text-xs">
                        <span className="text-slate-500 font-medium">Operating Vendors</span>
                        <span className="font-bold text-slate-800">{assignedVendors.length}</span>
                      </div>
                      <div className="flex -space-x-2 overflow-hidden">
                        {assignedVendors.length > 0 ? (
                          assignedVendors.slice(0, 3).map(v => (
                            <div key={v.id} title={v.name} className="inline-block h-8 w-8 rounded-full ring-2 ring-white bg-blue-500 flex items-center justify-center text-[10px] text-white font-bold uppercase">
                              {v.name?.charAt(0) || '?'}
                            </div>
                          ))
                        ) : (
                          <div className="text-[10px] text-slate-400 italic">No vendors assigned</div>
                        )}
                        {assignedVendors.length > 3 && (
                          <div className="inline-block h-8 w-8 rounded-full ring-2 ring-white bg-slate-200 flex items-center justify-center text-[10px] text-slate-600 font-bold">
                            +{assignedVendors.length - 3}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* New Bid Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[100] bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#f3f4f6] rounded-xl w-full max-w-6xl max-h-[90vh] overflow-hidden shadow-2xl flex flex-col">
            <div className="bg-white px-6 py-4 border-b flex items-center justify-between">
              <h3 className="text-xl font-medium text-slate-700">Truck Request Entry</h3>
              <button onClick={() => setIsModalOpen(false)} className="p-1 hover:bg-slate-100 rounded-lg"><X className="w-5 h-5 text-slate-400" /></button>
            </div>
            <form onSubmit={handleCreateSubmit} className="flex-grow overflow-y-auto p-6 space-y-6">
              <div className="bg-white rounded-lg border border-slate-200 overflow-hidden shadow-sm">
                <button type="button" onClick={() => toggleSection('summary')} className="w-full px-6 py-3 flex items-center justify-between border-b hover:bg-slate-50 transition-colors">
                  <span className="text-sm font-bold text-slate-700">Request Summary</span>
                  {expandedSections.summary ? <ChevronUp className="w-4 h-4 text-slate-400"/> : <ChevronDown className="w-4 h-4 text-slate-400"/>}
                </button>
                {expandedSections.summary && (
                  <div className="p-6 grid grid-cols-1 md:grid-cols-3 gap-x-8 gap-y-6">
                    <div className="space-y-1">
                      <label className="text-xs text-slate-500 font-bold uppercase tracking-tight">Request by Customer</label>
                      <input className={inputClasses} value={newBid.requestByCustomer} onChange={e => setNewBid({...newBid, requestByCustomer: e.target.value})} />
                    </div>
                    <div className="space-y-1 relative">
                      <label className="text-xs text-slate-500 font-bold uppercase tracking-tight">Request Date</label>
                      <div className="flex items-center border-b border-slate-200"><input type="date" className="w-full py-1.5 text-sm text-slate-900 font-medium outline-none bg-transparent" value={newBid.requestDate} onChange={e => setNewBid({...newBid, requestDate: e.target.value})} /><Calendar className="w-4 h-4 text-slate-400 ml-2" /></div>
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs text-slate-500 font-bold uppercase tracking-tight">Load Type</label>
                      <select className={inputClasses} value={newBid.loadType} onChange={e => setNewBid({...newBid, loadType: e.target.value as LoadType})}><option value={LoadType.FTL}>FTL</option><option value={LoadType.LTL}>LTL</option></select>
                    </div>
                    <div className="space-y-1"><label className="text-xs text-slate-500 font-bold uppercase tracking-tight">Capacity</label><input className={inputClasses} value={newBid.capacity} onChange={e => setNewBid({...newBid, capacity: e.target.value})} /></div>
                    <div className="space-y-1"><label className="text-xs text-slate-500 font-bold uppercase tracking-tight">Product</label><input className={inputClasses} value={newBid.product} onChange={e => setNewBid({...newBid, product: e.target.value})} /></div>
                    <div className="space-y-1"><label className="text-xs text-slate-500 font-bold uppercase tracking-tight">No of Packages *</label><input type="number" className={inputClasses} value={newBid.noOfPackages} onChange={e => setNewBid({...newBid, noOfPackages: parseInt(e.target.value) || 0})} /></div>
                  </div>
                )}
              </div>
              {/* Pickup Section */}
              <div className="bg-white rounded-lg border border-slate-200 overflow-hidden shadow-sm">
                <button type="button" onClick={() => toggleSection('pickup')} className="w-full px-6 py-3 flex items-center justify-between border-b hover:bg-slate-50 transition-colors">
                  <span className="text-sm font-bold text-slate-700">Pick-Up & Delivery Details</span>
                  {expandedSections.pickup ? <ChevronUp className="w-4 h-4 text-slate-400"/> : <ChevronDown className="w-4 h-4 text-slate-400"/>}
                </button>
                {expandedSections.pickup && (
                  <div className="p-6 grid grid-cols-1 md:grid-cols-3 gap-x-8 gap-y-6">
                    <div className="space-y-1">
                      <label className="text-xs text-slate-500 font-bold uppercase tracking-tight">Pick Up City</label>
                      <select 
                        className={inputClasses} 
                        value={newBid.pickupCity} 
                        onChange={e => setNewBid({...newBid, pickupCity: e.target.value, deliveryCity: ''})}
                      >
                        <option value="">Select pickup city</option>
                        {pickupCities.map(city => (
                          <option key={city} value={city}>{city}</option>
                        ))}
                      </select>
                    </div>
                    <div className="space-y-1"><label className="text-xs text-slate-500 font-bold uppercase tracking-tight">Pick Up Address</label><input className={inputClasses} value={newBid.pickupAddress} onChange={e => setNewBid({...newBid, pickupAddress: e.target.value})} /></div>
                    <div className="space-y-1">
                      <label className="text-xs text-slate-500 font-bold uppercase tracking-tight">Delivery City</label>
                      <select 
                        className={inputClasses} 
                        value={newBid.deliveryCity} 
                        onChange={e => setNewBid({...newBid, deliveryCity: e.target.value})}
                        disabled={!newBid.pickupCity}
                      >
                        <option value="">{newBid.pickupCity ? 'Select delivery city' : 'Select pickup city first'}</option>
                        {deliveryCities.map(city => (
                          <option key={city} value={city}>{city}</option>
                        ))}
                      </select>
                    </div>
                    <div className="space-y-1"><label className="text-xs text-slate-500 font-bold uppercase tracking-tight">Delivery Address</label><input className={inputClasses} value={newBid.deliveryAddress} onChange={e => setNewBid({...newBid, deliveryAddress: e.target.value})} /></div>
                  </div>
                )}
              </div>
              <div className="bg-white rounded-lg border border-slate-200 overflow-hidden shadow-sm">
                <button type="button" onClick={() => toggleSection('auction')} className="w-full px-6 py-3 flex items-center justify-between border-b hover:bg-slate-50 transition-colors">
                  <span className="text-sm font-bold text-slate-700">Auction Parameters</span>
                  {expandedSections.auction ? <ChevronUp className="w-4 h-4 text-slate-400"/> : <ChevronDown className="w-4 h-4 text-slate-400"/>}
                </button>
                {expandedSections.auction && (
                  <div className="p-6 grid grid-cols-1 md:grid-cols-3 gap-x-8 gap-y-6">
                    <div className="space-y-1"><label className="text-xs text-slate-500 font-bold uppercase tracking-tight">Ceiling Rate *</label><input type="number" className={boxInputClasses} value={newBid.ceilingRate} onChange={e => setNewBid({...newBid, ceilingRate: parseInt(e.target.value) || 0})} /></div>
                    <div className="space-y-1"><label className="text-xs text-slate-500 font-bold uppercase tracking-tight">Step Value *</label><div className="flex items-center border border-blue-500 px-3 py-2 rounded bg-white"><input type="number" className="w-full text-sm text-slate-900 font-medium outline-none bg-transparent" value={newBid.stepValue} onChange={e => setNewBid({...newBid, stepValue: parseInt(e.target.value) || 0})} /></div></div>
                    <div className="space-y-1"><label className="text-xs text-slate-500 font-bold uppercase tracking-tight">Bid Start Date *</label><input type="date" className="w-full border-b py-1.5 text-sm text-slate-900 font-medium outline-none" value={newBid.bidStartDate} onChange={e => setNewBid({...newBid, bidStartDate: e.target.value})} /></div>
                    <div className="space-y-1"><label className="text-xs text-slate-500 font-bold uppercase tracking-tight">Start Time *</label><input type="time" className="w-full border-b py-1.5 text-sm text-slate-900 font-medium outline-none" value={newBid.bidStartTime} onChange={e => setNewBid({...newBid, bidStartTime: e.target.value})} /></div>
                    <div className="space-y-1"><label className="text-xs text-slate-500 font-bold uppercase tracking-tight">Bid End Date *</label><input type="date" className="w-full border-b py-1.5 text-sm text-slate-900 font-medium outline-none" value={newBid.bidEndDate} onChange={e => setNewBid({...newBid, bidEndDate: e.target.value})} /></div>
                    <div className="space-y-1"><label className="text-xs text-slate-500 font-bold uppercase tracking-tight">End Time *</label><input type="time" className="w-full border-b py-1.5 text-sm text-slate-900 font-medium outline-none" value={newBid.bidEndTime} onChange={e => setNewBid({...newBid, bidEndTime: e.target.value})} /></div>
                  </div>
                )}
              </div>
            </form>
            <div className="bg-white px-6 py-4 border-t flex space-x-3">
              <button type="submit" onClick={handleCreateSubmit} className="bg-[#4f46e5] text-white px-8 py-2 rounded-md font-bold text-sm hover:bg-[#4338ca] shadow-lg shadow-indigo-100">Save</button>
              <button type="button" onClick={() => setIsModalOpen(false)} className="bg-white border text-slate-600 px-8 py-2 rounded-md font-bold text-sm hover:bg-slate-50">Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* Vendor Master Modal */}
      {isVendorModalOpen && (
        <div className="fixed inset-0 z-[100] bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-lg overflow-hidden shadow-2xl">
            <div className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white p-8">
              <h3 className="text-2xl font-bold mb-2">
                {editingVendor ? 'Edit Transport Partner' : 'Add Transport Partner'}
              </h3>
              <p className="text-blue-100">
                {editingVendor ? 'Update partner details and lane assignments' : 'Register a new logistics partner'}
              </p>
            </div>
            
            <div className="p-8">
              {vendorCreationStatus.error && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl mb-6">
                  <div className="flex items-center space-x-2">
                    <AlertCircle className="w-4 h-4" />
                    <p className="text-sm font-medium">{vendorCreationStatus.error}</p>
                  </div>
                </div>
              )}
              
              <form onSubmit={editingVendor ? handleEditVendor : handleAddVendor} className="space-y-6">
                <div className="space-y-2">
                  <label className="text-sm font-bold text-slate-700 flex items-center space-x-2">
                    <Building2 className="w-4 h-4" />
                    <span>Company Name</span>
                  </label>
                  <input 
                    required 
                    className="w-full bg-slate-50 border-2 border-slate-200 focus:border-blue-500 focus:bg-white px-4 py-3 rounded-xl text-slate-900 font-medium outline-none transition-all" 
                    value={newVendor.name} 
                    onChange={e => setNewVendor({...newVendor, name: e.target.value})} 
                    placeholder="e.g. Express Logistics Pvt Ltd" 
                    disabled={vendorCreationStatus.loading} 
                  />
                </div>
                
                <div className="space-y-3">
                  <label className="text-sm font-bold text-slate-700 flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <Route className="w-4 h-4" />
                      <span>Operating Lanes</span>
                    </div>
                    <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded-full font-bold">
                      {newVendor.lanes.length} selected
                    </span>
                  </label>
                  
                  <div className="bg-slate-50 border-2 border-slate-200 rounded-xl p-4">
                    {lanes.length === 0 ? (
                      <div className="text-center py-6">
                        <Route className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                        <p className="text-sm text-slate-500">No lanes available</p>
                        <p className="text-xs text-slate-400">Create lanes first in Lane Master</p>
                      </div>
                    ) : (
                      <div className="max-h-48 overflow-y-auto space-y-2">
                        {lanes.map(lane => {
                          const isSelected = newVendor.lanes.includes(lane.name);
                          return (
                            <label key={lane.id} className={`flex items-center space-x-3 p-3 rounded-lg cursor-pointer transition-all ${
                              isSelected ? 'bg-blue-50 border-2 border-blue-200' : 'bg-white border-2 border-transparent hover:bg-slate-50'
                            }`}>
                              <input 
                                type="checkbox" 
                                checked={isSelected}
                                onChange={(e) => {
                                  const updated = e.target.checked 
                                    ? [...newVendor.lanes, lane.name]
                                    : newVendor.lanes.filter(item => item !== lane.name);
                                  setNewVendor({...newVendor, lanes: updated});
                                }}
                                className="w-4 h-4 text-blue-600 rounded border-2 border-slate-300"
                                disabled={vendorCreationStatus.loading}
                              />
                              <div className="flex-1 flex items-center justify-between">
                                <div className="flex items-center space-x-2">
                                  <MapPin className="w-4 h-4 text-slate-400" />
                                  <span className="font-medium text-slate-700">{lane.origin}</span>
                                  <ArrowRight className="w-3 h-3 text-slate-400" />
                                  <span className="font-medium text-slate-700">{lane.destination}</span>
                                </div>
                                <span className="text-xs bg-slate-200 text-slate-600 px-2 py-1 rounded font-bold">
                                  {lane.name}
                                </span>
                              </div>
                            </label>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
                
                <div className="flex space-x-3 pt-6">
                  <button 
                    type="submit" 
                    className="flex-1 bg-gradient-to-r from-blue-600 to-indigo-600 text-white py-3 rounded-xl font-bold shadow-lg disabled:opacity-50 disabled:cursor-not-allowed transition-all hover:shadow-xl" 
                    disabled={vendorCreationStatus.loading}
                  >
                    {vendorCreationStatus.loading 
                      ? (editingVendor ? 'Updating...' : 'Creating...') 
                      : (editingVendor ? 'Update Partner' : 'Add Partner')
                    }
                  </button>
                  <button 
                    type="button" 
                    onClick={handleCancelEdit} 
                    className="bg-slate-100 hover:bg-slate-200 text-slate-600 px-6 rounded-xl font-bold transition-all" 
                    disabled={vendorCreationStatus.loading}
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

    {/* Lane Master Modal */}
{isLaneModalOpen && (
  <div className="fixed inset-0 z-[100] bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4">
    <div className="bg-white rounded-3xl w-full max-w-md shadow-2xl overflow-hidden animate-in fade-in zoom-in">

      {/* Header */}
      <div className="px-8 pt-8 pb-4 border-b border-slate-100">
        <h3 className="text-xl font-bold text-slate-800 flex items-center gap-2">
          <Plus className="w-5 h-5 text-blue-600" />
          Define New Route
        </h3>
        <p className="text-sm text-slate-500 mt-1">
          Create a lane for vendor bidding & auctions
        </p>
      </div>

      {/* Body */}
      <form onSubmit={handleAddLane} className="p-8 space-y-6">

        {/* Info Alert */}
        <div className="flex items-start gap-3 bg-blue-50 border border-blue-100 rounded-xl p-4 text-sm text-blue-700">
          <AlertCircle className="w-5 h-5 mt-0.5" />
          <p>
            Ensure city names are correct. Once created, lanes are used in live auctions.
          </p>
        </div>

        {/* Origin */}
        <div className="space-y-1">
          <label className="text-xs text-slate-500 font-bold uppercase tracking-tight">
            Origin City
          </label>
          <div className="relative">
            <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
            <input
              required
              value={newLane.origin}
              onChange={(e) =>
                setNewLane({ ...newLane, origin: e.target.value })
              }
              placeholder="e.g. Hyderabad"
              className={`${boxInputClasses} pl-10`}
            />
          </div>
        </div>

        {/* Destination */}
        <div className="space-y-1">
          <label className="text-xs text-slate-500 font-bold uppercase tracking-tight">
            Destination City
          </label>
          <div className="relative">
            <ArrowRight className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
            <input
              required
              value={newLane.destination}
              onChange={(e) =>
                setNewLane({ ...newLane, destination: e.target.value })
              }
              placeholder="e.g. Pune"
              className={`${boxInputClasses} pl-10`}
            />
          </div>
        </div>

        {/* Footer Buttons */}
        <div className="flex gap-3 pt-4">
          <button
            type="submit"
            className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-xl font-bold shadow-lg shadow-blue-100 transition-all active:scale-[0.98]"
          >
            Register Lane
          </button>

          <button
            type="button"
            onClick={() => setIsLaneModalOpen(false)}
            className="px-6 rounded-xl font-bold bg-slate-100 hover:bg-slate-200 text-slate-600 transition"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  </div>
)}

    </div>
  );
};

export default AdminDashboard;
