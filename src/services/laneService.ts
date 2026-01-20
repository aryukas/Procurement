// src/services/laneService.ts
import {
  collection,
  addDoc,
  updateDoc,
  doc,
  getDocs,
  getDoc,
  query,
  where,
  onSnapshot
} from 'firebase/firestore';
import { firestore } from '../firebase';
import { LaneMaster } from '../../types';

const COLLECTION = 'lanes';

/**
 * Generate lane code from origin and destination
 */
function generateLaneCode(origin: string, destination: string): string {
  return `${origin.trim().toUpperCase()}-${destination.trim().toUpperCase()}`;
}

export class LaneService {
  /**
   * Create a new lane
   */
  static async createLane(
    laneData: Omit<LaneMaster, 'id' | 'code' | 'createdAt' | 'updatedAt'>
  ): Promise<{ success: boolean; id?: string; error?: any }> {
    try {
      if (!laneData.origin || !laneData.destination) {
        throw new Error('Origin and destination are required');
      }

      const code = generateLaneCode(laneData.origin, laneData.destination);

      // Check for duplicate lane
      const existingLane = await this.getLaneByCode(code);
      if (existingLane) {
        throw new Error(`Lane ${code} already exists`);
      }

      const newLane = {
        ...laneData,
        code,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      const docRef = await addDoc(collection(firestore, COLLECTION), newLane);
      return { success: true, id: docRef.id };
    } catch (error) {
      console.error('Error creating lane:', error);
      return { success: false, error };
    }
  }

  /**
   * Get all lanes
   */
  static async getLanes(): Promise<LaneMaster[]> {
    try {
      const snapshot = await getDocs(collection(firestore, COLLECTION));
      return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() } as LaneMaster));
    } catch (error) {
      console.error('Error fetching lanes:', error);
      return [];
    }
  }

  /**
   * Get active lanes only
   */
  static async getActiveLanes(): Promise<LaneMaster[]> {
    try {
      const q = query(collection(firestore, COLLECTION), where('isActive', '==', true));
      const snapshot = await getDocs(q);
      return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() } as LaneMaster));
    } catch (error) {
      console.error('Error fetching active lanes:', error);
      return [];
    }
  }

  /**
   * Get lane by ID
   */
  static async getLaneById(laneId: string): Promise<LaneMaster | null> {
    try {
      const docRef = doc(firestore, COLLECTION, laneId);
      const snapshot = await getDoc(docRef);
      if (snapshot.exists()) {
        return { id: snapshot.id, ...snapshot.data() } as LaneMaster;
      }
      return null;
    } catch (error) {
      console.error('Error fetching lane:', error);
      return null;
    }
  }

  /**
   * Get lane by code
   */
  static async getLaneByCode(code: string): Promise<LaneMaster | null> {
    try {
      const q = query(collection(firestore, COLLECTION), where('code', '==', code));
      const snapshot = await getDocs(q);
      if (snapshot.docs.length > 0) {
        const doc = snapshot.docs[0];
        return { id: doc.id, ...doc.data() } as LaneMaster;
      }
      return null;
    } catch (error) {
      console.error('Error fetching lane by code:', error);
      return null;
    }
  }

  /**
   * Update lane (only if no active auctions)
   * Note: Caller should verify no active auctions before calling
   */
  static async updateLane(
    laneId: string,
    updates: Partial<Omit<LaneMaster, 'id' | 'code' | 'createdAt' | 'createdBy'>>
  ): Promise<{ success: boolean; error?: any }> {
    try {
      const lane = await this.getLaneById(laneId);
      if (!lane) {
        throw new Error('Lane not found');
      }

      const docRef = doc(firestore, COLLECTION, laneId);
      await updateDoc(docRef, {
        ...updates,
        updatedAt: new Date().toISOString()
      });

      return { success: true };
    } catch (error) {
      console.error('Error updating lane:', error);
      return { success: false, error };
    }
  }

  /**
   * Soft delete lane (mark as inactive) - prevent if linked to auctions
   * Note: Caller should verify no auctions before calling
   */
  static async deleteLane(laneId: string): Promise<{ success: boolean; error?: any }> {
    try {
      const lane = await this.getLaneById(laneId);
      if (!lane) {
        throw new Error('Lane not found');
      }

      const docRef = doc(firestore, COLLECTION, laneId);
      await updateDoc(docRef, {
        isActive: false,
        updatedAt: new Date().toISOString()
      });

      return { success: true };
    } catch (error) {
      console.error('Error deleting lane:', error);
      return { success: false, error };
    }
  }

  /**
   * Real-time listener for all lanes
   */
  static listenToLanes(callback: (lanes: LaneMaster[]) => void): (() => void) {
    const unsubscribe = onSnapshot(collection(firestore, COLLECTION), (snapshot) => {
      const lanes = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data()
      } as LaneMaster));
      callback(lanes);
    });

    return unsubscribe;
  }

  /**
   * Real-time listener for active lanes only
   */
  static listenToActiveLanes(callback: (lanes: LaneMaster[]) => void): (() => void) {
    const q = query(collection(firestore, COLLECTION), where('isActive', '==', true));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const lanes = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data()
      } as LaneMaster));
      callback(lanes);
    });

    return unsubscribe;
  }
}
