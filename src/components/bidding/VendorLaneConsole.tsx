// src/components/bidding/VendorLaneConsole.tsx
import React, { useState, useEffect, useMemo } from 'react';
import { BarChart3, TrendingUp, Target, AlertCircle, CheckCircle2, Loader } from 'lucide-react';
import type { User, LaneMaster, SimpleShipment, VendorBid } from '../../../types';
import { LaneService } from '../../services/laneService';
import { BiddingService } from '../../services/biddingService';

interface VendorLaneConsoleProps {
  currentUser: User;
}

interface LaneStats {
  lane: LaneMaster;
  openShipments: number;
  vendorBids: number;
  pendingBids: number;
  approvedBids: number;
}

const VendorLaneConsole: React.FC<VendorLaneConsoleProps> = ({ currentUser }) => {
  const [lanes, setLanes] = useState<LaneMaster[]>([]);
  const [shipments, setShipments] = useState<SimpleShipment[]>([]);
  const [vendorBids, setVendorBids] = useState<VendorBid[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedLane, setSelectedLane] = useState<LaneMaster | null>(null);

  // Load lanes
  useEffect(() => {
    const unsubscribe = LaneService.listenToActiveLanes((data) => {
      setLanes(data);
      setLoading(false);
    });
    return () => unsubscribe?.();
  }, []);

  // Load shipments
  useEffect(() => {
    const unsubscribe = BiddingService.listenToShipments((data) => {
      setShipments(data);
    });
    return () => unsubscribe();
  }, []);

  // Load vendor bids
  useEffect(() => {
    if (!currentUser?.id) return;
    const unsubscribe = BiddingService.listenToVendorBids(currentUser.id, (data) => {
      setVendorBids(data);
    });
    return () => unsubscribe();
  }, [currentUser?.id]);

  // Calculate stats for each lane
  const laneStats = useMemo<LaneStats[]>(() => {
    return lanes.map(lane => {
      // Find shipments for this lane
      const laneShipments = shipments.filter(s => 
        s.origin.toLowerCase() === lane.origin.toLowerCase() && 
        s.destination.toLowerCase() === lane.destination.toLowerCase()
      );

      // Count open shipments
      const openShipments = laneShipments.filter(s => s.status === 'OPEN').length;

      // Find vendor bids for shipments in this lane
      const laneBids = vendorBids.filter(bid => 
        laneShipments.some(s => s.id === bid.shipmentId)
      );

      return {
        lane,
        openShipments,
        vendorBids: laneBids.length,
        pendingBids: laneBids.filter(b => b.status === 'PENDING').length,
        approvedBids: laneBids.filter(b => b.status === 'APPROVED').length
      };
    });
  }, [lanes, shipments, vendorBids]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader className="w-8 h-8 text-blue-600 animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-slate-800 mb-2 flex items-center space-x-2">
          <BarChart3 className="w-8 h-8 text-blue-600" />
          <span>Lane Performance Dashboard</span>
        </h1>
        <p className="text-slate-600">Track your bidding activity across lanes</p>
      </div>

      {laneStats.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {laneStats.map(stat => (
            <div
              key={stat.lane.id}
              onClick={() => setSelectedLane(stat.lane)}
              className={`bg-white border-2 rounded-xl p-6 cursor-pointer transition-all ${
                selectedLane?.id === stat.lane.id
                  ? 'border-blue-500 ring-4 ring-blue-50 shadow-lg'
                  : 'border-slate-200 hover:border-slate-300'
              }`}
            >
              <div className="mb-4">
                <h3 className="text-lg font-bold text-slate-800 mb-1">
                  {stat.lane.code}
                </h3>
                <p className="text-sm text-slate-500">
                  {stat.lane.origin} → {stat.lane.destination}
                </p>
              </div>

              <div className="space-y-3">
                {/* Open Shipments */}
                <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
                  <div className="flex items-center space-x-2">
                    <Target className="w-5 h-5 text-blue-600" />
                    <span className="text-sm font-semibold text-slate-700">Open Shipments</span>
                  </div>
                  <span className="text-xl font-bold text-blue-600">{stat.openShipments}</span>
                </div>

                {/* Your Bids */}
                <div className="flex items-center justify-between p-3 bg-purple-50 rounded-lg">
                  <div className="flex items-center space-x-2">
                    <TrendingUp className="w-5 h-5 text-purple-600" />
                    <span className="text-sm font-semibold text-slate-700">Your Bids</span>
                  </div>
                  <span className="text-xl font-bold text-purple-600">{stat.vendorBids}</span>
                </div>

                {/* Bid Status */}
                <div className="grid grid-cols-2 gap-2">
                  <div className="p-2 bg-amber-50 rounded-lg text-center">
                    <p className="text-xs text-slate-600 mb-1">Pending</p>
                    <p className="text-lg font-bold text-amber-600">{stat.pendingBids}</p>
                  </div>
                  <div className="p-2 bg-emerald-50 rounded-lg text-center">
                    <p className="text-xs text-slate-600 mb-1">Approved</p>
                    <p className="text-lg font-bold text-emerald-600">{stat.approvedBids}</p>
                  </div>
                </div>

                {/* Active Status */}
                <div className="flex items-center space-x-2 pt-2 border-t border-slate-100">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                  <span className="text-xs text-slate-600">
                    <span className="font-semibold">Active Lane</span>
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="bg-white border-2 border-dashed border-slate-200 rounded-xl p-12 text-center">
          <AlertCircle className="w-12 h-12 text-slate-300 mx-auto mb-4" />
          <h3 className="text-lg font-bold text-slate-800 mb-2">No Active Lanes</h3>
          <p className="text-slate-600">No lanes are currently available for bidding</p>
        </div>
      )}

      {/* Detailed Stats */}
      {selectedLane && (
        <div className="mt-8 bg-white border border-slate-200 rounded-xl p-6">
          <h2 className="text-xl font-bold text-slate-800 mb-6">
            Lane Details: {selectedLane.code}
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Total Opportunities */}
            <div className="p-6 bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg border border-blue-200">
              <p className="text-sm text-blue-600 font-semibold mb-2">TOTAL OPPORTUNITIES</p>
              <p className="text-4xl font-bold text-blue-700">
                {laneStats.find(s => s.lane.id === selectedLane.id)?.openShipments || 0}
              </p>
              <p className="text-xs text-blue-600 mt-2">Open shipments waiting for bids</p>
            </div>

            {/* Your Activity */}
            <div className="p-6 bg-gradient-to-br from-purple-50 to-purple-100 rounded-lg border border-purple-200">
              <p className="text-sm text-purple-600 font-semibold mb-2">YOUR ACTIVITY</p>
              <p className="text-4xl font-bold text-purple-700">
                {laneStats.find(s => s.lane.id === selectedLane.id)?.vendorBids || 0}
              </p>
              <p className="text-xs text-purple-600 mt-2">Total bids placed</p>
            </div>

            {/* Success Rate */}
            <div className="p-6 bg-gradient-to-br from-emerald-50 to-emerald-100 rounded-lg border border-emerald-200">
              <p className="text-sm text-emerald-600 font-semibold mb-2">SUCCESS RATE</p>
              <p className="text-4xl font-bold text-emerald-700">
                {(() => {
                  const stats = laneStats.find(s => s.lane.id === selectedLane.id);
                  if (!stats || stats.vendorBids === 0) return '0%';
                  return `${Math.round((stats.approvedBids / stats.vendorBids) * 100)}%`;
                })()}
              </p>
              <p className="text-xs text-emerald-600 mt-2">Approved bids percentage</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default VendorLaneConsole;
