// src/services/vendorService.ts
import {
  collection,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  getDocs,
  getDoc,
  query,
  where,
  onSnapshot
} from 'firebase/firestore';
import { firestore } from '../firebase';
import { VendorMaster } from '../../types';

const COLLECTION = 'vendors';

export class VendorService {
  /**
   * Create a new vendor
   */
  static async createVendor(
    vendorData: Omit<VendorMaster, 'id' | 'createdAt' | 'updatedAt'>
  ): Promise<{ success: boolean; id?: string; error?: any }> {
    try {
      // Validate required fields
      if (!vendorData.name || !vendorData.email || !vendorData.phone) {
        throw new Error('Name, email, and phone are required');
      }

      if (!vendorData.assignedLanes || vendorData.assignedLanes.length === 0) {
        throw new Error('At least one lane must be assigned');
      }

      // Check for unique email
      const existingVendor = await this.getVendorByEmail(vendorData.email);
      if (existingVendor) {
        throw new Error('Vendor with this email already exists');
      }

      const newVendor = {
        ...vendorData,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      const docRef = await addDoc(collection(firestore, COLLECTION), newVendor);
      return { success: true, id: docRef.id };
    } catch (error) {
      console.error('Error creating vendor:', error);
      return { success: false, error };
    }
  }

  /**
   * Get all active vendors
   */
  static async getVendors(): Promise<VendorMaster[]> {
    try {
      const snapshot = await getDocs(collection(firestore, COLLECTION));
      return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() } as VendorMaster));
    } catch (error) {
      console.error('Error fetching vendors:', error);
      return [];
    }
  }

  /**
   * Get vendor by ID
   */
  static async getVendorById(vendorId: string): Promise<VendorMaster | null> {
    try {
      const docRef = doc(firestore, COLLECTION, vendorId);
      const snapshot = await getDoc(docRef);
      if (snapshot.exists()) {
        return { id: snapshot.id, ...snapshot.data() } as VendorMaster;
      }
      return null;
    } catch (error) {
      console.error('Error fetching vendor:', error);
      return null;
    }
  }

  /**
   * Get vendor by email
   */
  static async getVendorByEmail(email: string): Promise<VendorMaster | null> {
    try {
      const q = query(collection(firestore, COLLECTION), where('email', '==', email));
      const snapshot = await getDocs(q);
      if (snapshot.docs.length > 0) {
        const doc = snapshot.docs[0];
        return { id: doc.id, ...doc.data() } as VendorMaster;
      }
      return null;
    } catch (error) {
      console.error('Error fetching vendor by email:', error);
      return null;
    }
  }

  /**
   * Get vendors by lane ID
   */
  static async getVendorsByLaneId(laneId: string): Promise<VendorMaster[]> {
    try {
      const q = query(
        collection(firestore, COLLECTION),
        where('assignedLanes', 'array-contains', laneId),
        where('isActive', '==', true)
      );
      const snapshot = await getDocs(q);
      return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() } as VendorMaster));
    } catch (error) {
      console.error('Error fetching vendors by lane:', error);
      return [];
    }
  }

  /**
   * Update vendor
   */
  static async updateVendor(
    vendorId: string,
    updates: Partial<Omit<VendorMaster, 'id' | 'createdAt' | 'createdBy'>>
  ): Promise<{ success: boolean; error?: any }> {
    try {
      const vendor = await this.getVendorById(vendorId);
      if (!vendor) {
        throw new Error('Vendor not found');
      }

      // If updating email, check uniqueness (excluding self)
      if (updates.email && updates.email !== vendor.email) {
        const existingVendor = await this.getVendorByEmail(updates.email);
        if (existingVendor) {
          throw new Error('Vendor with this email already exists');
        }
      }

      const docRef = doc(firestore, COLLECTION, vendorId);
      await updateDoc(docRef, {
        ...updates,
        updatedAt: new Date().toISOString()
      });

      return { success: true };
    } catch (error) {
      console.error('Error updating vendor:', error);
      return { success: false, error };
    }
  }

  /**
   * Hard delete vendor - permanently removes from database
   */
  static async deleteVendor(vendorId: string): Promise<{ success: boolean; error?: any }> {
    try {
      const vendor = await this.getVendorById(vendorId);
      if (!vendor) {
        throw new Error('Vendor not found');
      }

      // Perform hard delete - permanently remove from database
      const docRef = doc(firestore, COLLECTION, vendorId);
      await deleteDoc(docRef);

      return { success: true };
    } catch (error) {
      console.error('Error deleting vendor:', error);
      return { success: false, error };
    }
  }

  /**
   * Real-time listener for all vendors
   */
  static listenToVendors(callback: (vendors: VendorMaster[]) => void): (() => void) {
    const unsubscribe = onSnapshot(collection(firestore, COLLECTION), (snapshot) => {
      const vendors = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data()
      } as VendorMaster));
      callback(vendors);
    });

    return unsubscribe;
  }

  /**
   * Real-time listener for vendors by lane
   */
  static listenToVendorsByLane(
    laneId: string,
    callback: (vendors: VendorMaster[]) => void
  ): (() => void) {
    const q = query(
      collection(firestore, COLLECTION),
      where('assignedLanes', 'array-contains', laneId),
      where('isActive', '==', true)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const vendors = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data()
      } as VendorMaster));
      callback(vendors);
    });

    return unsubscribe;
  }
}
