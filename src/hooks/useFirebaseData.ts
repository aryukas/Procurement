// src/hooks/useFirebaseData.ts
import { useState, useEffect } from 'react';
import { FirebaseService } from '../services/firebaseService';
import { ShipmentBid, Shipment } from '../types';

export const useBids = () => {
  const [bids, setBids] = useState<ShipmentBid[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = FirebaseService.listenToShipmentBids((newBids) => {
      setBids(newBids);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  return { bids, loading };
};

export const useShipments = () => {
  const [shipments, setShipments] = useState<Shipment[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = FirebaseService.listenToShipments((newShipments) => {
      setShipments(newShipments);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  return { shipments, loading };
};