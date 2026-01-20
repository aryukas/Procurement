# CRUD Implementation Guide - Admin Modules

## Overview
Complete CRUD functionality has been implemented for three admin modules in the logistics procurement platform built with React + TypeScript + Firebase.

---

## 1. Architecture & File Structure

### New Services (`src/services/`)
- **`auctionService.ts`** - Firestore operations for Auction Master
- **`vendorService.ts`** - Firestore operations for Vendor Master  
- **`laneService.ts`** - Firestore operations for Lane Master

### New Hooks (`src/hooks/`)
- **`useAuctions.ts`** - Real-time auction data management
- **`useVendors.ts`** - Real-time vendor data management (NEW, separate from Firebase hooks)
- **`useLanes.ts`** - Real-time lane data management (NEW, separate from Firebase hooks)

### New Components (`src/components/admin/`)
- **`AuctionConsole.tsx`** - Auction CRUD UI
- **`VendorMaster.tsx`** - Vendor CRUD UI
- **`LaneMaster.tsx`** - Lane CRUD UI

### Updated Files
- **`types.ts`** - Added new interfaces: `AuctionMaster`, `VendorMaster`, `LaneMaster`, `AuctionStatus`
- **`components/AdminDashboard.tsx`** - Integrated new modules with tab navigation

---

## 2. Firestore Collections & Data Models

### auctions
```typescript
{
  id: string;
  laneId: string;                    // References Lane Master
  vehicleType: VehicleType;          // TRUCK, CONTAINER, LCV, TRAILER
  loadType: LoadType;                // FTL, LTL
  materialType: string;              // e.g., Electronics, Textiles
  capacity: string;                  // e.g., "20 Tons"
  bidStartDate: string;              // ISO date
  bidStartTime: string;              // ISO time
  bidEndDate: string;                // ISO date
  bidEndTime: string;                // ISO time
  ceilingPrice: number;              // Max bid
  stepValue: number;                 // Min step down
  status: AuctionStatus;             // DRAFT, ACTIVE, CLOSED, CANCELLED
  createdAt: string;                 // Timestamp
  updatedAt: string;                 // Timestamp
  createdBy: string;                 // Admin ID
  softDeleted: boolean;              // For soft deletes
  deletedAt?: string;                // Optional deletion timestamp
}
```

### vendors
```typescript
{
  id: string;
  name: string;
  email: string;                     // Unique constraint
  phone: string;
  vehicleTypes: VehicleType[];       // Multi-select
  assignedLanes: string[];           // References Lane IDs
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  createdBy: string;
  notes?: string;
}
```

### lanes
```typescript
{
  id: string;
  code: string;                      // AUTO: "ORIGIN-DESTINATION"
  origin: string;                    // Normalized (uppercase, trimmed)
  destination: string;               // Normalized (uppercase, trimmed)
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  createdBy: string;
}
```

---

## 3. CRUD Operations

### AUCTION CONSOLE

#### Create
✅ Fields: Lane, Vehicle Type, Load Type, Material Type, Capacity, Pricing, Dates/Times
✅ Validation: Start < End, Positive prices, Lane must exist
✅ Auto-generates ID via Firestore
✅ Stores with `createdAt`, `updatedAt`, `createdBy`

```typescript
await AuctionService.createAuction({
  laneId: "lane-123",
  vehicleType: VehicleType.TRUCK,
  loadType: LoadType.FTL,
  materialType: "Electronics",
  capacity: "20 Tons",
  bidStartDate: "2026-01-20",
  bidStartTime: "09:00",
  bidEndDate: "2026-01-21",
  bidEndTime: "17:00",
  ceilingPrice: 50000,
  stepValue: 1000,
  status: AuctionStatus.DRAFT,
  createdBy: "admin-id"
});
```

#### Read
✅ `getAuctions()` - All active (non-deleted) auctions
✅ `getAuctionById()` - Single auction
✅ `getAuctionsByLaneId()` - Filtered by lane
✅ Real-time listeners with `listenToAuctions()` and `listenToAuctionsByLane()`

#### Update
✅ Editable only before start time
✅ Prevents updates after auction begins
✅ Can change status, pricing, dates (if not started)
✅ Validates before update

```typescript
await AuctionService.updateAuction(auctionId, {
  ceilingPrice: 55000,
  stepValue: 1500,
  status: AuctionStatus.ACTIVE
});
```

#### Delete
✅ Soft delete (marks `softDeleted: true`)
✅ Prevents deletion if auction is ACTIVE
✅ Records deletion timestamp
✅ Requires confirmation modal

---

### VENDOR MASTER

#### Create
✅ Fields: Name, Email, Phone, Vehicle Types, Assigned Lanes
✅ Validation:
  - Name, Email, Phone required
  - Email must be unique
  - At least one vehicle type required
  - At least one lane must be assigned
✅ Email uniqueness enforced at Firestore level

```typescript
await VendorService.createVendor({
  name: "ABC Logistics",
  email: "admin@abclogistics.com",
  phone: "+91-9876543210",
  vehicleTypes: [VehicleType.TRUCK, VehicleType.CONTAINER],
  assignedLanes: ["lane-1", "lane-2"],
  isActive: true,
  createdBy: "admin-id",
  notes: "Preferred partner"
});
```

