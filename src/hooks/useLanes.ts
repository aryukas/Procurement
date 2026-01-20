// src/hooks/useLanes.ts
import { useState, useEffect } from 'react';
import { LaneService } from '../services/laneService';
import { LaneMaster } from '../../types';

export const useLanes = () => {
  const [lanes, setLanes] = useState<LaneMaster[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    const unsubscribe = LaneService.listenToLanes((newLanes) => {
      setLanes(newLanes);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  return { lanes, loading, error };
};

export const useActiveLanes = () => {
  const [lanes, setLanes] = useState<LaneMaster[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    const unsubscribe = LaneService.listenToActiveLanes((newLanes) => {
      setLanes(newLanes);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  return { lanes, loading, error };
};
