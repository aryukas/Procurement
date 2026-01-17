// src/services/firebaseService.ts
import { database } from '../firebase.ts';
import { ref, set, get, push, update, onValue, off } from 'firebase/database';
import { DB_PATHS, Bid, Shipment, User } from '../utils/dbStructure';

export class FirebaseService {
  // User operations
  static async createUser(userId: string, userData: User) {
    try {
      await set(ref(database, `${DB_PATHS.USERS}/${userId}`), userData);
      return { success: true };
    } catch (error) {
      console.error('Error creating user:', error);
      return { success: false, error };
    }
  }

  static async getUser(userId: string) {
    try {
      const snapshot = await get(ref(database, `${DB_PATHS.USERS}/${userId}`));
      return snapshot.exists() ? snapshot.val() : null;
    } catch (error) {
      console.error('Error getting user:', error);
      return null;
    }
  }

  // Bid operations
  static async createBid(bidData: Omit<Bid, 'bidId'>) {
    try {
      const newBidRef = push(ref(database, DB_PATHS.BIDS));
      const bidWithId = { ...bidData, bidId: newBidRef.key };
      await set(newBidRef, bidWithId);
      return { success: true, bidId: newBidRef.key };
    } catch (error) {
      console.error('Error creating bid:', error);
      return { success: false, error };
    }
  }

  static async getBids() {
    try {
      const snapshot = await get(ref(database, DB_PATHS.BIDS));
      if (snapshot.exists()) {
        return Object.values(snapshot.val()) as Bid[];
      }
      return [];
    } catch (error) {
      console.error('Error getting bids:', error);
      return [];
    }
  }

  static async updateBidStatus(bidId: string, status: Bid['status']) {
    try {
      await update(ref(database, `${DB_PATHS.BIDS}/${bidId}`), { status });
      return { success: true };
    } catch (error) {
      console.error('Error updating bid status:', error);
      return { success: false, error };
    }
  }

  // Real-time listeners
  static listenToBids(callback: (bids: Bid[]) => void) {
    const bidsRef = ref(database, DB_PATHS.BIDS);
    onValue(bidsRef, (snapshot) => {
      if (snapshot.exists()) {
        const bids = Object.values(snapshot.val()) as Bid[];
        callback(bids);
      } else {
        callback([]);
      }
    });
    return () => off(bidsRef);
  }

  // Shipment operations
  static async createShipment(shipmentData: Omit<Shipment, 'shipmentId'>) {
    try {
      const newShipmentRef = push(ref(database, DB_PATHS.SHIPMENTS));
      const shipmentWithId = { ...shipmentData, shipmentId: newShipmentRef.key };
      await set(newShipmentRef, shipmentWithId);
      return { success: true, shipmentId: newShipmentRef.key };
    } catch (error) {
      console.error('Error creating shipment:', error);
      return { success: false, error };
    }
  }

  static listenToShipments(callback: (shipments: Shipment[]) => void) {
    const shipmentsRef = ref(database, DB_PATHS.SHIPMENTS);
    onValue(shipmentsRef, (snapshot) => {
      if (snapshot.exists()) {
        const shipments = Object.values(snapshot.val()) as Shipment[];
        callback(shipments);
      } else {
        callback([]);
      }
    });
    return () => off(shipmentsRef);
  }

  // Notification operations
  static async createNotification(userId: string, notification: any) {
    try {
      const notifRef = push(ref(database, `${DB_PATHS.NOTIFICATIONS}/${userId}`));
      await set(notifRef, { ...notification, createdAt: Date.now() });
      return { success: true };
    } catch (error) {
      console.error('Error creating notification:', error);
      return { success: false, error };
    }
  }
}