#### Read
✅ `getVendors()` - All vendors
✅ `getVendorById()` - Single vendor
✅ `getVendorByEmail()` - Email lookup
✅ `getVendorsByLaneId()` - Active vendors in lane
✅ Real-time listeners with `listenToVendors()` and `listenToVendorsByLane()`

#### Update
✅ Edit all fields except `createdBy`
✅ Email uniqueness check (excluding self)
✅ Preserves auction history
✅ Real-time propagation to dashboard

```typescript
await VendorService.updateVendor(vendorId, {
  name: "ABC Logistics Inc.",
  assignedLanes: ["lane-1", "lane-3"],
  isActive: true
});
```

#### Delete
✅ Soft delete (marks `isActive: false`)
✅ Prevents deletion if active bids exist (logic in caller)
✅ Historical data preserved
✅ Requires confirmation modal

---

### LANE MASTER

#### Create
✅ Fields: Origin, Destination (auto-generates code)
✅ Validation:
  - Both cities required
  - Not equal to each other
  - Case-normalized (ORIGIN-DESTINATION)
  - Prevents duplicates
✅ Auto-generates `code` from cities

```typescript
await LaneService.createLane({
  origin: "Delhi",
  destination: "Mumbai",
  isActive: true,
  createdBy: "admin-id"
  // Code auto-generated: "DELHI-MUMBAI"
});
```

#### Read
✅ `getLanes()` - All lanes
✅ `getActiveLanes()` - Active lanes only
✅ `getLaneById()` - Single lane
✅ `getLaneByCode()` - Code lookup
✅ Real-time listeners with `listenToLanes()` and `listenToActiveLanes()`

#### Update
✅ Editable if no active auctions (caller verifies)
✅ Updates status and other fields
✅ Maintains backward compatibility

```typescript
await LaneService.updateLane(laneId, {
  isActive: false
});
```

#### Delete
✅ Soft delete (marks `isActive: false`)
✅ Prevents deletion if linked to auctions (enforced in UI)
✅ Lane code preserved for historical reference
✅ Requires confirmation modal

---

## 4. UI/UX Components

### AuctionConsole
- **Tab**: Globe icon + "Auction Console"
- **Layout**: 
  - Summary stats (Active, Savings, Partners, Finalized)
  - Grid/List toggle for auction display
  - Detailed shipment insights sidebar
- **Modal**: Create/Edit auction with collapsible sections
- **Delete Modal**: Confirmation with reason
- **Features**:
  - Search by lane
  - Filter by status
  - Real-time countdown timers
  - Status indicators (Draft, Active, Closed, Cancelled)

### VendorMaster
- **Tab**: Building2 icon + "Vendor Master"
- **Layout**: 
  - Data table with search & filter
  - Active/Inactive status badges
  - Lane assignment count
- **Modal**: Create/Edit vendor with checkboxes for:
  - Vehicle types (Truck, Container, LCV, Trailer)
  - Assigned lanes (scrollable list)
- **Delete Modal**: Confirmation modal
- **Features**:
  - Real-time vendor list updates
  - Email/name search
  - Active/Inactive filter

### LaneMaster
- **Tab**: Route icon + "Lane Master"
- **Layout**: Card grid showing:
  - Lane code (e.g., "DELHI-MUMBAI")
  - Origin → Destination arrows
  - Creation/update dates
  - Active/Inactive badge
- **Modal**: Simple form for origin/destination with code preview
- **Delete Modal**: Blocks deletion if auctions linked
- **Features**:
  - Lane code auto-generation
  - Real-time lane list updates
  - Audit trail (created/updated dates)

---

## 5. Real-Time Features

All services use Firestore real-time listeners:

```typescript
// Auction real-time
const unsubscribe = AuctionService.listenToAuctions((auctions) => {
  // Updates whenever auctions change
});

// Vendor real-time
const unsubscribe = VendorService.listenToVendors((vendors) => {
  // Updates whenever vendors change
});

// Lane real-time
const unsubscribe = LaneService.listenToLanes((lanes) => {
  // Updates whenever lanes change
});
```

Cleanup on component unmount:
```typescript
useEffect(() => {
  const unsubscribe = AuctionService.listenToAuctions((data) => {
    setAuctions(data);
  });
  return () => unsubscribe(); // Cleanup
}, []);
```

---

## 6. Access Control & RBAC

### Admin Access
✅ Full CRUD for all three modules
✅ No restrictions on operations
✅ `adminId` parameter passed to services

### Vendor Access (Future Implementation)
- Read-only access to matched auctions (by `assignedLanes`)
- Cannot access Admin CRUD modules
- Auction visibility: Only if `auctionMaster.laneId` ∈ `vendor.assignedLanes`

---

## 7. Validation Rules

### Auction Validation
- Lane ID required and must exist
- Start date/time < End date/time
- Ceiling price > 0
- Step value > 0
- Cannot update if auction has started
- Cannot delete if auction is ACTIVE

