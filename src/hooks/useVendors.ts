// src/hooks/useVendors.ts
import { useState, useEffect } from 'react';
import { VendorService } from '../services/vendorService';
import { VendorMaster } from '../../types';

export const useVendors = () => {
  const [vendors, setVendors] = useState<VendorMaster[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    const unsubscribe = VendorService.listenToVendors((newVendors) => {
      setVendors(newVendors);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  return { vendors, loading, error };
};

export const useVendorsByLane = (laneId: string | null) => {
  const [vendors, setVendors] = useState<VendorMaster[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!laneId) {
      setVendors([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    const unsubscribe = VendorService.listenToVendorsByLane(laneId, (newVendors) => {
      setVendors(newVendors);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [laneId]);

  return { vendors, loading, error };
};
