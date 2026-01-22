
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { 
  Plus, 
  ArrowRight, 
  MapPin, 
  Clock, 
  Truck, 
  Users, 
  BarChart3,
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
  TrendingDown
} from 'lucide-react';
import type { ShipmentBid, User, Lane } from '../types';
import { BidStatus, VehicleType, LoadType, UserRole } from '../types';
import { useVendors as useFirebaseVendors, useLanes as useFirebaseLanes } from '../src/hooks/useFirebaseData';
import { FirebaseService } from '../src/services/firebaseService';
import VendorMaster from '../src/components/admin/VendorMaster';
import LaneMaster from '../src/components/admin/LaneMaster';
import AdminBidReview from '../src/components/bidding/AdminBidReview';


interface AdminDashboardProps {
  bids: ShipmentBid[];
  onCreateBid: (bid: Partial<ShipmentBid>) => void;
  onCloseBid: (id: string) => void;
  notifications?: User[]; // Changed from Notification[] - unused prop
}

type AdminTab = 'AUCTIONS' | 'VENDORS' | 'LANES';

const AdminDashboard: React.FC<AdminDashboardProps> = ({ 
  bids, 
  onCreateBid, 
  onCloseBid
}) => {
  const [activeTab, setActiveTab] = useState<AdminTab>('AUCTIONS');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  
  const [selectedBid, setSelectedBid] = useState<ShipmentBid | null>(null);
  const [bidToDelete, setBidToDelete] = useState<ShipmentBid | null>(null);
  const [bidToEdit, setBidToEdit] = useState<ShipmentBid | null>(null);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [now, setNow] = useState(new Date());

  // Loading states
  const [isUpdating, setIsUpdating] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [feedbackMessage, setFeedbackMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Use Firebase for vendors and lanes
  const { vendors } = useFirebaseVendors();
  const { lanes } = useFirebaseLanes();

  // Form state for edit modal
  const [editFormData, setEditFormData] = useState<Partial<ShipmentBid>>({});

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (feedbackMessage) {
      const timer = setTimeout(() => setFeedbackMessage(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [feedbackMessage]);

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

  const editPickupCities = useMemo(() => {
    const uniqueOrigins = [...new Set(lanes.map(lane => lane.origin))];
    return uniqueOrigins.sort();
  }, [lanes]);

  const editDeliveryCities = useMemo(() => {
    if (!editFormData.pickupCity) return [];
    const availableDestinations = lanes
      .filter(lane => lane.origin === editFormData.pickupCity)
      .map(lane => lane.destination);
    return [...new Set(availableDestinations)].sort();
  }, [lanes, editFormData.pickupCity]);

  // Callback handlers
  const getBidLifecycleStatus = useCallback((bid: ShipmentBid): string => {
    if (bid.status === BidStatus.FINALIZED || bid.status === BidStatus.ASSIGNED) return "Completed";
    const start = new Date(`${bid.bidStartDate}T${bid.bidStartTime}`);
    const end = new Date(`${bid.bidEndDate}T${bid.bidEndTime}`);
    if (now < start) return "Not Started Yet";
    if (now >= end || bid.status === BidStatus.CLOSED) return "Completed";
    return "In Process";
  }, [now]);

  const getTimeRemaining = useCallback((bid: ShipmentBid): string => {
    const end = new Date(`${bid.bidEndDate}T${bid.bidEndTime}`);
    const diff = end.getTime() - now.getTime();
    if (diff <= 0) return "Ended";
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const mins = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    const secs = Math.floor((diff % (1000 * 60)) / 1000);
    return `${hours}h ${mins}m ${secs}s`;
  }, [now]);

  const activeBidsCount = useMemo(() => {
    return bids.filter(b => getBidLifecycleStatus(b) === "In Process").length;
  }, [bids, getBidLifecycleStatus]);

  const toggleSection = (section: keyof typeof expandedSections) => {
    setExpandedSections(prev => ({ ...prev, [section]: !prev[section] }));
  };

  // ─────────────────────────────────────────────────
  // CREATE BID HANDLER
  // ─────────────────────────────────────────────────
  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const processedBid = {
      ...newBid,
      origin: newBid.pickupCity || newBid.pickupLocation || 'Unknown',
      destination: newBid.deliveryCity || newBid.deliveryLocation || 'Unknown',
      materialType: newBid.product || 'Goods',
      lane: `${(newBid.pickupCity || '').toUpperCase()} - ${(newBid.deliveryCity || '').toUpperCase()}`.trim(),
      deliveryTimeline: 'Standard',
      pickupTime: `${newBid.pickupDate}T10:00:00`,
      endTime: `${newBid.bidEndDate}T${newBid.bidEndTime}:00`,
    };
    onCreateBid(processedBid);
    setIsModalOpen(false);
    setFeedbackMessage({ type: 'success', text: 'Bid created successfully!' });
    // Reset form
    setNewBid({
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
  };

  // ─────────────────────────────────────────────────
  // EDIT BID HANDLERS
  // ─────────────────────────────────────────────────
  const handleEditClick = (bid: ShipmentBid) => {
    setBidToEdit(bid);
    setEditFormData({ ...bid });
    setIsEditModalOpen(true);
    setSelectedBid(null);
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!bidToEdit?.id) return;

    setIsUpdating(true);
    try {
      const result = await FirebaseService.updateShipmentBid(bidToEdit.id, editFormData);
      if (result.success) {
        setFeedbackMessage({ type: 'success', text: 'Bid updated successfully!' });
        setIsEditModalOpen(false);
        setBidToEdit(null);
        setEditFormData({});
      } else {
        setFeedbackMessage({ type: 'error', text: 'Failed to update bid. Please try again.' });
      }
    } catch (error) {
      console.error('Error updating bid:', error);
      setFeedbackMessage({ type: 'error', text: 'An error occurred while updating the bid.' });
    } finally {
      setIsUpdating(false);
    }
  };

  const handleEditCancel = () => {
    setIsEditModalOpen(false);
    setBidToEdit(null);
    setEditFormData({});
  };

  // ─────────────────────────────────────────────────
  // DELETE BID HANDLERS
  // ─────────────────────────────────────────────────
  const handleDeleteClick = (bid: ShipmentBid) => {
    setBidToDelete(bid);
    setIsDeleteConfirmOpen(true);
    setSelectedBid(null);
  };

  const handleDeleteConfirm = async () => {
    if (!bidToDelete?.id) return;

    setIsDeleting(true);
    try {
      const result = await FirebaseService.deleteShipmentBid(bidToDelete.id);
      if (result.success) {
        setFeedbackMessage({ type: 'success', text: 'Bid deleted successfully!' });
        setIsDeleteConfirmOpen(false);
        setBidToDelete(null);
      } else {
        setFeedbackMessage({ type: 'error', text: 'Failed to delete bid. Please try again.' });
      }
    } catch (error) {
      console.error('Error deleting bid:', error);
      setFeedbackMessage({ type: 'error', text: 'An error occurred while deleting the bid.' });
    } finally {
      setIsDeleting(false);
    }
  };

  const handleDeleteCancel = () => {
    setIsDeleteConfirmOpen(false);
    setBidToDelete(null);
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
                      
                      {/* Action buttons - top right */}
                      <div className="absolute top-3 right-3 flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleEditClick(bid);
                          }}
                          className="p-1.5 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors"
                          title="Edit bid"
                        >
                          <Edit2 className="w-4 h-4 text-blue-600" />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteClick(bid);
                          }}
                          className="p-1.5 bg-red-50 hover:bg-red-100 rounded-lg transition-colors"
                          title="Delete bid"
                        >
                          <Trash2 className="w-4 h-4 text-red-600" />
                        </button>
                      </div>

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

                    {/* Action Buttons */}
                    {selectedBid && selectedBid.status === BidStatus.OPEN && (selectedBid.offers || []).length > 0 && (
                      <div className="pt-6 border-t border-slate-50">
                        <div className="space-y-3">
                          <h5 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 flex items-center">
                            <Settings className="w-3 h-3 mr-1.5" /> Actions
                          </h5>
                          <button
                            onClick={() => {
                              if (window.confirm('Are you sure you want to close this bid early? This will end the auction immediately.')) {
                                onCloseBid(selectedBid.id);
                                setSelectedBid(null);
                              }
                            }}
                            className="w-full bg-rose-600 hover:bg-rose-700 text-white px-4 py-3 rounded-xl font-bold text-sm transition-all shadow-lg shadow-rose-100 flex items-center justify-center space-x-2"
                          >
                            <X className="w-4 h-4" />
                            <span>Close Bid Early</span>
                          </button>
                          <p className="text-[9px] text-slate-400 text-center leading-tight">
                            This will end the auction immediately and finalize with the current best offer.
                          </p>
                        </div>
                      </div>
                    )}
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

          {/* Vendor Bids Section */}
          <div className="mt-12 bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
            <h2 className="text-2xl font-bold text-slate-900 mb-6">Vendor Bids</h2>
            <AdminBidReview onApprovalComplete={() => {}} />
          </div>
        </>
      )}

      {activeTab === 'VENDORS' && (
        <VendorMaster adminId="admin-user" />
      )}

      {activeTab === 'LANES' && (
        <LaneMaster adminId="admin-user" />
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

      {/* Edit Bid Modal */}
      {isEditModalOpen && bidToEdit && (
        <div className="fixed inset-0 z-[100] bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#f3f4f6] rounded-xl w-full max-w-6xl max-h-[90vh] overflow-hidden shadow-2xl flex flex-col">
            <div className="bg-white px-6 py-4 border-b flex items-center justify-between">
              <h3 className="text-xl font-medium text-slate-700">Edit Bid - {bidToEdit.id}</h3>
              <button onClick={handleEditCancel} className="p-1 hover:bg-slate-100 rounded-lg"><X className="w-5 h-5 text-slate-400" /></button>
            </div>
            <form onSubmit={handleEditSubmit} className="flex-grow overflow-y-auto p-6 space-y-6">
              <div className="bg-white rounded-lg border border-slate-200 overflow-hidden shadow-sm">
                <button type="button" onClick={() => toggleSection('summary')} className="w-full px-6 py-3 flex items-center justify-between border-b hover:bg-slate-50 transition-colors">
                  <span className="text-sm font-bold text-slate-700">Request Summary</span>
                  {expandedSections.summary ? <ChevronUp className="w-4 h-4 text-slate-400"/> : <ChevronDown className="w-4 h-4 text-slate-400"/>}
                </button>
                {expandedSections.summary && (
                  <div className="p-6 grid grid-cols-1 md:grid-cols-3 gap-x-8 gap-y-6">
                    <div className="space-y-1">
                      <label className="text-xs text-slate-500 font-bold uppercase tracking-tight">Request by Customer</label>
                      <input className={inputClasses} value={editFormData.requestByCustomer || ''} onChange={e => setEditFormData({...editFormData, requestByCustomer: e.target.value})} />
                    </div>
                    <div className="space-y-1 relative">
                      <label className="text-xs text-slate-500 font-bold uppercase tracking-tight">Request Date</label>
                      <div className="flex items-center border-b border-slate-200"><input type="date" className="w-full py-1.5 text-sm text-slate-900 font-medium outline-none bg-transparent" value={editFormData.requestDate || ''} onChange={e => setEditFormData({...editFormData, requestDate: e.target.value})} /><Calendar className="w-4 h-4 text-slate-400 ml-2" /></div>
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs text-slate-500 font-bold uppercase tracking-tight">Load Type</label>
                      <select className={inputClasses} value={editFormData.loadType || LoadType.FTL} onChange={e => setEditFormData({...editFormData, loadType: e.target.value as LoadType})}><option value={LoadType.FTL}>FTL</option><option value={LoadType.LTL}>LTL</option></select>
                    </div>
                    <div className="space-y-1"><label className="text-xs text-slate-500 font-bold uppercase tracking-tight">Capacity</label><input className={inputClasses} value={editFormData.capacity || ''} onChange={e => setEditFormData({...editFormData, capacity: e.target.value})} /></div>
                    <div className="space-y-1"><label className="text-xs text-slate-500 font-bold uppercase tracking-tight">Product</label><input className={inputClasses} value={editFormData.product || ''} onChange={e => setEditFormData({...editFormData, product: e.target.value})} /></div>
                    <div className="space-y-1"><label className="text-xs text-slate-500 font-bold uppercase tracking-tight">No of Packages</label><input type="number" className={inputClasses} value={editFormData.noOfPackages || 0} onChange={e => setEditFormData({...editFormData, noOfPackages: parseInt(e.target.value) || 0})} /></div>
                    <div className="space-y-1"><label className="text-xs text-slate-500 font-bold uppercase tracking-tight">Weight (Kg)</label><input type="number" className={inputClasses} value={editFormData.weightKg || 0} onChange={e => setEditFormData({...editFormData, weightKg: parseInt(e.target.value) || 0})} /></div>
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
                        value={editFormData.pickupCity || ''} 
                        onChange={e => setEditFormData({...editFormData, pickupCity: e.target.value, deliveryCity: ''})}
                      >
                        <option value="">Select pickup city</option>
                        {editPickupCities.map(city => (
                          <option key={city} value={city}>{city}</option>
                        ))}
                      </select>
                    </div>
                    <div className="space-y-1"><label className="text-xs text-slate-500 font-bold uppercase tracking-tight">Pick Up Address</label><input className={inputClasses} value={editFormData.pickupAddress || ''} onChange={e => setEditFormData({...editFormData, pickupAddress: e.target.value})} /></div>
                    <div className="space-y-1">
                      <label className="text-xs text-slate-500 font-bold uppercase tracking-tight">Delivery City</label>
                      <select 
                        className={inputClasses} 
                        value={editFormData.deliveryCity || ''} 
                        onChange={e => setEditFormData({...editFormData, deliveryCity: e.target.value})}
                        disabled={!editFormData.pickupCity}
                      >
                        <option value="">{editFormData.pickupCity ? 'Select delivery city' : 'Select pickup city first'}</option>
                        {editDeliveryCities.map(city => (
                          <option key={city} value={city}>{city}</option>
                        ))}
                      </select>
                    </div>
                    <div className="space-y-1"><label className="text-xs text-slate-500 font-bold uppercase tracking-tight">Delivery Address</label><input className={inputClasses} value={editFormData.deliveryAddress || ''} onChange={e => setEditFormData({...editFormData, deliveryAddress: e.target.value})} /></div>
                    <div className="space-y-1"><label className="text-xs text-slate-500 font-bold uppercase tracking-tight">Pickup Date</label><input type="date" className={inputClasses} value={editFormData.pickupDate || ''} onChange={e => setEditFormData({...editFormData, pickupDate: e.target.value})} /></div>
                    <div className="space-y-1"><label className="text-xs text-slate-500 font-bold uppercase tracking-tight">Delivery Date</label><input type="date" className={inputClasses} value={editFormData.deliveryDate || ''} onChange={e => setEditFormData({...editFormData, deliveryDate: e.target.value})} /></div>
                  </div>
                )}
              </div>

              {/* Auction Section */}
              <div className="bg-white rounded-lg border border-slate-200 overflow-hidden shadow-sm">
                <button type="button" onClick={() => toggleSection('auction')} className="w-full px-6 py-3 flex items-center justify-between border-b hover:bg-slate-50 transition-colors">
                  <span className="text-sm font-bold text-slate-700">Auction Parameters</span>
                  {expandedSections.auction ? <ChevronUp className="w-4 h-4 text-slate-400"/> : <ChevronDown className="w-4 h-4 text-slate-400"/>}
                </button>
                {expandedSections.auction && (
                  <div className="p-6 grid grid-cols-1 md:grid-cols-3 gap-x-8 gap-y-6">
                    <div className="space-y-1"><label className="text-xs text-slate-500 font-bold uppercase tracking-tight">Reserved Price</label><input type="number" className={boxInputClasses} value={editFormData.reservedPrice || 0} onChange={e => setEditFormData({...editFormData, reservedPrice: parseInt(e.target.value) || 0})} /></div>
                    <div className="space-y-1"><label className="text-xs text-slate-500 font-bold uppercase tracking-tight">Ceiling Rate</label><input type="number" className={boxInputClasses} value={editFormData.ceilingRate || 0} onChange={e => setEditFormData({...editFormData, ceilingRate: parseInt(e.target.value) || 0})} /></div>
                    <div className="space-y-1"><label className="text-xs text-slate-500 font-bold uppercase tracking-tight">Step Value</label><input type="number" className={boxInputClasses} value={editFormData.stepValue || 0} onChange={e => setEditFormData({...editFormData, stepValue: parseInt(e.target.value) || 0})} /></div>
                    <div className="space-y-1"><label className="text-xs text-slate-500 font-bold uppercase tracking-tight">Bid Start Date</label><input type="date" className={inputClasses} value={editFormData.bidStartDate || ''} onChange={e => setEditFormData({...editFormData, bidStartDate: e.target.value})} /></div>
                    <div className="space-y-1"><label className="text-xs text-slate-500 font-bold uppercase tracking-tight">Start Time</label><input type="time" className={inputClasses} value={editFormData.bidStartTime || ''} onChange={e => setEditFormData({...editFormData, bidStartTime: e.target.value})} /></div>
                    <div className="space-y-1"><label className="text-xs text-slate-500 font-bold uppercase tracking-tight">Bid End Date</label><input type="date" className={inputClasses} value={editFormData.bidEndDate || ''} onChange={e => setEditFormData({...editFormData, bidEndDate: e.target.value})} /></div>
                    <div className="space-y-1"><label className="text-xs text-slate-500 font-bold uppercase tracking-tight">End Time</label><input type="time" className={inputClasses} value={editFormData.bidEndTime || ''} onChange={e => setEditFormData({...editFormData, bidEndTime: e.target.value})} /></div>
                  </div>
                )}
              </div>
            </form>
            <div className="bg-white px-6 py-4 border-t flex space-x-3">
              <button type="submit" onClick={handleEditSubmit} disabled={isUpdating} className="bg-[#4f46e5] text-white px-8 py-2 rounded-md font-bold text-sm hover:bg-[#4338ca] shadow-lg shadow-indigo-100 disabled:opacity-50 disabled:cursor-not-allowed">
                {isUpdating ? 'Updating...' : 'Save Changes'}
              </button>
              <button type="button" onClick={handleEditCancel} disabled={isUpdating} className="bg-white border text-slate-600 px-8 py-2 rounded-md font-bold text-sm hover:bg-slate-50 disabled:opacity-50">Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      {isDeleteConfirmOpen && bidToDelete && (
        <div className="fixed inset-0 z-[101] bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl overflow-hidden">
            <div className="p-6 text-center">
              <div className="mx-auto w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mb-4">
                <AlertCircle className="w-6 h-6 text-red-600" />
              </div>
              <h3 className="text-lg font-bold text-slate-900 mb-2">Delete Bid?</h3>
              <p className="text-slate-600 text-sm mb-6">
                Are you sure you want to delete bid <span className="font-semibold">{bidToDelete.id}</span>? This action cannot be undone.
              </p>
              <p className="text-slate-500 text-xs mb-6">
                <strong>Route:</strong> {bidToDelete.origin} → {bidToDelete.destination}
              </p>
              <div className="flex gap-3">
                <button
                  onClick={handleDeleteCancel}
                  disabled={isDeleting}
                  className="flex-1 px-4 py-2 border border-slate-200 text-slate-700 rounded-lg font-semibold hover:bg-slate-50 transition-colors disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDeleteConfirm}
                  disabled={isDeleting}
                  className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg font-semibold hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isDeleting ? 'Deleting...' : 'Delete'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Feedback Toast */}
      {feedbackMessage && (
        <div className={`fixed bottom-4 right-4 px-4 py-3 rounded-lg text-sm font-semibold text-white shadow-lg animate-pulse ${feedbackMessage.type === 'success' ? 'bg-emerald-500' : 'bg-red-500'}`}>
          {feedbackMessage.text}
        </div>
      )}

      {/* Vendor Master Modal */}
      {/* Removed - use dedicated Vendor Master component */}

      {/* Lane Master Modal */}
      {/* Removed - use dedicated Lane Master component */}
    </div>
  );
};

export default AdminDashboard;
