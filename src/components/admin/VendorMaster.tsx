// src/components/admin/VendorMaster.tsx
import React, { useState, useMemo } from 'react';
import {
  Plus,
  Edit2,
  Trash2,
  X,
  AlertCircle,
  CheckCircle2,
  Mail,
  Phone,
  MapPin,
} from 'lucide-react';
import type { VendorMaster, LaneMaster } from '../../../types';
import { VehicleType } from '../../../types';
import { VendorService } from '../../services/vendorService';
import { useVendors } from '../../hooks/useVendors';
import { useLanes } from '../../hooks/useLanes';

interface VendorMasterProps {
  adminId: string;
}

type ModalMode = 'create' | 'edit' | 'delete' | null;

const VendorMasterComponent: React.FC<VendorMasterProps> = ({ adminId }) => {
  const { vendors, loading } = useVendors();
  const { lanes } = useLanes();

  const [modalMode, setModalMode] = useState<ModalMode>(null);
  const [selectedVendor, setSelectedVendor] = useState<VendorMaster | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterActive, setFilterActive] = useState<'ALL' | 'ACTIVE' | 'INACTIVE'>('ALL');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Form state
  const [formData, setFormData] = useState<Partial<VendorMaster>>({
    name: '',
    email: '',
    phone: '',
    vehicleTypes: [],
    assignedLanes: [],
    isActive: true,
    notes: '',
  });

  // Filtered vendors
  const filteredVendors = useMemo(() => {
    return vendors.filter((vendor) => {
      const matchesSearch =
        vendor.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        vendor.email.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesFilter =
        filterActive === 'ALL' ||
        (filterActive === 'ACTIVE' && vendor.isActive) ||
        (filterActive === 'INACTIVE' && !vendor.isActive);
      return matchesSearch && matchesFilter;
    });
  }, [vendors, searchTerm, filterActive]);

  const getLaneNames = (laneIds: string[]) => {
    return laneIds
      .map((id) => {
        const lane = lanes.find((l) => l.id === id);
        return lane ? `${lane.origin} - ${lane.destination}` : 'Unknown';
      })
      .join(', ');
  };

  const openCreateModal = () => {
    setFormData({
      name: '',
      email: '',
      phone: '',
      vehicleTypes: [],
      assignedLanes: [],
      isActive: true,
      notes: '',
    });
    setError(null);
    setModalMode('create');
  };

  const openEditModal = (vendor: VendorMaster) => {
    setSelectedVendor(vendor);
    setFormData({ ...vendor });
    setError(null);
    setModalMode('edit');
  };

  const openDeleteModal = (vendor: VendorMaster) => {
    setSelectedVendor(vendor);
    setError(null);
    setModalMode('delete');
  };

  const validateForm = () => {
    if (!formData.name || formData.name.trim() === '') {
      setError('Vendor name is required');
      return false;
    }

    if (!formData.email || formData.email.trim() === '') {
      setError('Email is required');
      return false;
    }

    // Basic email validation
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      setError('Invalid email format');
      return false;
    }

    if (!formData.phone || formData.phone.trim() === '') {
      setError('Phone is required');
      return false;
    }

    if (!formData.vehicleTypes || formData.vehicleTypes.length === 0) {
      setError('At least one vehicle type must be selected');
      return false;
    }

    if (!formData.assignedLanes || formData.assignedLanes.length === 0) {
      setError('At least one lane must be assigned');
      return false;
    }

    return true;
  };

  const handleSave = async () => {
    if (!validateForm()) return;

    try {
      if (modalMode === 'create') {
        const result = await VendorService.createVendor({
          ...(formData as any),
          createdBy: adminId,
        });

        if (result.success) {
          setSuccess('Vendor created successfully');
          setModalMode(null);
          setTimeout(() => setSuccess(null), 3000);
        } else {
          setError(result.error?.message || 'Failed to create vendor');
        }
      } else if (modalMode === 'edit' && selectedVendor) {
        const result = await VendorService.updateVendor(selectedVendor.id, {
          ...formData,
          createdBy: selectedVendor.createdBy,
        } as any);

        if (result.success) {
          setSuccess('Vendor updated successfully');
          setModalMode(null);
          setTimeout(() => setSuccess(null), 3000);
        } else {
          setError(result.error?.message || 'Failed to update vendor');
        }
      }
    } catch (err: any) {
      setError(err.message || 'An error occurred');
    }
  };

  const handleDelete = async () => {
    if (!selectedVendor) return;

    try {
      const result = await VendorService.deleteVendor(selectedVendor.id);

      if (result.success) {
        setSuccess('Vendor deleted successfully');
        setModalMode(null);
        setTimeout(() => setSuccess(null), 3000);
      } else {
        setError(result.error?.message || 'Failed to delete vendor');
      }
    } catch (err: any) {
      setError(err.message || 'An error occurred');
    }
  };

  const toggleVehicleType = (vehicleType: VehicleType) => {
    const current = formData.vehicleTypes || [];
    if (current.includes(vehicleType)) {
      setFormData({
        ...formData,
        vehicleTypes: current.filter((v) => v !== vehicleType),
      });
    } else {
      setFormData({
        ...formData,
        vehicleTypes: [...current, vehicleType],
      });
    }
  };

  const toggleLane = (laneId: string) => {
    const current = formData.assignedLanes || [];
    if (current.includes(laneId)) {
      setFormData({
        ...formData,
        assignedLanes: current.filter((l) => l !== laneId),
      });
    } else {
      setFormData({
        ...formData,
        assignedLanes: [...current, laneId],
      });
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-gray-500">Loading vendors...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Vendor Master</h2>
          <p className="text-sm text-gray-600 mt-1">Manage vendor information and lane assignments</p>
        </div>
        <button
          onClick={openCreateModal}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
        >
          <Plus size={20} />
          Add Vendor
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
          placeholder="Search by name or email..."
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

      {/* Vendors Table */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Name</th>
              <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Email</th>
              <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Phone</th>
              <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Lanes</th>
              <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Status</th>
              <th className="px-6 py-3 text-right text-sm font-semibold text-gray-900">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {filteredVendors.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-6 py-8 text-center text-gray-500">
                  No vendors found
                </td>
              </tr>
            ) : (
              filteredVendors.map((vendor) => (
                <tr key={vendor.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 text-sm text-gray-900 font-medium">{vendor.name}</td>
                  <td className="px-6 py-4 text-sm text-gray-600 flex items-center gap-2">
                    <Mail size={16} className="text-gray-400" />
                    {vendor.email}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600 flex items-center gap-2">
                    <Phone size={16} className="text-gray-400" />
                    {vendor.phone}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600">
                    <span className="text-xs bg-blue-50 text-blue-700 px-2 py-1 rounded">
                      {vendor.assignedLanes.length} lane{vendor.assignedLanes.length !== 1 ? 's' : ''}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm">
                    <span
                      className={`px-3 py-1 rounded-full text-xs font-semibold ${
                        vendor.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'
                      }`}
                    >
                      {vendor.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex justify-end gap-2">
                      <button
                        onClick={() => openEditModal(vendor)}
                        className="p-2 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded transition"
                      >
                        <Edit2 size={18} />
                      </button>
                      <button
                        onClick={() => openDeleteModal(vendor)}
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
                {modalMode === 'create' ? 'Create Vendor' : 'Edit Vendor'}
              </h3>
              <button
                onClick={() => setModalMode(null)}
                className="text-gray-500 hover:text-gray-700"
              >
                <X size={24} />
              </button>
            </div>

            <div className="p-6 space-y-4">
              {/* Vendor Name */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Vendor Name *</label>
                <input
                  type="text"
                  value={formData.name || ''}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g., ABC Logistics"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* Email */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Email *</label>
                <input
                  type="email"
                  value={formData.email || ''}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="vendor@example.com"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* Phone */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Phone *</label>
                <input
                  type="tel"
                  value={formData.phone || ''}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  placeholder="+91 9876543210"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* Vehicle Types */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Vehicle Types *</label>
                <div className="space-y-2">
                  {Object.values(VehicleType).map((vehicleType) => (
                    <label key={vehicleType} className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={(formData.vehicleTypes || []).includes(vehicleType)}
                        onChange={() => toggleVehicleType(vehicleType)}
                        className="w-4 h-4 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
                      />
                      <span className="text-sm text-gray-700">{vehicleType}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Assigned Lanes */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Assigned Lanes *</label>
                <div className="space-y-2 max-h-48 overflow-y-auto border border-gray-200 rounded-lg p-3">
                  {lanes.length === 0 ? (
                    <p className="text-sm text-gray-500">No lanes available. Create lanes first.</p>
                  ) : (
                    lanes.map((lane) => (
                      <label key={lane.id} className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={(formData.assignedLanes || []).includes(lane.id)}
                          onChange={() => toggleLane(lane.id)}
                          className="w-4 h-4 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
                        />
                        <span className="text-sm text-gray-700">
                          {lane.origin} - {lane.destination}
                        </span>
                      </label>
                    ))
                  )}
                </div>
              </div>

              {/* Notes */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Notes</label>
                <textarea
                  value={formData.notes || ''}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  placeholder="Any additional notes..."
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

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
      {modalMode === 'delete' && selectedVendor && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-lg max-w-md w-full mx-4">
            <div className="p-6">
              <div className="flex items-center justify-center w-12 h-12 mx-auto bg-red-100 rounded-full">
                <AlertCircle className="text-red-600" size={24} />
              </div>
              <h3 className="mt-4 text-lg font-bold text-gray-900 text-center">Delete Vendor?</h3>
              <p className="mt-2 text-sm text-gray-600 text-center">
                Are you sure you want to delete <strong>{selectedVendor.name}</strong>?
                <br />
                The vendor will be marked as inactive.
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

export default VendorMasterComponent;
