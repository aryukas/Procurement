// src/services/firebaseService.ts
import { database } from '../firebase.ts';
import { ref, set, get, push, update, onValue, off } from 'firebase/database';
import { DB_PATHS, Bid, Shipment, User } from '../utils/dbStructure';
import { ShipmentBid, BidStatus, BidOffer, VehicleDetails, Notification } from '../../types';

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

  // Vendor operations
  static async createVendor(vendorData: Omit<User, 'id'>) {
    try {
      const newVendorRef = push(ref(database, DB_PATHS.VENDORS));
      const vendorWithId = { ...vendorData, id: newVendorRef.key };
      await set(newVendorRef, vendorWithId);
      return { success: true, vendorId: newVendorRef.key };
    } catch (error) {
      console.error('Error creating vendor:', error);
      return { success: false, error };
    }
  }

  static async getVendors() {
    try {
      const snapshot = await get(ref(database, DB_PATHS.VENDORS));
      if (snapshot.exists()) {
        return Object.values(snapshot.val()) as User[];
      }
      return [];
    } catch (error) {
      console.error('Error getting vendors:', error);
      return [];
    }
  }

  static async updateVendor(vendorId: string, updates: Partial<User>) {
    try {
      await update(ref(database, `${DB_PATHS.VENDORS}/${vendorId}`), updates);
      return { success: true };
    } catch (error) {
      console.error('Error updating vendor:', error);
      return { success: false, error };
    }
  }

  static async deleteVendor(vendorId: string) {
    try {
      await set(ref(database, `${DB_PATHS.VENDORS}/${vendorId}`), null);
      return { success: true };
    } catch (error) {
      console.error('Error deleting vendor:', error);
      return { success: false, error };
    }
  }

  // Lane operations
  static async createLane(laneData: Omit<Lane, 'id' | 'name'>) {
    try {
      const laneName = `${laneData.origin.toUpperCase()}-${laneData.destination.toUpperCase()}`;
      const newLaneRef = push(ref(database, DB_PATHS.LANES));
      const laneWithId = { 
        ...laneData, 
        id: newLaneRef.key,
        name: laneName
      };
      await set(newLaneRef, laneWithId);
      return { success: true, laneId: newLaneRef.key };
    } catch (error) {
      console.error('Error creating lane:', error);
      return { success: false, error };
    }
  }

  static async getLanes() {
    try {
      const snapshot = await get(ref(database, DB_PATHS.LANES));
      if (snapshot.exists()) {
        return Object.values(snapshot.val()) as Lane[];
      }
      return [];
    } catch (error) {
      console.error('Error getting lanes:', error);
      return [];
    }
  }

  static async updateLane(laneId: string, updates: Partial<Lane>) {
    try {
      await update(ref(database, `${DB_PATHS.LANES}/${laneId}`), updates);
      return { success: true };
    } catch (error) {
      console.error('Error updating lane:', error);
      return { success: false, error };
    }
  }

  static async deleteLane(laneId: string) {
    try {
      await set(ref(database, `${DB_PATHS.LANES}/${laneId}`), null);
      return { success: true };
    } catch (error) {
      console.error('Error deleting lane:', error);
      return { success: false, error };
    }
  }

  // Real-time listeners for lanes
  static listenToLanes(callback: (lanes: Lane[]) => void) {
    const lanesRef = ref(database, DB_PATHS.LANES);
    onValue(lanesRef, (snapshot) => {
      if (snapshot.exists()) {
        const lanes = Object.values(snapshot.val()) as Lane[];
        callback(lanes);
      } else {
        callback([]);
      }
    });
    return () => off(lanesRef);
  }

  // Real-time listeners for vendors
  static listenToVendors(callback: (vendors: User[]) => void) {
    const vendorsRef = ref(database, DB_PATHS.VENDORS);
    onValue(vendorsRef, (snapshot) => {
      if (snapshot.exists()) {
        const vendors = Object.values(snapshot.val()) as User[];
        callback(vendors);
      } else {
        callback([]);
      }
    });
    return () => off(vendorsRef);
  }

  // ShipmentBid operations (for the app's current structure)
  static async createShipmentBid(bidData: Omit<ShipmentBid, 'id' | 'offers' | 'createdAt'>) {
    try {
      const newBidRef = push(ref(database, DB_PATHS.BIDS));
      const bidWithId: ShipmentBid = {
        ...bidData,
        id: newBidRef.key!,
        offers: [],
        createdAt: new Date().toISOString(),
        status: BidStatus.OPEN
      };
      await set(newBidRef, bidWithId);
      return { success: true, bidId: newBidRef.key };
    } catch (error) {
      console.error('Error creating shipment bid:', error);
      return { success: false, error };
    }
  }

  static async updateShipmentBid(bidId: string, updates: Partial<ShipmentBid>) {
    try {
      await update(ref(database, `${DB_PATHS.BIDS}/${bidId}`), updates);
      return { success: true };
    } catch (error) {
      console.error('Error updating shipment bid:', error);
      return { success: false, error };
    }
  }

  static async placeBidOffer(bidId: string, offer: BidOffer) {
    try {
      const bidRef = ref(database, `${DB_PATHS.BIDS}/${bidId}`);
      const snapshot = await get(bidRef);
      if (snapshot.exists()) {
        const bid = snapshot.val() as ShipmentBid;
        const currentOffers = bid.offers || []; // Ensure offers is always an array
        const updatedOffers = [...currentOffers, offer].sort((a, b) => a.amount - b.amount);
        await update(bidRef, { offers: updatedOffers });
        return { success: true };
      }
      return { success: false, error: 'Bid not found' };
    } catch (error) {
      console.error('Error placing bid offer:', error);
      return { success: false, error };
    }
  }

  static async submitVehicleDetails(bidId: string, vehicleDetails: VehicleDetails) {
    try {
      await update(ref(database, `${DB_PATHS.BIDS}/${bidId}`), { vehicleDetails });
      return { success: true };
    } catch (error) {
      console.error('Error submitting vehicle details:', error);
      return { success: false, error };
    }
  }

  static async deleteShipmentBid(bidId: string) {
    try {
      await set(ref(database, `${DB_PATHS.BIDS}/${bidId}`), null);
      return { success: true };
    } catch (error) {
      console.error('Error deleting shipment bid:', error);
      return { success: false, error };
    }
  }

  // Real-time listeners for ShipmentBid
  static listenToShipmentBids(callback: (bids: ShipmentBid[]) => void) {
    const bidsRef = ref(database, DB_PATHS.BIDS);
    onValue(bidsRef, (snapshot) => {
      if (snapshot.exists()) {
        const rawData = snapshot.val();
        const bids = Object.values(snapshot.val()).map((bid: any) => ({
          ...bid,
          offers: bid.offers || [], // Ensure offers is always an array
          status: bid.status || BidStatus.OPEN,
          createdAt: bid.createdAt || new Date().toISOString()
        })) as ShipmentBid[];
        callback(bids);
      } else {
        callback([]);
      }
    });
    return () => off(bidsRef);
  }
}