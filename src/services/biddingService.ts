// src/services/biddingService.ts
import { database } from '../firebase';
import { ref, set, get, push, update, onValue, off } from 'firebase/database';
import { SimpleShipment, VendorBid, VendorBidStatus } from '../../types';

const SHIPMENTS_PATH = 'shipments';
const BIDS_PATH = 'bids';

export class BiddingService {
  // ─────────────────────────────────────────────────
  // SHIPMENT OPERATIONS
  // ─────────────────────────────────────────────────

  static async createShipment(shipmentData: Omit<SimpleShipment, 'id' | 'createdAt'>) {
    try {
      const newShipmentRef = push(ref(database, SHIPMENTS_PATH));
      const shipmentWithId: SimpleShipment = {
        ...shipmentData,
        id: newShipmentRef.key!,
        createdAt: new Date().toISOString()
      };
      await set(newShipmentRef, shipmentWithId);
      return { success: true, id: newShipmentRef.key };
    } catch (error) {
      console.error('Error creating shipment:', error);
      return { success: false, error };
    }
  }

  static async getShipments() {
    try {
      const snapshot = await get(ref(database, SHIPMENTS_PATH));
      if (snapshot.exists()) {
        return Object.values(snapshot.val()) as SimpleShipment[];
      }
      return [];
    } catch (error) {
      console.error('Error getting shipments:', error);
      return [];
    }
  }

  static async getOpenShipments() {
    try {
      const snapshot = await get(ref(database, SHIPMENTS_PATH));
      if (snapshot.exists()) {
        const shipments = Object.values(snapshot.val()) as SimpleShipment[];
        return shipments.filter(s => s.status === 'OPEN');
      }
      return [];
    } catch (error) {
      console.error('Error getting open shipments:', error);
      return [];
    }
  }

  static async getShipmentById(shipmentId: string) {
    try {
      const snapshot = await get(ref(database, `${SHIPMENTS_PATH}/${shipmentId}`));
      return snapshot.exists() ? (snapshot.val() as SimpleShipment) : null;
    } catch (error) {
      console.error('Error getting shipment:', error);
      return null;
    }
  }

  static async updateShipmentStatus(shipmentId: string, status: string, winningBidId?: string, finalAmount?: number) {
    try {
      const updates: any = { 
        status,
        updatedAt: new Date().toISOString()
      };
      
      if (status === 'PENDING_ADMIN_APPROVAL') {
        updates.auctionClosedAt = new Date().toISOString();
      }
      
      if (status === 'FINALIZED' || status === 'APPROVED') {
        updates.winningBidId = winningBidId;
        updates.finalAmount = finalAmount;
      }
      
      await update(ref(database, `${SHIPMENTS_PATH}/${shipmentId}`), updates);
      return { success: true };
    } catch (error) {
      console.error('Error updating shipment status:', error);
      return { success: false, error };
    }
  }

  static listenToShipments(callback: (shipments: SimpleShipment[]) => void) {
    const shipmentsRef = ref(database, SHIPMENTS_PATH);
    onValue(shipmentsRef, (snapshot) => {
      if (snapshot.exists()) {
        const shipments = Object.values(snapshot.val()) as SimpleShipment[];
        callback(shipments);
      } else {
        callback([]);
      }
    });
    return () => off(shipmentsRef);
  }

  // ─────────────────────────────────────────────────
  // BID OPERATIONS
  // ─────────────────────────────────────────────────

  static async placeBid(bidData: Omit<VendorBid, 'id' | 'createdAt' | 'updatedAt' | 'status'>) {
    try {
      // Check if vendor already bid on this shipment
      const existingBid = await this.getVendorBidOnShipment(bidData.shipmentId, bidData.vendorId);
      if (existingBid) {
        return { success: false, error: 'Vendor has already placed a bid on this shipment' };
      }

      const newBidRef = push(ref(database, BIDS_PATH));
      const bidWithId: VendorBid = {
        ...bidData,
        id: newBidRef.key!,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        status: VendorBidStatus.PENDING
      };
      await set(newBidRef, bidWithId);
      return { success: true, id: newBidRef.key };
    } catch (error) {
      console.error('Error placing bid:', error);
      return { success: false, error };
    }
  }

