// src/services/liveAuctionService.ts
import { database } from '../firebase';
import { ref, set, get, push, update, onValue, off } from 'firebase/database';
import { LiveAuction, ReverseBid, LiveAuctionStatus } from '../../types';

const LIVE_AUCTIONS_PATH = 'live_auctions';
const REVERSE_BIDS_PATH = 'reverse_bids';

export class LiveAuctionService {
  // ─────────────────────────────────────────────────
  // AUCTION OPERATIONS
  // ─────────────────────────────────────────────────

  static async createLiveAuction(auctionData: Omit<LiveAuction, 'id' | 'createdAt' | 'updatedAt'>) {
    try {
      const newAuctionRef = push(ref(database, LIVE_AUCTIONS_PATH));
      const auctionWithId: LiveAuction = {
        ...auctionData,
        id: newAuctionRef.key!,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      await set(newAuctionRef, auctionWithId);
      return { success: true, id: newAuctionRef.key };
    } catch (error) {
      console.error('Error creating live auction:', error);
      return { success: false, error };
    }
  }

  static async getActiveLanesForVendor(vendorLaneIds: string[]) {
    try {
      const snapshot = await get(ref(database, LIVE_AUCTIONS_PATH));
      if (snapshot.exists()) {
        const allAuctions = Object.values(snapshot.val()) as LiveAuction[];
        return allAuctions.filter(
          auction => vendorLaneIds.includes(auction.laneId) && auction.status === 'ACTIVE'
        );
      }
      return [];
    } catch (error) {
      console.error('Error getting active lanes for vendor:', error);
      return [];
    }
  }

  static async getAuctionById(auctionId: string) {
    try {
      const snapshot = await get(ref(database, `${LIVE_AUCTIONS_PATH}/${auctionId}`));
      if (snapshot.exists()) {
        return snapshot.val() as LiveAuction;
      }
      return null;
    } catch (error) {
      console.error('Error getting auction:', error);
      return null;
    }
  }

  static async getAllActiveAuctions() {
    try {
      const snapshot = await get(ref(database, LIVE_AUCTIONS_PATH));
      if (snapshot.exists()) {
        const allAuctions = Object.values(snapshot.val()) as LiveAuction[];
        return allAuctions.filter(a => a.status === 'ACTIVE');
      }
      return [];
    } catch (error) {
      console.error('Error getting all active auctions:', error);
      return [];
    }
  }

  static async closeAuction(auctionId: string, winningBidId?: string) {
    try {
      const updateData: Partial<LiveAuction> = {
        status: 'CLOSED' as LiveAuctionStatus,
        updatedAt: new Date().toISOString()
      };
      if (winningBidId) {
        updateData.winningBidId = winningBidId;
      }
      await update(ref(database, `${LIVE_AUCTIONS_PATH}/${auctionId}`), updateData);
      return { success: true };
    } catch (error) {
      console.error('Error closing auction:', error);
      return { success: false, error };
    }
  }

  static listenToAuction(auctionId: string, callback: (auction: LiveAuction | null) => void) {
    const auctionRef = ref(database, `${LIVE_AUCTIONS_PATH}/${auctionId}`);
    onValue(auctionRef, (snapshot) => {
      if (snapshot.exists()) {
        callback(snapshot.val() as LiveAuction);
      } else {
        callback(null);
      }
    });
    return () => off(auctionRef);
  }

  // ─────────────────────────────────────────────────
  // BID OPERATIONS
  // ─────────────────────────────────────────────────

  static async placeBid(bidData: Omit<ReverseBid, 'id' | 'createdAt' | 'updatedAt' | 'status'>) {
    try {
      // Validation: Check all required fields
      if (!bidData.auctionId || !bidData.vendorId || !bidData.vendorName || !bidData.laneId) {
        return { 
          success: false, 
          error: 'Missing required bid information'
        };
      }

      // Validation: Amount must be positive
      if (!bidData.amount || bidData.amount <= 0) {
        return { 
          success: false, 
          error: 'Bid amount must be greater than 0'
        };
      }

      // Check auction status
      const auction = await this.getAuctionById(bidData.auctionId);
      if (!auction) {
        return { 
          success: false, 
          error: 'Auction not found'
        };
      }

      if (auction.status !== 'ACTIVE') {
        return { 
          success: false, 
          error: `Auction is not active (Status: ${auction.status})`
        };
      }

      // Check if auction has expired
      const endTime = new Date(auction.endTime);
      if (endTime < new Date()) {
        return { 
          success: false, 
          error: 'Auction has expired'
        };
      }

      // Get vendor's previous bid on this auction
      const prevBids = await this.getVendorBidsOnAuction(bidData.auctionId, bidData.vendorId);
      const latestBid = prevBids[0]; // Most recent (sorted by time)

      // Validation: New bid must be lower than previous bid (for reverse auction)
      if (latestBid && bidData.amount >= latestBid.amount) {
        return { 
          success: false, 
          error: `New bid (₹${bidData.amount}) must be lower than your previous bid (₹${latestBid.amount})`
        };
      }

      // Get current lowest bid across all vendors
      const allBids = await this.getBidsForAuction(bidData.auctionId);
      const lowestBid = allBids.length > 0 ? Math.min(...allBids.map(b => b.amount)) : Infinity;

      // Validation: New bid should ideally be lower than lowest bid
      if (allBids.length > 0 && bidData.amount > lowestBid) {
        console.warn(`Bid (₹${bidData.amount}) is higher than current lowest (₹${lowestBid})`);
      }

      const newBidRef = push(ref(database, REVERSE_BIDS_PATH));
      const bidWithId: ReverseBid = {
        ...bidData,
        id: newBidRef.key!,
        status: 'ACTIVE',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      await set(newBidRef, bidWithId);

      // Update auction with lowest bid
      if (bidData.amount < lowestBid) {
        await update(ref(database, `${LIVE_AUCTIONS_PATH}/${bidData.auctionId}`), {
          lowestBid: bidData.amount,
          lowestBidVendorId: bidData.vendorId,
          updatedAt: new Date().toISOString()
        });
      }

      return { success: true, id: newBidRef.key };
    } catch (error) {
      console.error('Error placing bid:', error);
      return { success: false, error };
    }
  }

  static async getBidsForAuction(auctionId: string) {
    try {
      const snapshot = await get(ref(database, REVERSE_BIDS_PATH));
      if (snapshot.exists()) {
        const allBids = Object.values(snapshot.val()) as ReverseBid[];
        // Return active bids sorted by amount (lowest first)
        return allBids
          .filter(b => b.auctionId === auctionId && b.status === 'ACTIVE')
          .sort((a, b) => a.amount - b.amount);
      }
      return [];
    } catch (error) {
      console.error('Error getting bids for auction:', error);
      return [];
    }
  }

  static async getVendorBidsOnAuction(auctionId: string, vendorId: string) {
    try {
      const snapshot = await get(ref(database, REVERSE_BIDS_PATH));
      if (snapshot.exists()) {
        const allBids = Object.values(snapshot.val()) as ReverseBid[];
        return allBids
          .filter(b => b.auctionId === auctionId && b.vendorId === vendorId)
          .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      }
      return [];
    } catch (error) {
      console.error('Error getting vendor bids:', error);
      return [];
    }
  }

  static async getBidById(bidId: string) {
    try {
      const snapshot = await get(ref(database, `${REVERSE_BIDS_PATH}/${bidId}`));
      if (snapshot.exists()) {
        return snapshot.val() as ReverseBid;
      }
      return null;
    } catch (error) {
      console.error('Error getting bid:', error);
      return null;
    }
  }

  static async approveBid(bidId: string, auctionId: string) {
    try {
      // Get the bid
      const bid = await this.getBidById(bidId);
      if (!bid) {
        return { success: false, error: 'Bid not found' };
      }

      // Mark this bid as approved
      await update(ref(database, `${REVERSE_BIDS_PATH}/${bidId}`), {
        status: 'APPROVED',
        updatedAt: new Date().toISOString()
      });

      // Mark all other active bids for this auction as OUTBID
      const allBids = await this.getBidsForAuction(auctionId);
      for (const otherBid of allBids) {
        if (otherBid.id !== bidId && otherBid.status === 'ACTIVE') {
          await update(ref(database, `${REVERSE_BIDS_PATH}/${otherBid.id}`), {
            status: 'OUTBID',
            updatedAt: new Date().toISOString()
          });
        }
      }

      // Close the auction
      await this.closeAuction(auctionId, bidId);

      return { success: true };
    } catch (error) {
      console.error('Error approving bid:', error);
      return { success: false, error };
    }
  }

  static listenToBidsForAuction(auctionId: string, callback: (bids: ReverseBid[]) => void) {
    const bidsRef = ref(database, REVERSE_BIDS_PATH);
    onValue(bidsRef, (snapshot) => {
      if (snapshot.exists()) {
        const allBids = Object.values(snapshot.val()) as ReverseBid[];
        const auctionBids = allBids
          .filter(b => b.auctionId === auctionId && b.status === 'ACTIVE')
          .sort((a, b) => a.amount - b.amount);
        callback(auctionBids);
      } else {
        callback([]);
      }
    });
    return () => off(bidsRef);
  }

  static listenToVendorBidsOnAuction(auctionId: string, vendorId: string, callback: (bids: ReverseBid[]) => void) {
    const bidsRef = ref(database, REVERSE_BIDS_PATH);
    onValue(bidsRef, (snapshot) => {
      if (snapshot.exists()) {
        const allBids = Object.values(snapshot.val()) as ReverseBid[];
        const vendorBids = allBids
          .filter(b => b.auctionId === auctionId && b.vendorId === vendorId)
          .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        callback(vendorBids);
      } else {
        callback([]);
      }
    });
    return () => off(bidsRef);
  }

  static listenToAllActiveBidsForVendor(vendorId: string, callback: (bids: ReverseBid[]) => void) {
    const bidsRef = ref(database, REVERSE_BIDS_PATH);
    onValue(bidsRef, (snapshot) => {
      if (snapshot.exists()) {
        const allBids = Object.values(snapshot.val()) as ReverseBid[];
        const vendorBids = allBids
          .filter(b => b.vendorId === vendorId && b.status !== 'OUTBID')
          .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        callback(vendorBids);
      } else {
        callback([]);
      }
    });
    return () => off(bidsRef);
  }
}