### Vendor Validation
- Name required (non-empty)
- Email required + valid format + unique
- Phone required (non-empty)
- At least one vehicle type selected
- At least one lane must be assigned
- Email uniqueness checked on create/update

### Lane Validation
- Origin city required (non-empty)
- Destination city required (non-empty)
- Origin ≠ Destination
- Code uniqueness enforced
- Cities normalized (uppercase, trimmed)

---

## 8. Usage Examples

### Creating an Auction
```typescript
const result = await AuctionService.createAuction({
  laneId: "lane-delhi-mumbai",
  vehicleType: VehicleType.TRUCK,
  loadType: LoadType.FTL,
  materialType: "Electronics",
  capacity: "20 Tons",
  bidStartDate: "2026-01-22",
  bidStartTime: "10:00",
  bidEndDate: "2026-01-22",
  bidEndTime: "18:00",
  ceilingPrice: 50000,
  stepValue: 1000,
  status: AuctionStatus.DRAFT,
  createdBy: "admin-123"
});

if (result.success) {
  console.log("Auction created:", result.id);
} else {
  console.error("Error:", result.error);
}
```

### Creating a Vendor
```typescript
const result = await VendorService.createVendor({
  name: "Express Haulers",
  email: "contact@expresshaulers.com",
  phone: "+91-9999888877",
  vehicleTypes: [VehicleType.TRUCK],
  assignedLanes: ["lane-1", "lane-2"],
  isActive: true,
  createdBy: "admin-123",
  notes: "Tier-1 partner"
});

if (result.success) {
  console.log("Vendor created:", result.id);
} else {
  console.error("Error:", result.error);
}
```

### Creating a Lane
```typescript
const result = await LaneService.createLane({
  origin: "Bangalore",
  destination: "Hyderabad",
  isActive: true,
  createdBy: "admin-123"
});

if (result.success) {
  console.log("Lane created:", result.id);
  // Code will be auto-generated as "BANGALORE-HYDERABAD"
} else {
  console.error("Error:", result.error);
}
```

---

## 9. Firestore Indexes (Required)

For optimal performance, create composite indexes:

### Auctions
```
Collection: auctions
Fields:
- softDeleted (Ascending)
- status (Ascending)
- laneId (Ascending)
```

### Vendors
```
Collection: vendors
Fields:
- isActive (Ascending)
- assignedLanes (Arrays)
- email (Ascending)
```

### Lanes
```
Collection: lanes
Fields:
- isActive (Ascending)
- code (Ascending)
```

---

## 10. Testing Checklist

### Auction Console
- [ ] Create auction with all fields
- [ ] Cannot create with end time before start time
- [ ] Cannot create with empty lane
- [ ] Edit auction before it starts
- [ ] Cannot edit after auction starts
- [ ] Delete auction with confirmation
- [ ] Cannot delete active auction
- [ ] Real-time updates on auction status change
- [ ] Search by lane name
- [ ] Filter by status

### Vendor Master
- [ ] Create vendor with all required fields
- [ ] Cannot create with duplicate email
- [ ] Email validation (format check)
- [ ] At least one lane required
- [ ] At least one vehicle type required
- [ ] Edit vendor profile
- [ ] Delete/mark vendor as inactive
- [ ] Real-time vendor list updates
- [ ] Search by name/email
- [ ] Filter by active/inactive

### Lane Master
- [ ] Create lane with origin and destination
- [ ] Auto-generates lane code (ORIGIN-DESTINATION)
- [ ] Cannot create duplicate lanes
- [ ] Cannot create with origin = destination
- [ ] Edit lane status
- [ ] Cannot delete lane with active auctions
- [ ] Delete/mark lane as inactive
- [ ] Real-time lane updates
- [ ] Lane normalization (uppercase, trimmed)

---

## 11. Error Handling

All services include try-catch blocks:
```typescript
try {
  const result = await AuctionService.createAuction(data);
  if (result.success) {
    // Handle success
  } else {
    // Handle error from result.error
  }
} catch (error) {
  // Handle unexpected errors
}
```

Modal error states display validation messages:
```typescript
{error && (
  <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
    <p className="text-red-700 text-sm">{error}</p>
  </div>
)}
```

---

## 12. Future Enhancements

- [ ] Bulk import/export for vendors and lanes
- [ ] Audit logs for all CRUD operations
- [ ] Advanced filtering (date range, price range)
- [ ] Duplicate lane detection warnings
- [ ] Vendor tier/rating system
- [ ] Auction templates for common routes
- [ ] Email notifications on auction status changes
- [ ] Export auction results to PDF
- [ ] Vendor availability calendar
- [ ] Lane utilization analytics

---

## Environment Setup

Ensure Firebase credentials in `.env`:
```
VITE_FIREBASE_API_KEY=...
VITE_FIREBASE_AUTH_DOMAIN=...
VITE_FIREBASE_PROJECT_ID=...
VITE_FIREBASE_STORAGE_BUCKET=...
```

No new dependencies required - uses existing React, TypeScript, and Firebase packages.

---

**Implementation Status**: ✅ Complete
**Last Updated**: January 20, 2026
