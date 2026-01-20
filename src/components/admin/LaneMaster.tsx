// src/components/admin/LaneMaster.tsx
import React, { useState, useMemo } from 'react';
import {
  Plus,
  Edit2,
  Trash2,
  X,
  AlertCircle,
  CheckCircle2,
  MapPin,
  ArrowRight,
} from 'lucide-react';
import type { LaneMaster } from '../../../types';
import { LaneService } from '../../services/laneService';
import { AuctionService } from '../../services/auctionService';
import { useLanes } from '../../hooks/useLanes';

interface LaneMasterProps {
  adminId: string;
}

type ModalMode = 'create' | 'edit' | 'delete' | null;

const LaneMasterComponent: React.FC<LaneMasterProps> = ({ adminId }) => {
  const { lanes, loading } = useLanes();

  const [modalMode, setModalMode] = useState<ModalMode>(null);
  const [selectedLane, setSelectedLane] = useState<LaneMaster | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterActive, setFilterActive] = useState<'ALL' | 'ACTIVE' | 'INACTIVE'>('ALL');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [linkedAuctionsCount, setLinkedAuctionsCount] = useState(0);

  // Form state
  const [formData, setFormData] = useState<Partial<LaneMaster>>({
    origin: '',
    destination: '',
    isActive: true,
  });

  // Filtered lanes
  const filteredLanes = useMemo(() => {
    return lanes.filter((lane) => {
      const matchesSearch =
        lane.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
        lane.origin.toLowerCase().includes(searchTerm.toLowerCase()) ||
        lane.destination.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesFilter =
        filterActive === 'ALL' ||
        (filterActive === 'ACTIVE' && lane.isActive) ||
        (filterActive === 'INACTIVE' && !lane.isActive);
      return matchesSearch && matchesFilter;
    });
  }, [lanes, searchTerm, filterActive]);

  const openCreateModal = () => {
    setFormData({
      origin: '',
      destination: '',
      isActive: true,
    });
    setError(null);
    setModalMode('create');
  };

  const openEditModal = (lane: LaneMaster) => {
    setSelectedLane(lane);
    setFormData({
      origin: lane.origin,
      destination: lane.destination,
      isActive: lane.isActive,
    });
    setError(null);
    setModalMode('edit');
  };

  const openDeleteModal = async (lane: LaneMaster) => {
    setSelectedLane(lane);
    setError(null);

    // Check for linked auctions
    try {
      const auctions = await AuctionService.getAuctionsByLaneId(lane.id);
      setLinkedAuctionsCount(auctions.length);
    } catch {
      setLinkedAuctionsCount(0);
    }

    setModalMode('delete');
  };

  const validateForm = () => {
    if (!formData.origin || formData.origin.trim() === '') {
      setError('Origin city is required');
      return false;
    }

    if (!formData.destination || formData.destination.trim() === '') {
      setError('Destination city is required');
      return false;
    }

    if (
      formData.origin.trim().toUpperCase() === formData.destination.trim().toUpperCase()
    ) {
      setError('Origin and destination cannot be the same');
      return false;
    }

    return true;
  };

  const handleSave = async () => {
    if (!validateForm()) return;

    try {
      if (modalMode === 'create') {
        const result = await LaneService.createLane({
          ...(formData as any),
          origin: formData.origin!.trim(),
          destination: formData.destination!.trim(),
          createdBy: adminId,
        });

        if (result.success) {
          setSuccess('Lane created successfully');
          setModalMode(null);
          setTimeout(() => setSuccess(null), 3000);
        } else {
          setError(result.error?.message || 'Failed to create lane');
        }
      } else if (modalMode === 'edit' && selectedLane) {
        const result = await LaneService.updateLane(selectedLane.id, {
          ...formData,
          createdBy: selectedLane.createdBy,
        } as any);

        if (result.success) {
          setSuccess('Lane updated successfully');
          setModalMode(null);
          setTimeout(() => setSuccess(null), 3000);
        } else {
          setError(result.error?.message || 'Failed to update lane');
        }
      }
    } catch (err: any) {
      setError(err.message || 'An error occurred');
    }
  };

  const handleDelete = async () => {
    if (!selectedLane) return;

    if (linkedAuctionsCount > 0) {
      setError(`Cannot delete lane with ${linkedAuctionsCount} linked auction(s)`);
      return;
    }

    try {
      const result = await LaneService.deleteLane(selectedLane.id);

      if (result.success) {
        setSuccess('Lane deleted successfully');
        setModalMode(null);
        setTimeout(() => setSuccess(null), 3000);
      } else {
        setError(result.error?.message || 'Failed to delete lane');
      }
    } catch (err: any) {
      setError(err.message || 'An error occurred');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-gray-500">Loading lanes...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Lane Master</h2>
          <p className="text-sm text-gray-600 mt-1">Manage logistics routes and corridors</p>
        </div>
        <button
          onClick={openCreateModal}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
        >
          <Plus size={20} />
          Create Lane
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
          placeholder="Search by lane code or city..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <select
          value={filterActive}
          onChange={(e) => setFilterActive(e.target.value as 'ALL' | 'ACTIVE' | 'INACTIVE')}
          className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="ALL">All Status</option>
          <option value="ACTIVE">Active</option>
          <option value="INACTIVE">Inactive</option>
        </select>
      </div>

      {/* Lanes Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredLanes.length === 0 ? (
          <div className="col-span-full p-8 text-center">
            <MapPin className="mx-auto text-gray-300 mb-2" size={48} />
            <p className="text-gray-500 font-medium">No lanes found</p>
            <p className="text-sm text-gray-400">Create a lane to get started</p>
          </div>
        ) : (
          filteredLanes.map((lane) => (
            <div
              key={lane.id}
              className={`p-4 rounded-lg border-2 transition ${
                lane.isActive
                  ? 'border-green-200 bg-green-50 hover:border-green-300'
                  : 'border-gray-200 bg-gray-50 hover:border-gray-300'
              }`}
            >
              {/* Lane Code */}
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-lg font-bold text-gray-900">{lane.code}</h3>
                <span
                  className={`px-2 py-1 rounded text-xs font-semibold ${
                    lane.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'
                  }`}
                >
                  {lane.isActive ? 'Active' : 'Inactive'}
                </span>
              </div>

              {/* Origin to Destination */}
              <div className="flex items-center gap-2 mb-4">
                <div className="flex-1">
                  <p className="text-xs text-gray-600 uppercase">From</p>
                  <p className="text-sm font-semibold text-gray-900">{lane.origin}</p>
                </div>
                <ArrowRight className="text-gray-400" size={20} />
                <div className="flex-1">
                  <p className="text-xs text-gray-600 uppercase text-right">To</p>
                  <p className="text-sm font-semibold text-gray-900 text-right">{lane.destination}</p>
                </div>
              </div>

              {/* Meta */}
              <div className="text-xs text-gray-500 mb-4 space-y-1">
                <p>Created: {new Date(lane.createdAt).toLocaleDateString()}</p>
                <p>Updated: {new Date(lane.updatedAt).toLocaleDateString()}</p>
              </div>

              {/* Actions */}
              <div className="flex gap-2">
                <button
                  onClick={() => openEditModal(lane)}
                  className="flex-1 px-3 py-2 text-sm text-blue-600 bg-blue-50 rounded hover:bg-blue-100 transition font-medium flex items-center justify-center gap-1"
                >
                  <Edit2 size={16} />
                  Edit
                </button>
                <button
                  onClick={() => openDeleteModal(lane)}
                  className="flex-1 px-3 py-2 text-sm text-red-600 bg-red-50 rounded hover:bg-red-100 transition font-medium flex items-center justify-center gap-1"
                >
                  <Trash2 size={16} />
                  Delete
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Create/Edit Modal */}
      {(modalMode === 'create' || modalMode === 'edit') && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-lg max-w-md w-full mx-4">
            <div className="border-b border-gray-200 px-6 py-4 flex justify-between items-center">
              <h3 className="text-lg font-bold text-gray-900">
                {modalMode === 'create' ? 'Create Lane' : 'Edit Lane'}
              </h3>
              <button
                onClick={() => setModalMode(null)}
                className="text-gray-500 hover:text-gray-700"
              >
                <X size={24} />
              </button>
            </div>

            <div className="p-6 space-y-4">
              {/* Origin */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Origin City *</label>
                <input
                  type="text"
                  value={formData.origin || ''}
                  onChange={(e) => setFormData({ ...formData, origin: e.target.value })}
                  placeholder="e.g., Delhi"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* Destination */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Destination City *</label>
                <input
                  type="text"
                  value={formData.destination || ''}
                  onChange={(e) => setFormData({ ...formData, destination: e.target.value })}
                  placeholder="e.g., Mumbai"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* Lane Code Preview */}
              {formData.origin && formData.destination && (
                <div className="p-3 bg-blue-50 rounded-lg">
                  <p className="text-xs text-blue-600 mb-1">Lane Code Preview:</p>
                  <p className="text-lg font-bold text-blue-900">
                    {formData.origin.trim().toUpperCase()}-{formData.destination.trim().toUpperCase()}
                  </p>
                </div>
              )}

              {/* Active Status */}
              {modalMode === 'edit' && (
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.isActive || false}
                    onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                    className="w-4 h-4 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
                  />
                  <span className="text-sm font-medium text-gray-700">Active</span>
                </label>
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
      {modalMode === 'delete' && selectedLane && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-lg max-w-md w-full mx-4">
            <div className="p-6">
              <div className="flex items-center justify-center w-12 h-12 mx-auto bg-red-100 rounded-full">
                <AlertCircle className="text-red-600" size={24} />
              </div>
              <h3 className="mt-4 text-lg font-bold text-gray-900 text-center">Delete Lane?</h3>
              <p className="mt-2 text-sm text-gray-600 text-center">
                Are you sure you want to delete <strong>{selectedLane.code}</strong>?
                <br />
                The lane will be marked as inactive.
              </p>
              {linkedAuctionsCount > 0 && (
                <p className="mt-3 text-sm text-red-600 text-center">
                  ⚠️ This lane has {linkedAuctionsCount} linked auction(s) and cannot be deleted.
                </p>
              )}
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
                disabled={linkedAuctionsCount > 0}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
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

export default LaneMasterComponent;
