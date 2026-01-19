
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
  Edit2,
  Trash2,
  Phone,
  Mail
} from 'lucide-react';
import { ShipmentBid, BidStatus, VehicleType, LoadType, Notification, User, UserRole, Lane, Vendor } from '../src/types';
import { FirebaseService } from '../src/services/firebaseService';
import { INITIAL_LANES, MOCK_USERS } from '../mockData';

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
  const [bidValidationError, setBidValidationError] = useState<string>('');

  // Master Data States
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [lanes, setLanes] = useState<Lane[]>(INITIAL_LANES);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>('');

  // Vendor Form States
  const [editingVendorId, setEditingVendorId] = useState<string | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [newVendor, setNewVendor] = useState({
    name: '',
    email: '',
    phone: '',
    vehicleTypes: [] as VehicleType[],
    lanes: [] as string[]
  });
  const [vendorErrors, setVendorErrors] = useState<Record<string, string>>({});

  // Form States for Masters
  const [newLane, setNewLane] = useState({ origin: '', destination: '' });

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Load vendors from Firebase
  useEffect(() => {
    const loadVendors = async () => {
      setLoading(true);
      const vendorsList = await FirebaseService.getVendors();
      setVendors(vendorsList);
      setLoading(false);
    };
    loadVendors();
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

  const getBidLifecycleStatus = (bid: ShipmentBid) => {
    if (bid.status === BidStatus.FINALIZED || bid.status === BidStatus.ASSIGNED) return "Completed";
    const start = new Date(`${bid.bidStartDate}T${bid.bidStartTime}`);
    const end = new Date(`${bid.bidEndDate}T${bid.bidEndTime}`);
    if (now < start) return "Not Started Yet";
    if (now >= end || bid.status === BidStatus.CLOSED) return "Completed";
    return "In Process";
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

  const validateBidTimings = (): boolean => {
    const startDateTime = new Date(`${newBid.bidStartDate}T${newBid.bidStartTime}`);
    const endDateTime = new Date(`${newBid.bidEndDate}T${newBid.bidEndTime}`);
    
    if (isNaN(startDateTime.getTime()) || isNaN(endDateTime.getTime())) {
      setBidValidationError('Please enter valid date and time values.');
      return false;
    }
    
    if (startDateTime >= endDateTime) {
      setBidValidationError('Bid Start Date/Time must be earlier than Bid End Date/Time.');
      return false;
    }
    
    setBidValidationError('');
    return true;
  };

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateBidTimings()) {
      return;
    }
    
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

  // Vendor Management Functions
  const validateVendorForm = (): boolean => {
    const errors: Record<string, string> = {};

    if (!newVendor.name.trim()) {
      errors.name = 'Vendor name is required';
    }
    if (!newVendor.email.trim()) {
      errors.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(newVendor.email)) {
      errors.email = 'Invalid email format';
    }
    if (!newVendor.phone.trim()) {
      errors.phone = 'Phone is required';
    } else if (!/^\d{10,}$/.test(newVendor.phone.replace(/\D/g, ''))) {
      errors.phone = 'Phone must have at least 10 digits';
    }
    if (newVendor.vehicleTypes.length === 0) {
      errors.vehicleTypes = 'Select at least one vehicle type';
    }
    if (newVendor.lanes.length === 0) {
      errors.lanes = 'Assign at least one lane';
    }

    setVendorErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleAddVendor = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateVendorForm()) {
      return;
    }

    setLoading(true);
    setError('');

    try {
      if (editingVendorId) {
        // Update existing vendor
        const result = await FirebaseService.updateVendor(editingVendorId, {
          name: newVendor.name,
          email: newVendor.email,
          phone: newVendor.phone,
          vehicleTypes: newVendor.vehicleTypes,
          lanes: newVendor.lanes
        });

        if (result.success) {
          const updatedVendors = vendors.map(v =>
            v.id === editingVendorId
              ? {
                  ...v,
                  name: newVendor.name,
                  email: newVendor.email,
                  phone: newVendor.phone,
                  vehicleTypes: newVendor.vehicleTypes,
                  lanes: newVendor.lanes
                }
              : v
          );
          setVendors(updatedVendors);
        } else {
          setError('Failed to update vendor');
        }
      } else {
        // Create new vendor
        const result = await FirebaseService.createVendor({
          name: newVendor.name,
          email: newVendor.email,
          phone: newVendor.phone,
          vehicleTypes: newVendor.vehicleTypes,
          lanes: newVendor.lanes,
          role: UserRole.VENDOR
        });

        if (result.success) {
          const createdVendor = await FirebaseService.getVendor(result.vendorId!);
          if (createdVendor) {
            setVendors([...vendors, createdVendor]);
          }
        } else {
          setError('Failed to create vendor');
        }
      }

      resetVendorForm();
      setIsVendorModalOpen(false);
    } catch (err) {
      setError('An error occurred while saving vendor');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleEditVendor = (vendor: Vendor) => {
    setEditingVendorId(vendor.id);
    setNewVendor({
      name: vendor.name,
      email: vendor.email,
      phone: vendor.phone,
      vehicleTypes: vendor.vehicleTypes,
      lanes: vendor.lanes || []
    });
    setIsVendorModalOpen(true);
  };

  const handleDeleteVendor = async (vendorId: string) => {
    setLoading(true);
    try {
      const result = await FirebaseService.deleteVendor(vendorId);
      if (result.success) {
        setVendors(vendors.filter(v => v.id !== vendorId));
        setDeleteConfirmId(null);
      } else {
        setError('Failed to delete vendor');
      }
    } catch (err) {
      setError('An error occurred while deleting vendor');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const resetVendorForm = () => {
    setEditingVendorId(null);
    setNewVendor({
      name: '',
      email: '',
      phone: '',
      vehicleTypes: [],
      lanes: []
    });
    setVendorErrors({});
  };

  const handleAddLane = (e: React.FormEvent) => {
    e.preventDefault();
    const lane: Lane = {
      id: `L-${Date.now()}`,
      name: `${newLane.origin.toUpperCase()}-${newLane.destination.toUpperCase()}`,
      origin: newLane.origin,
      destination: newLane.destination
    };
    setLanes([...lanes, lane]);
    setNewLane({ origin: '', destination: '' });
    setIsLaneModalOpen(false);
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
                    <div key={bid.id} onClick={() => setSelectedBid(bid)} className={`bg-white border p-5 rounded-2xl cursor-pointer transition-all hover:shadow-lg relative overflow-hidden group ${isSelected ? 'border-blue-500 ring-4 ring-blue-50' : 'border-slate-200'}`}>
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
                      <button onClick={() => setSelectedBid(null)} className="p-1 hover:bg-white/10 rounded-lg"><X className="w-5 h-5" /></button>
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
        <div className="bg-white border border-slate-200 rounded-3xl overflow-hidden shadow-sm">
          <div className="p-8 border-b border-slate-100 flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold text-slate-800">Vendor Master</h2>
              <p className="text-sm text-slate-500">Manage transport partners and their operating lanes.</p>
            </div>
            <button 
              onClick={() => {
                resetVendorForm();
                setIsVendorModalOpen(true);
              }}
              className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-xl flex items-center space-x-2 transition-all font-bold shadow-lg shadow-blue-50"
            >
              <Plus className="w-5 h-5" />
              <span>Add New Vendor</span>
            </button>
          </div>

          {error && (
            <div className="bg-red-50 border-b border-red-200 px-8 py-4 flex items-start space-x-3">
              <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
              <p className="text-sm font-medium text-red-700">{error}</p>
            </div>
          )}

          {vendors.length === 0 ? (
            <div className="p-12 text-center">
              <Users className="w-12 h-12 text-slate-200 mx-auto mb-4" />
              <p className="text-slate-500 font-medium mb-4">No vendors added yet</p>
              <button
                onClick={() => {
                  resetVendorForm();
                  setIsVendorModalOpen(true);
                }}
                className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2.5 rounded-xl inline-flex items-center space-x-2 font-bold"
              >
                <Plus className="w-4 h-4" />
                <span>Create First Vendor</span>
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="bg-slate-50 text-slate-500 text-[10px] font-black uppercase tracking-widest">
                    <th className="px-8 py-4">Vendor Name</th>
                    <th className="px-8 py-4">Email</th>
                    <th className="px-8 py-4">Phone</th>
                    <th className="px-8 py-4">Vehicle Types</th>
                    <th className="px-8 py-4">Lanes</th>
                    <th className="px-8 py-4">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {vendors.map(vendor => (
                    <tr key={vendor.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-8 py-6">
                        <div className="flex items-center space-x-3">
                          <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center text-blue-600 font-bold text-sm">
                            {vendor.name.charAt(0).toUpperCase()}
                          </div>
                          <span className="font-bold text-slate-800">{vendor.name}</span>
                        </div>
                      </td>
                      <td className="px-8 py-6">
                        <div className="flex items-center space-x-1 text-slate-600 text-sm">
                          <Mail className="w-3.5 h-3.5 text-slate-400" />
                          <span>{vendor.email}</span>
                        </div>
                      </td>
                      <td className="px-8 py-6">
                        <div className="flex items-center space-x-1 text-slate-600 text-sm">
                          <Phone className="w-3.5 h-3.5 text-slate-400" />
                          <span>{vendor.phone}</span>
                        </div>
                      </td>
                      <td className="px-8 py-6">
                        <div className="flex flex-wrap gap-1.5">
                          {vendor.vehicleTypes.map(vt => (
                            <span key={vt} className="bg-blue-50 text-blue-700 text-[10px] font-bold px-2 py-1 rounded border border-blue-200">
                              {vt}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td className="px-8 py-6">
                        <div className="flex flex-wrap gap-1.5">
                          {vendor.lanes?.map(l => (
                            <span key={l} className="bg-slate-100 text-slate-600 text-[10px] font-bold px-2 py-1 rounded border border-slate-200">
                              {l}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td className="px-8 py-6">
                        <div className="flex items-center space-x-2">
                          <button
                            onClick={() => handleEditVendor(vendor)}
                            className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                            title="Edit vendor"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => setDeleteConfirmId(vendor.id)}
                            className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                            title="Delete vendor"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
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
            {lanes.map(lane => {
              const assignedVendors = vendors.filter(v => v.lanes?.includes(lane.name));
              return (
                <div key={lane.id} className="bg-slate-50 border border-slate-100 rounded-2xl p-6 hover:shadow-md transition-all group">
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-[10px] text-blue-500 font-black uppercase tracking-widest">{lane.id}</span>
                    <Route className="w-5 h-5 text-slate-300 group-hover:text-blue-500 transition-colors" />
                  </div>
                  <h4 className="text-lg font-bold text-slate-800 flex items-center mb-6">
                    {lane.origin} <ArrowRight className="w-3 h-3 mx-3 text-slate-300" /> {lane.destination}
                  </h4>
                  <div className="space-y-4">
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-slate-500 font-medium">Operating Vendors</span>
                      <span className="font-bold text-slate-800">{assignedVendors.length}</span>
                    </div>
                    <div className="flex -space-x-2 overflow-hidden">
                      {assignedVendors.map(v => (
                        <div key={v.id} title={v.name} className="inline-block h-8 w-8 rounded-full ring-2 ring-white bg-blue-500 flex items-center justify-center text-[10px] text-white font-bold uppercase">
                          {v.name.charAt(0)}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              );
            })}
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
                    <div className="space-y-1"><label className="text-xs text-slate-500 font-bold uppercase tracking-tight">Pick Up City</label><input className={inputClasses} value={newBid.pickupCity} onChange={e => setNewBid({...newBid, pickupCity: e.target.value})} /></div>
                    <div className="space-y-1"><label className="text-xs text-slate-500 font-bold uppercase tracking-tight">Pick Up Address</label><input className={inputClasses} value={newBid.pickupAddress} onChange={e => setNewBid({...newBid, pickupAddress: e.target.value})} /></div>
                    <div className="space-y-1"><label className="text-xs text-slate-500 font-bold uppercase tracking-tight">Delivery City</label><input className={inputClasses} value={newBid.deliveryCity} onChange={e => setNewBid({...newBid, deliveryCity: e.target.value})} /></div>
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
                  <div className="p-6 space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-x-8 gap-y-6">
                      <div className="space-y-1"><label className="text-xs text-slate-500 font-bold uppercase tracking-tight">Ceiling Rate *</label><input type="number" className={boxInputClasses} value={newBid.ceilingRate} onChange={e => setNewBid({...newBid, ceilingRate: parseInt(e.target.value) || 0})} /></div>
                      <div className="space-y-1"><label className="text-xs text-slate-500 font-bold uppercase tracking-tight">Step Value *</label><div className="flex items-center border border-blue-500 px-3 py-2 rounded bg-white"><input type="number" className="w-full text-sm text-slate-900 font-medium outline-none bg-transparent" value={newBid.stepValue} onChange={e => setNewBid({...newBid, stepValue: parseInt(e.target.value) || 0})} /></div></div>
                    </div>
                    <div className="border-t border-slate-100 pt-6">
                      <h5 className="text-[10px] font-bold text-slate-600 uppercase tracking-widest mb-4">Bid Schedule</h5>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-x-8 gap-y-6">
                        <div className="space-y-1"><label className="text-xs text-slate-500 font-bold uppercase tracking-tight">Bid Start Date *</label><input type="date" className="w-full border-b py-1.5 text-sm text-slate-900 font-medium outline-none" value={newBid.bidStartDate} onChange={e => setNewBid({...newBid, bidStartDate: e.target.value})} /></div>
                        <div className="space-y-1"><label className="text-xs text-slate-500 font-bold uppercase tracking-tight">Start Time *</label><input type="time" className="w-full border-b py-1.5 text-sm text-slate-900 font-medium outline-none" value={newBid.bidStartTime} onChange={e => setNewBid({...newBid, bidStartTime: e.target.value})} /></div>
                        <div></div>
                        <div className="space-y-1"><label className="text-xs text-slate-500 font-bold uppercase tracking-tight">Bid End Date *</label><input type="date" className="w-full border-b py-1.5 text-sm text-slate-900 font-medium outline-none" value={newBid.bidEndDate} onChange={e => setNewBid({...newBid, bidEndDate: e.target.value})} /></div>
                        <div className="space-y-1"><label className="text-xs text-slate-500 font-bold uppercase tracking-tight">End Time *</label><input type="time" className="w-full border-b py-1.5 text-sm text-slate-900 font-medium outline-none" value={newBid.bidEndTime} onChange={e => setNewBid({...newBid, bidEndTime: e.target.value})} /></div>
                      </div>
                    </div>
                    {bidValidationError && (
                      <div className="bg-red-50 border border-red-200 rounded-lg p-3 flex items-start space-x-3">
                        <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0 mt-0.5" />
                        <p className="text-xs font-medium text-red-700">{bidValidationError}</p>
                      </div>
                    )}
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
          <div className="bg-white rounded-3xl w-full max-w-2xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
            <div className="bg-white px-8 py-6 border-b flex items-center justify-between sticky top-0">
              <h3 className="text-xl font-bold text-slate-800">
                {editingVendorId ? 'Update Vendor' : 'Create New Vendor'}
              </h3>
              <button
                onClick={() => {
                  setIsVendorModalOpen(false);
                  resetVendorForm();
                }}
                className="p-1 hover:bg-slate-100 rounded-lg"
              >
                <X className="w-5 h-5 text-slate-400" />
              </button>
            </div>

            <form onSubmit={handleAddVendor} className="flex-grow overflow-y-auto p-8 space-y-6">
              {error && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-3 flex items-start space-x-3">
                  <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0 mt-0.5" />
                  <p className="text-xs font-medium text-red-700">{error}</p>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-6">
                {/* Vendor Name */}
                <div className="space-y-1">
                  <label className="text-xs text-slate-500 font-bold uppercase tracking-tight">Vendor Name *</label>
                  <input
                    className={`${boxInputClasses} ${vendorErrors.name ? 'border-red-500 focus:ring-red-500' : ''}`}
                    value={newVendor.name}
                    onChange={e => {
                      setNewVendor({...newVendor, name: e.target.value});
                      if (vendorErrors.name) {
                        setVendorErrors({...vendorErrors, name: ''});
                      }
                    }}
                    placeholder="e.g. Express Haulers Ltd."
                  />
                  {vendorErrors.name && <p className="text-xs text-red-600 mt-1">{vendorErrors.name}</p>}
                </div>

                {/* Email */}
                <div className="space-y-1">
                  <label className="text-xs text-slate-500 font-bold uppercase tracking-tight">Email *</label>
                  <input
                    type="email"
                    className={`${boxInputClasses} ${vendorErrors.email ? 'border-red-500 focus:ring-red-500' : ''}`}
                    value={newVendor.email}
                    onChange={e => {
                      setNewVendor({...newVendor, email: e.target.value});
                      if (vendorErrors.email) {
                        setVendorErrors({...vendorErrors, email: ''});
                      }
                    }}
                    placeholder="vendor@company.com"
                  />
                  {vendorErrors.email && <p className="text-xs text-red-600 mt-1">{vendorErrors.email}</p>}
                </div>

                {/* Phone */}
                <div className="space-y-1">
                  <label className="text-xs text-slate-500 font-bold uppercase tracking-tight">Phone *</label>
                  <input
                    type="tel"
                    className={`${boxInputClasses} ${vendorErrors.phone ? 'border-red-500 focus:ring-red-500' : ''}`}
                    value={newVendor.phone}
                    onChange={e => {
                      setNewVendor({...newVendor, phone: e.target.value});
                      if (vendorErrors.phone) {
                        setVendorErrors({...vendorErrors, phone: ''});
                      }
                    }}
                    placeholder="+91 9876543210"
                  />
                  {vendorErrors.phone && <p className="text-xs text-red-600 mt-1">{vendorErrors.phone}</p>}
                </div>
              </div>

              {/* Vehicle Types */}
              <div className="space-y-3">
                <label className="text-xs text-slate-500 font-bold uppercase tracking-tight">Vehicle Types *</label>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {Object.values(VehicleType).map(vehicleType => (
                    <label
                      key={vehicleType}
                      className="flex items-center space-x-2 cursor-pointer p-2 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors"
                    >
                      <input
                        type="checkbox"
                        checked={newVendor.vehicleTypes.includes(vehicleType)}
                        onChange={e => {
                          const updated = e.target.checked
                            ? [...newVendor.vehicleTypes, vehicleType]
                            : newVendor.vehicleTypes.filter(vt => vt !== vehicleType);
                          setNewVendor({...newVendor, vehicleTypes: updated});
                          if (vendorErrors.vehicleTypes) {
                            setVendorErrors({...vendorErrors, vehicleTypes: ''});
                          }
                        }}
                        className="w-4 h-4 text-blue-600 rounded"
                      />
                      <span className="text-sm font-medium text-slate-700">{vehicleType}</span>
                    </label>
                  ))}
                </div>
                {vendorErrors.vehicleTypes && (
                  <p className="text-xs text-red-600">{vendorErrors.vehicleTypes}</p>
                )}
              </div>

              {/* Lanes */}
              <div className="space-y-3">
                <label className="text-xs text-slate-500 font-bold uppercase tracking-tight">Assign Lanes *</label>
                <div className="max-h-40 overflow-y-auto border border-slate-200 rounded-xl p-4 space-y-2 bg-slate-50">
                  {lanes.length === 0 ? (
                    <p className="text-sm text-slate-500">No lanes available. Please create lanes first.</p>
                  ) : (
                    lanes.map(l => (
                      <label key={l.id} className="flex items-center space-x-3 cursor-pointer p-2 hover:bg-white rounded transition-colors">
                        <input
                          type="checkbox"
                          checked={newVendor.lanes.includes(l.name)}
                          onChange={e => {
                            const updated = e.target.checked
                              ? [...newVendor.lanes, l.name]
                              : newVendor.lanes.filter(item => item !== l.name);
                            setNewVendor({...newVendor, lanes: updated});
                            if (vendorErrors.lanes) {
                              setVendorErrors({...vendorErrors, lanes: ''});
                            }
                          }}
                          className="w-4 h-4 text-blue-600 rounded"
                        />
                        <span className="text-sm font-medium text-slate-700">{l.name}</span>
                      </label>
                    ))
                  )}
                </div>
                {vendorErrors.lanes && <p className="text-xs text-red-600">{vendorErrors.lanes}</p>}
              </div>
            </form>

            <div className="bg-slate-50 px-8 py-4 border-t flex space-x-3 sticky bottom-0">
              <button
                type="submit"
                onClick={handleAddVendor}
                disabled={loading}
                className="flex-grow bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white py-3 rounded-xl font-bold shadow-lg shadow-blue-100 transition-all"
              >
                {loading ? 'Saving...' : editingVendorId ? 'Update Vendor' : 'Create Vendor'}
              </button>
              <button
                type="button"
                onClick={() => {
                  setIsVendorModalOpen(false);
                  resetVendorForm();
                }}
                className="bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 px-6 rounded-xl font-bold transition-all"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirmId && (
        <div className="fixed inset-0 z-[101] bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-sm overflow-hidden shadow-2xl flex flex-col p-8">
            <div className="flex justify-center mb-4">
              <div className="bg-red-50 p-4 rounded-full">
                <AlertCircle className="w-8 h-8 text-red-600" />
              </div>
            </div>
            <h3 className="text-xl font-bold text-slate-800 text-center mb-2">Delete Vendor?</h3>
            <p className="text-sm text-slate-600 text-center mb-6">
              This vendor will be marked as deleted and cannot be used for bidding. This action cannot be undone.
            </p>
            <div className="flex space-x-3">
              <button
                onClick={() => setDeleteConfirmId(null)}
                className="flex-grow bg-slate-100 hover:bg-slate-200 text-slate-700 py-2.5 rounded-xl font-bold transition-all"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDeleteVendor(deleteConfirmId)}
                disabled={loading}
                className="flex-grow bg-red-600 hover:bg-red-700 disabled:bg-red-400 text-white py-2.5 rounded-xl font-bold transition-all"
              >
                {loading ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Lane Master Modal */}
      {isLaneModalOpen && (
        <div className="fixed inset-0 z-[100] bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-md overflow-hidden shadow-2xl flex flex-col p-8">
            <h3 className="text-xl font-bold text-slate-800 mb-6">Define New Route</h3>
            <form onSubmit={handleAddLane} className="space-y-6">
              <div className="space-y-1">
                <label className="text-xs text-slate-500 font-bold uppercase tracking-tight">Origin City</label>
                <input required className={boxInputClasses} value={newLane.origin} onChange={e => setNewLane({...newLane, origin: e.target.value})} placeholder="e.g. Hyderabad" />
              </div>
              <div className="space-y-1">
                <label className="text-xs text-slate-500 font-bold uppercase tracking-tight">Destination City</label>
                <input required className={boxInputClasses} value={newLane.destination} onChange={e => setNewLane({...newLane, destination: e.target.value})} placeholder="e.g. Pune" />
              </div>
              <div className="flex space-x-3 pt-4">
                <button type="submit" className="flex-grow bg-blue-600 text-white py-3 rounded-xl font-bold shadow-lg shadow-blue-50">Register Lane</button>
                <button type="button" onClick={() => setIsLaneModalOpen(false)} className="bg-slate-100 text-slate-600 px-6 rounded-xl font-bold">Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminDashboard;
