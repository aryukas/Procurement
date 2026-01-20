// src/hooks/useAuctions.ts
import { useState, useEffect } from 'react';
import { AuctionService } from '../services/auctionService';
import { AuctionMaster } from '../../types';

export const useAuctions = () => {
  const [auctions, setAuctions] = useState<AuctionMaster[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    const unsubscribe = AuctionService.listenToAuctions((newAuctions) => {
      setAuctions(newAuctions);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  return { auctions, loading, error };
};

export const useAuctionsByLane = (laneId: string | null) => {
  const [auctions, setAuctions] = useState<AuctionMaster[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!laneId) {
      setAuctions([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    const unsubscribe = AuctionService.listenToAuctionsByLane(laneId, (newAuctions) => {
      setAuctions(newAuctions);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [laneId]);

  return { auctions, loading, error };
};
