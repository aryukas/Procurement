// src/hooks/useFirebaseData.ts
import { useState, useEffect } from 'react';
import { FirebaseService } from '../services/firebaseService';
import { Bid, Shipment } from '../utils/dbStructure';

export const useBids = () => {
  const [bids, setBids] = useState<Bid[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = FirebaseService.listenToBids((newBids) => {
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