  static async getBidsForShipment(shipmentId: string) {
    try {
      const snapshot = await get(ref(database, BIDS_PATH));
      if (snapshot.exists()) {
        const allBids = Object.values(snapshot.val()) as VendorBid[];
        return allBids.filter(bid => bid.shipmentId === shipmentId).sort((a, b) => a.bidAmount - b.bidAmount);
      }
      return [];
    } catch (error) {
      console.error('Error getting bids for shipment:', error);
      return [];
    }
  }

  static async getVendorBidOnShipment(shipmentId: string, vendorId: string) {
    try {
      const snapshot = await get(ref(database, BIDS_PATH));
      if (snapshot.exists()) {
        const allBids = Object.values(snapshot.val()) as VendorBid[];
        return allBids.find(bid => bid.shipmentId === shipmentId && bid.vendorId === vendorId);
      }
      return null;
    } catch (error) {
      console.error('Error getting vendor bid:', error);
      return null;
    }
  }

  static async getVendorBids(vendorId: string) {
    try {
      const snapshot = await get(ref(database, BIDS_PATH));
      if (snapshot.exists()) {
        const allBids = Object.values(snapshot.val()) as VendorBid[];
        return allBids.filter(bid => bid.vendorId === vendorId);
      }
      return [];
    } catch (error) {
      console.error('Error getting vendor bids:', error);
      return [];
    }
  }

  static async approveBid(bidId: string, shipmentId: string) {
    try {
      // Update the bid status
      await update(ref(database, `${BIDS_PATH}/${bidId}`), {
        status: VendorBidStatus.APPROVED,
        updatedAt: new Date().toISOString()
      });

      // Reject all other bids for this shipment
      const allBids = await this.getBidsForShipment(shipmentId);
      for (const bid of allBids) {
        if (bid.id !== bidId) {
          await update(ref(database, `${BIDS_PATH}/${bid.id}`), {
            status: VendorBidStatus.REJECTED,
            updatedAt: new Date().toISOString()
          });
        }
      }

      // Update shipment status to APPROVED
      await this.updateShipmentStatus(shipmentId, 'APPROVED', bidId);

      return { success: true };
    } catch (error) {
      console.error('Error approving bid:', error);
      return { success: false, error };
    }
  }

  static async rejectBid(bidId: string) {
    try {
      await update(ref(database, `${BIDS_PATH}/${bidId}`), {
        status: VendorBidStatus.REJECTED,
        updatedAt: new Date().toISOString()
      });
      return { success: true };
    } catch (error) {
      console.error('Error rejecting bid:', error);
      return { success: false, error };
    }
  }

  static listenToBidsForShipment(shipmentId: string, callback: (bids: VendorBid[]) => void) {
    const bidsRef = ref(database, BIDS_PATH);
    onValue(bidsRef, (snapshot) => {
      if (snapshot.exists()) {
        const allBids = Object.values(snapshot.val()) as VendorBid[];
        const filtered = allBids.filter(bid => bid.shipmentId === shipmentId).sort((a, b) => a.bidAmount - b.bidAmount);
        callback(filtered);
      } else {
        callback([]);
      }
    });
    return () => off(bidsRef);
  }

  static listenToVendorBids(vendorId: string, callback: (bids: VendorBid[]) => void) {
    const bidsRef = ref(database, BIDS_PATH);
    onValue(bidsRef, (snapshot) => {
      if (snapshot.exists()) {
        const allBids = Object.values(snapshot.val()) as VendorBid[];
        const filtered = allBids.filter(bid => bid.vendorId === vendorId);
        callback(filtered);
      } else {
        callback([]);
      }
    });
    return () => off(bidsRef);
  }

