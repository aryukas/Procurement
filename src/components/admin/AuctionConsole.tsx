// src/components/admin/AuctionConsole.tsx
import React, { useState, useMemo } from 'react';
import {
  Plus,
  Edit2,
  Trash2,
  X,
  AlertCircle,
  CheckCircle2,
  Clock,
  MapPin,
  Truck,
} from 'lucide-react';
import type { AuctionMaster, LaneMaster } from '../../../types';
import { AuctionStatus, VehicleType, LoadType } from '../../../types';
import { AuctionService } from '../../services/auctionService';
import { useAuctions } from '../../hooks/useAuctions';
import { useLanes } from '../../hooks/useLanes';

interface AuctionConsoleProps {
  adminId: string;
}

type ModalMode = 'create' | 'edit' | 'delete' | null;

const AuctionConsole: React.FC<AuctionConsoleProps> = ({ adminId }) => {
  const { auctions, loading } = useAuctions();
  const { lanes, loading: lanesLoading } = useLanes();

  const [modalMode, setModalMode] = useState<ModalMode>(null);
  const [selectedAuction, setSelectedAuction] = useState<AuctionMaster | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<AuctionStatus | 'ALL'>('ALL');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Form state
  const [formData, setFormData] = useState<Partial<AuctionMaster>>({
    laneId: '',
    vehicleType: VehicleType.TRUCK,
    loadType: LoadType.FTL,
    materialType: '',
    capacity: '',
    bidStartDate: new Date().toISOString().split('T')[0],
    bidStartTime: '09:00',
    bidEndDate: new Date().toISOString().split('T')[0],
    bidEndTime: '17:00',
    ceilingPrice: 0,
    stepValue: 0,
    status: AuctionStatus.DRAFT,
  });

  // Filtered auctions
  const filteredAuctions = useMemo(() => {
    return auctions.filter((auction) => {
      const lane = lanes.find((l) => l.id === auction.laneId);
      const laneName = lane ? `${lane.origin} - ${lane.destination}` : 'Unknown Lane';
      const matchesSearch = laneName.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesStatus = filterStatus === 'ALL' || auction.status === filterStatus;
      return matchesSearch && matchesStatus;
    });
  }, [auctions, lanes, searchTerm, filterStatus]);

  const getStatusColor = (status: AuctionStatus) => {
    const colors = {
      [AuctionStatus.DRAFT]: 'bg-gray-100 text-gray-700',
      [AuctionStatus.ACTIVE]: 'bg-green-100 text-green-700',
      [AuctionStatus.CLOSED]: 'bg-blue-100 text-blue-700',
      [AuctionStatus.CANCELLED]: 'bg-red-100 text-red-700',
    };
    return colors[status];
  };

  const openCreateModal = () => {
    setFormData({
      laneId: '',
      vehicleType: VehicleType.TRUCK,
      loadType: LoadType.FTL,
      materialType: '',
      capacity: '',
      bidStartDate: new Date().toISOString().split('T')[0],
      bidStartTime: '09:00',
      bidEndDate: new Date().toISOString().split('T')[0],
      bidEndTime: '17:00',
      ceilingPrice: 0,
      stepValue: 0,
      status: AuctionStatus.DRAFT,
    });
    setError(null);
    setModalMode('create');
  };

  const openEditModal = (auction: AuctionMaster) => {
    setSelectedAuction(auction);
    setFormData({ ...auction });
    setError(null);
    setModalMode('edit');
  };

  const openDeleteModal = (auction: AuctionMaster) => {
    setSelectedAuction(auction);
    setError(null);
    setModalMode('delete');
  };

  const validateForm = () => {
    if (!formData.laneId) {
      setError('Lane is required');
      return false;
    }

    const startDateTime = new Date(`${formData.bidStartDate}T${formData.bidStartTime}`);
    const endDateTime = new Date(`${formData.bidEndDate}T${formData.bidEndTime}`);

    if (startDateTime >= endDateTime) {
      setError('Bid start date/time must be before end date/time');
      return false;
    }

    if (!formData.capacity || formData.capacity.trim() === '') {
      setError('Capacity is required');
      return false;
    }

    if ((formData.ceilingPrice || 0) <= 0) {
      setError('Ceiling price must be positive');
      return false;
    }

    if ((formData.stepValue || 0) <= 0) {
      setError('Step value must be positive');
      return false;
    }

    return true;
  };

  const handleSave = async () => {
    if (!validateForm()) return;

    try {
      if (modalMode === 'create') {
        const result = await AuctionService.createAuction({
          ...(formData as any),
          createdBy: adminId,
        });

        if (result.success) {
          setSuccess('Auction created successfully');
          setModalMode(null);
          setTimeout(() => setSuccess(null), 3000);
        } else {
          setError(result.error?.message || 'Failed to create auction');
        }
      } else if (modalMode === 'edit' && selectedAuction) {
        const result = await AuctionService.updateAuction(selectedAuction.id, {
          ...formData,
          createdBy: selectedAuction.createdBy,
        } as any);

        if (result.success) {
          setSuccess('Auction updated successfully');
          setModalMode(null);
          setTimeout(() => setSuccess(null), 3000);
        } else {
          setError(result.error?.message || 'Failed to update auction');
        }
      }
    } catch (err: any) {
      setError(err.message || 'An error occurred');
    }
  };

  const handleDelete = async () => {
    if (!selectedAuction) return;

    try {
      const result = await AuctionService.deleteAuction(selectedAuction.id);

      if (result.success) {
        setSuccess('Auction deleted successfully');
        setModalMode(null);
        setTimeout(() => setSuccess(null), 3000);
      } else {
        setError(result.error?.message || 'Failed to delete auction');
      }
    } catch (err: any) {
      setError(err.message || 'An error occurred');
    }
  };

  const getLaneDisplay = (laneId: string) => {
    const lane = lanes.find((l) => l.id === laneId);
    return lane ? `${lane.origin} - ${lane.destination}` : 'Unknown';
  };

  const getButtonDisabledReason = (auction: AuctionMaster): string | null => {
    if (auction.status === AuctionStatus.ACTIVE) {
      return 'Cannot edit active auction';
    }
    if (auction.status === AuctionStatus.CLOSED || auction.status === AuctionStatus.CANCELLED) {
      return 'Cannot edit closed or cancelled auction';
    }
    return null;
  };

  if (loading || lanesLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-gray-500">Loading auctions...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Auction Console</h2>
          <p className="text-sm text-gray-600 mt-1">Manage shipment auctions and bids</p>
        </div>
        <button
          onClick={openCreateModal}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
        >
          <Plus size={20} />
          Create Auction
        </button>
      </div>

      {/* Alerts */}
      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg flex items-gap-3">
          <AlertCircle className="text-red-600 flex-shrink-0" size={20} />
          <p className="text-red-700 text-sm">{error}</p>
        </div>
      )}

      {success && (
        <div className="p-4 bg-green-50 border border-green-200 rounded-lg flex items-gap-3">
          <CheckCircle2 className="text-green-600 flex-shrink-0" size={20} />
          <p className="text-green-700 text-sm">{success}</p>
        </div>
      )}

      {/* Filters */}
      <div className="flex gap-4">
        <input
          type="text"
          placeholder="Search by lane..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value as AuctionStatus | 'ALL')}
          className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="ALL">All Status</option>
          <option value={AuctionStatus.DRAFT}>Draft</option>
          <option value={AuctionStatus.ACTIVE}>Active</option>
          <option value={AuctionStatus.CLOSED}>Closed</option>
          <option value={AuctionStatus.CANCELLED}>Cancelled</option>
        </select>
      </div>

      {/* Auctions Table */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Lane</th>
              <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Vehicle Type</th>
              <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Capacity</th>
              <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Ceiling Price</th>
              <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Status</th>
              <th className="px-6 py-3 text-right text-sm font-semibold text-gray-900">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {filteredAuctions.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-6 py-8 text-center text-gray-500">
                  No auctions found
                </td>
              </tr>
            ) : (
              filteredAuctions.map((auction) => (
                <tr key={auction.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 text-sm text-gray-900 font-medium">
                    {getLaneDisplay(auction.laneId)}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600">{auction.vehicleType}</td>
                  <td className="px-6 py-4 text-sm text-gray-600">{auction.capacity}</td>
                  <td className="px-6 py-4 text-sm text-gray-900 font-medium">₹{auction.ceilingPrice}</td>
                  <td className="px-6 py-4 text-sm">
                    <span className={`px-3 py-1 rounded-full text-xs font-semibold ${getStatusColor(auction.status)}`}>
                      {auction.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex justify-end gap-2">
                      <button
                        onClick={() => openEditModal(auction)}
                        disabled={!!getButtonDisabledReason(auction)}
                        title={getButtonDisabledReason(auction) || ''}
                        className="p-2 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded disabled:opacity-50 disabled:cursor-not-allowed transition"
                      >
                        <Edit2 size={18} />
                      </button>
                      <button
                        onClick={() => openDeleteModal(auction)}
                        className="p-2 text-gray-600 hover:text-red-600 hover:bg-red-50 rounded transition"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Create/Edit Modal */}
      {(modalMode === 'create' || modalMode === 'edit') && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-lg max-w-2xl w-full mx-4 max-h-screen overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex justify-between items-center">
              <h3 className="text-lg font-bold text-gray-900">
                {modalMode === 'create' ? 'Create Auction' : 'Edit Auction'}
              </h3>
              <button
                onClick={() => setModalMode(null)}
                className="text-gray-500 hover:text-gray-700"
              >
                <X size={24} />
              </button>
            </div>

            <div className="p-6 space-y-4">
              {/* Lane Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Lane *</label>
                <select
                  value={formData.laneId || ''}
                  onChange={(e) => setFormData({ ...formData, laneId: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  disabled={modalMode === 'edit'}
                >
                  <option value="">Select a lane</option>
                  {lanes.map((lane) => (
                    <option key={lane.id} value={lane.id}>
                      {lane.origin} - {lane.destination}
                    </option>
                  ))}
                </select>
              </div>

              {/* Vehicle Type */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Vehicle Type *</label>
                <select
                  value={formData.vehicleType || ''}
                  onChange={(e) => setFormData({ ...formData, vehicleType: e.target.value as VehicleType })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {Object.values(VehicleType).map((type) => (
                    <option key={type} value={type}>
                      {type}
                    </option>
                  ))}
                </select>
              </div>

              {/* Load Type */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Load Type *</label>
                <select
                  value={formData.loadType || ''}
                  onChange={(e) => setFormData({ ...formData, loadType: e.target.value as LoadType })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {Object.values(LoadType).map((type) => (
                    <option key={type} value={type}>
                      {type}
                    </option>
                  ))}
                </select>
              </div>

              {/* Material Type */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Material Type *</label>
                <input
                  type="text"
                  value={formData.materialType || ''}
                  onChange={(e) => setFormData({ ...formData, materialType: e.target.value })}
                  placeholder="e.g., Electronics, Textiles"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* Capacity */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Capacity *</label>
                <input
                  type="text"
                  value={formData.capacity || ''}
                  onChange={(e) => setFormData({ ...formData, capacity: e.target.value })}
                  placeholder="e.g., 20 Tons"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* Ceiling Price */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Ceiling Price (₹) *</label>
                <input
                  type="number"
                  value={formData.ceilingPrice || 0}
                  onChange={(e) => setFormData({ ...formData, ceilingPrice: parseFloat(e.target.value) })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* Step Value */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Step Value (₹) *</label>
                <input
                  type="number"
                  value={formData.stepValue || 0}
                  onChange={(e) => setFormData({ ...formData, stepValue: parseFloat(e.target.value) })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* Bid Start Date & Time */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Bid Start Date *</label>
                  <input
                    type="date"
                    value={formData.bidStartDate || ''}
                    onChange={(e) => setFormData({ ...formData, bidStartDate: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Bid Start Time *</label>
                  <input
                    type="time"
                    value={formData.bidStartTime || ''}
                    onChange={(e) => setFormData({ ...formData, bidStartTime: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              {/* Bid End Date & Time */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Bid End Date *</label>
                  <input
                    type="date"
                    value={formData.bidEndDate || ''}
                    onChange={(e) => setFormData({ ...formData, bidEndDate: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Bid End Time *</label>
                  <input
                    type="time"
                    value={formData.bidEndTime || ''}
                    onChange={(e) => setFormData({ ...formData, bidEndTime: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              {/* Status */}
              {modalMode === 'edit' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Status *</label>
                  <select
                    value={formData.status || ''}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value as AuctionStatus })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    {Object.values(AuctionStatus).map((status) => (
                      <option key={status} value={status}>
                        {status}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="border-t border-gray-200 px-6 py-4 bg-gray-50 flex justify-end gap-3">
              <button
                onClick={() => setModalMode(null)}
                className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
              >
                {modalMode === 'create' ? 'Create' : 'Update'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {modalMode === 'delete' && selectedAuction && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-lg max-w-md w-full mx-4">
            <div className="p-6">
              <div className="flex items-center justify-center w-12 h-12 mx-auto bg-red-100 rounded-full">
                <AlertCircle className="text-red-600" size={24} />
              </div>
              <h3 className="mt-4 text-lg font-bold text-gray-900 text-center">Delete Auction?</h3>
              <p className="mt-2 text-sm text-gray-600 text-center">
                Are you sure you want to delete the auction for{' '}
                <strong>{getLaneDisplay(selectedAuction.laneId)}</strong>?
                <br />
                This action cannot be undone.
              </p>
            </div>
            <div className="border-t border-gray-200 px-6 py-4 bg-gray-50 flex justify-end gap-3">
              <button
                onClick={() => setModalMode(null)}
                className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AuctionConsole;
