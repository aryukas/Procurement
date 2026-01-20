// src/services/auctionService.ts
import {
  collection,
  addDoc,
  updateDoc,
  doc,
  getDocs,
  getDoc,
  query,
  where,
  onSnapshot,
  Timestamp
} from 'firebase/firestore';
import { firestore } from '../firebase';
import { AuctionMaster, AuctionStatus } from '../../types';

const COLLECTION = 'auctions';

export class AuctionService {
  /**
   * Create a new auction
   */
  static async createAuction(
    auctionData: Omit<AuctionMaster, 'id' | 'createdAt' | 'updatedAt'>
  ): Promise<{ success: boolean; id?: string; error?: any }> {
    try {
      if (!auctionData.laneId) {
        throw new Error('Lane ID is required');
      }

      const newAuction = {
        ...auctionData,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        softDeleted: false
      };

      const docRef = await addDoc(collection(firestore, COLLECTION), newAuction);
      return { success: true, id: docRef.id };
    } catch (error) {
      console.error('Error creating auction:', error);
      return { success: false, error };
    }
  }

  /**
   * Get all active (non-deleted) auctions
   */
  static async getAuctions(): Promise<AuctionMaster[]> {
    try {
      const q = query(
        collection(firestore, COLLECTION),
        where('softDeleted', '==', false)
      );
      const snapshot = await getDocs(q);
      return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() } as AuctionMaster));
    } catch (error) {
      console.error('Error fetching auctions:', error);
      return [];
    }
  }

  /**
   * Get single auction by ID
   */
  static async getAuctionById(auctionId: string): Promise<AuctionMaster | null> {
    try {
      const docRef = doc(firestore, COLLECTION, auctionId);
      const snapshot = await getDoc(docRef);
      if (snapshot.exists()) {
        return { id: snapshot.id, ...snapshot.data() } as AuctionMaster;
      }
      return null;
    } catch (error) {
      console.error('Error fetching auction:', error);
      return null;
    }
  }

  /**
   * Get auctions by lane ID
   */
  static async getAuctionsByLaneId(laneId: string): Promise<AuctionMaster[]> {
    try {
      const q = query(
        collection(firestore, COLLECTION),
        where('laneId', '==', laneId),
        where('softDeleted', '==', false)
      );
      const snapshot = await getDocs(q);
      return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() } as AuctionMaster));
    } catch (error) {
      console.error('Error fetching auctions by lane:', error);
      return [];
    }
  }

  /**
   * Update auction (only if not started)
   */
  static async updateAuction(
    auctionId: string,
    updates: Partial<Omit<AuctionMaster, 'id' | 'createdAt' | 'createdBy'>>
  ): Promise<{ success: boolean; error?: any }> {
    try {
      const auction = await this.getAuctionById(auctionId);
      if (!auction) {
        throw new Error('Auction not found');
      }

      // Prevent updates after auction starts
      const now = new Date();
      const bidStartDateTime = new Date(`${auction.bidStartDate}T${auction.bidStartTime}`);
      if (now >= bidStartDateTime) {
        throw new Error('Cannot update auction after it has started');
      }

      const docRef = doc(firestore, COLLECTION, auctionId);
      await updateDoc(docRef, {
        ...updates,
        updatedAt: new Date().toISOString()
      });

      return { success: true };
    } catch (error) {
      console.error('Error updating auction:', error);
      return { success: false, error };
    }
  }

  /**
   * Soft delete auction (cannot delete if active)
   */
  static async deleteAuction(auctionId: string): Promise<{ success: boolean; error?: any }> {
    try {
      const auction = await this.getAuctionById(auctionId);
      if (!auction) {
        throw new Error('Auction not found');
      }

      // Prevent deletion if active
      if (auction.status === AuctionStatus.ACTIVE) {
        throw new Error('Cannot delete active auction');
      }

      const docRef = doc(firestore, COLLECTION, auctionId);
      await updateDoc(docRef, {
        softDeleted: true,
        deletedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });

      return { success: true };
    } catch (error) {
      console.error('Error deleting auction:', error);
      return { success: false, error };
    }
  }

  /**
   * Update auction status
   */
  static async updateAuctionStatus(
    auctionId: string,
    status: AuctionStatus
  ): Promise<{ success: boolean; error?: any }> {
    try {
      const docRef = doc(firestore, COLLECTION, auctionId);
      await updateDoc(docRef, {
        status,
        updatedAt: new Date().toISOString()
      });
      return { success: true };
    } catch (error) {
      console.error('Error updating auction status:', error);
      return { success: false, error };
    }
  }

  /**
   * Real-time listener for all auctions
   */
  static listenToAuctions(
    callback: (auctions: AuctionMaster[]) => void
  ): (() => void) {
    const q = query(
      collection(firestore, COLLECTION),
      where('softDeleted', '==', false)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const auctions = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data()
      } as AuctionMaster));
      callback(auctions);
    });

    return unsubscribe;
  }

  /**
   * Real-time listener for auctions by lane
   */
  static listenToAuctionsByLane(
    laneId: string,
    callback: (auctions: AuctionMaster[]) => void
  ): (() => void) {
    const q = query(
      collection(firestore, COLLECTION),
      where('laneId', '==', laneId),
      where('softDeleted', '==', false)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const auctions = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data()
      } as AuctionMaster));
      callback(auctions);
    });

    return unsubscribe;
  }
}
