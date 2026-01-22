// src/components/bidding/AdminShipmentCreate.tsx
import React, { useState, useCallback } from 'react';
import { Plus, X, Loader, CheckCircle2, AlertCircle } from 'lucide-react';
import { VehicleType, LoadType } from '../../../types';
import { BiddingService } from '../../services/biddingService';

interface AdminShipmentCreateProps {
  createdBy: string;
  onShipmentCreated?: () => void;
}

const AdminShipmentCreate: React.FC<AdminShipmentCreateProps> = ({ createdBy, onShipmentCreated }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [formData, setFormData] = useState({
    origin: '',
    destination: '',
    vehicleType: VehicleType.TRUCK,
    loadType: LoadType.FTL,
    capacity: '',
    material: '',
    pickupDate: '',
    deliveryDate: ''
  });

  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  }, []);

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();

    // Validation
    if (!formData.origin.trim()) {
      setFeedback({ type: 'error', text: 'Origin is required' });
      return;
    }
    if (!formData.destination.trim()) {
      setFeedback({ type: 'error', text: 'Destination is required' });
      return;
    }
    if (!formData.capacity.trim()) {
      setFeedback({ type: 'error', text: 'Capacity is required' });
      return;
    }
    if (!formData.material.trim()) {
      setFeedback({ type: 'error', text: 'Material/Product is required' });
      return;
    }
    if (!formData.pickupDate) {
      setFeedback({ type: 'error', text: 'Pickup date is required' });
      return;
    }
    if (!formData.deliveryDate) {
      setFeedback({ type: 'error', text: 'Delivery date is required' });
      return;
    }

    setLoading(true);

    try {
      const result = await BiddingService.createShipment({
        origin: formData.origin.trim(),
        destination: formData.destination.trim(),
        vehicleType: formData.vehicleType as VehicleType,
        loadType: formData.loadType as LoadType,
        capacity: formData.capacity.trim(),
        material: formData.material.trim(),
        pickupDate: formData.pickupDate,
        deliveryDate: formData.deliveryDate,
        status: 'OPEN',
        createdBy
      });

      if (result.success) {
        setFeedback({ type: 'success', text: 'Shipment created successfully!' });
        setFormData({
          origin: '',
          destination: '',
          vehicleType: VehicleType.TRUCK,
          loadType: LoadType.FTL,
          capacity: '',
          material: '',
          pickupDate: '',
          deliveryDate: ''
        });
        setTimeout(() => {
          setIsOpen(false);
          onShipmentCreated?.();
        }, 1500);
      } else {
        setFeedback({ type: 'error', text: 'Failed to create shipment' });
      }
    } catch (error) {
      console.error('Error creating shipment:', error);
      setFeedback({ type: 'error', text: 'An error occurred while creating the shipment' });
    } finally {
      setLoading(false);
    }
  }, [formData, createdBy, onShipmentCreated]);

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-xl font-bold text-sm flex items-center space-x-2 shadow-lg shadow-blue-100 transition-all"
      >
        <Plus className="w-5 h-5" />
        <span>Create Shipment</span>
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-2xl shadow-2xl">
            {/* Header */}
            <div className="bg-slate-50 px-6 py-4 border-b flex justify-between items-center">
              <h2 className="text-xl font-bold text-slate-800">Create New Shipment</h2>
              <button
                onClick={() => setIsOpen(false)}
                className="p-1 hover:bg-slate-200 rounded-lg"
              >
                <X className="w-5 h-5 text-slate-600" />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="p-6 space-y-6">
              {feedback && (
                <div className={`p-4 rounded-lg text-sm font-medium flex items-center space-x-2 ${
                  feedback.type === 'success' 
                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' 
                    : 'bg-red-50 text-red-700 border border-red-200'
                }`}>
                  {feedback.type === 'success' ? (
                    <CheckCircle2 className="w-5 h-5" />
                  ) : (
                    <AlertCircle className="w-5 h-5" />
                  )}
                  <span>{feedback.text}</span>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2">
                    Origin <span className="text-red-600">*</span>
                  </label>
                  <input
                    type="text"
                    name="origin"
                    placeholder="e.g., Delhi"
                    value={formData.origin}
                    onChange={handleInputChange}
                    className="w-full px-4 py-2.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2">
                    Destination <span className="text-red-600">*</span>
                  </label>
                  <input
                    type="text"
                    name="destination"
                    placeholder="e.g., Mumbai"
                    value={formData.destination}
                    onChange={handleInputChange}
                    className="w-full px-4 py-2.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2">
                    Vehicle Type <span className="text-red-600">*</span>
                  </label>
                  <select
                    name="vehicleType"
                    value={formData.vehicleType}
                    onChange={handleInputChange}
                    className="w-full px-4 py-2.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                  >
                    {Object.values(VehicleType).map(type => (
                      <option key={type} value={type}>{type}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2">
                    Load Type <span className="text-red-600">*</span>
                  </label>
                  <select
                    name="loadType"
                    value={formData.loadType}
                    onChange={handleInputChange}
                    className="w-full px-4 py-2.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                  >
                    {Object.values(LoadType).map(type => (
                      <option key={type} value={type}>{type}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2">
                    Capacity <span className="text-red-600">*</span>
                  </label>
                  <input
                    type="text"
                    name="capacity"
                    placeholder="e.g., 20 Tons"
                    value={formData.capacity}
                    onChange={handleInputChange}
                    className="w-full px-4 py-2.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2">
                    Material/Product <span className="text-red-600">*</span>
                  </label>
                  <input
                    type="text"
                    name="material"
                    placeholder="e.g., Electronics"
                    value={formData.material}
                    onChange={handleInputChange}
                    className="w-full px-4 py-2.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2">
                    Pickup Date <span className="text-red-600">*</span>
                  </label>
                  <input
                    type="date"
                    name="pickupDate"
                    value={formData.pickupDate}
                    onChange={handleInputChange}
                    className="w-full px-4 py-2.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2">
                    Delivery Date <span className="text-red-600">*</span>
                  </label>
                  <input
                    type="date"
                    name="deliveryDate"
                    value={formData.deliveryDate}
                    onChange={handleInputChange}
                    className="w-full px-4 py-2.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                  />
                </div>
              </div>
            </form>

            {/* Footer */}
            <div className="bg-slate-50 px-6 py-4 border-t flex justify-end space-x-3">
              <button
                onClick={() => setIsOpen(false)}
                className="px-6 py-2 border border-slate-200 rounded-lg font-bold text-sm text-slate-700 hover:bg-slate-50 transition-all"
              >
                Cancel
              </button>
              <button
                onClick={handleSubmit}
                disabled={loading}
                className="px-6 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-400 disabled:cursor-not-allowed text-white rounded-lg font-bold text-sm transition-all flex items-center space-x-2"
              >
                {loading ? (
                  <>
                    <Loader className="w-4 h-4 animate-spin" />
                    <span>Creating...</span>
                  </>
                ) : (
                  <>
                    <Plus className="w-4 h-4" />
                    <span>Create Shipment</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default AdminShipmentCreate;