  // ─────────────────────────────────────────────────
  // AUCTION CLOSING & WINNER SELECTION
  // ─────────────────────────────────────────────────

  static async closeAuction(shipmentId: string) {
    try {
      // Get all bids for this shipment
      const allBids = await this.getBidsForShipment(shipmentId);
      
      if (allBids.length === 0) {
        // No bids received - mark as closed
        await this.updateShipmentStatus(shipmentId, 'CLOSED');
        return { success: true, result: 'NO_BIDS' };
      }

      // Sort by amount (ascending) - lowest bid wins
      const sortedBids = [...allBids].sort((a, b) => a.bidAmount - b.bidAmount);
      const winningBid = sortedBids[0];

      // Mark shipment as pending admin approval with winning bid
      await this.updateShipmentStatus(
        shipmentId, 
        'PENDING_ADMIN_APPROVAL', 
        winningBid.id,
        winningBid.bidAmount
      );

      // Update winning bid status
      await update(ref(database, `${BIDS_PATH}/${winningBid.id}`), {
        status: VendorBidStatus.APPROVED,
        updatedAt: new Date().toISOString()
      });

      // Reject all other bids
      for (const bid of sortedBids.slice(1)) {
        await update(ref(database, `${BIDS_PATH}/${bid.id}`), {
          status: VendorBidStatus.REJECTED,
          updatedAt: new Date().toISOString()
        });
      }

      return { 
        success: true, 
        result: 'WINNER_SELECTED',
        winningVendor: winningBid.vendorName,
        winningAmount: winningBid.bidAmount
      };
    } catch (error) {
      console.error('Error closing auction:', error);
      return { success: false, error };
    }
  }

  static async finalizeBid(bidId: string, shipmentId: string) {
    try {
      // Mark shipment as FINALIZED
      await this.updateShipmentStatus(shipmentId, 'FINALIZED', bidId);
      
      // Get the bid to extract final amount
      const bid = await this.getVendorBidOnShipment(shipmentId, await this.getVendorIdForBid(bidId));
      
      // Update winning vendor ID
      await update(ref(database, `${SHIPMENTS_PATH}/${shipmentId}`), {
        winningVendorId: bid?.vendorId
      });

      return { success: true };
    } catch (error) {
      console.error('Error finalizing bid:', error);
      return { success: false, error };
    }
  }

  static async rejectAndSelectNext(rejectedBidId: string, nextBidId: string, shipmentId: string) {
    try {
      // Reject the current winning bid
      await update(ref(database, `${BIDS_PATH}/${rejectedBidId}`), {
        status: VendorBidStatus.REJECTED,
        updatedAt: new Date().toISOString()
      });

      // Approve the next lowest bid
      const nextBid = await this.getVendorBidOnShipment(shipmentId, ''); // Will fetch by ID instead
      await update(ref(database, `${BIDS_PATH}/${nextBidId}`), {
        status: VendorBidStatus.APPROVED,
        updatedAt: new Date().toISOString()
      });

      // Update shipment with new winning bid
      const snapshot = await get(ref(database, `${BIDS_PATH}/${nextBidId}`));
      if (snapshot.exists()) {
        const nextBidData = snapshot.val() as VendorBid;
        await this.updateShipmentStatus(
          shipmentId,
          'PENDING_ADMIN_APPROVAL',
          nextBidId,
          nextBidData.bidAmount
        );
      }

      return { success: true };
    } catch (error) {
      console.error('Error rejecting and selecting next bid:', error);
      return { success: false, error };
    }
  }

  private static async getVendorIdForBid(bidId: string): Promise<string | null> {
    try {
      const snapshot = await get(ref(database, `${BIDS_PATH}/${bidId}`));
      return snapshot.exists() ? snapshot.val().vendorId : null;
    } catch (error) {
      return null;
    }
  }
}
