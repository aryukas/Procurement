# Lane Master & Shipment Matching Implementation

## Overview

This document outlines the complete implementation of the Lane Master system and shipment-to-lane matching logic for the procurement platform. The system enables admins to define operational routes (lanes) and assign vendors to specific lanes, ensuring vendors only see shipments they can fulfill.

## Architecture

### 1. Data Models

#### Lane Interface (`src/types.ts`)
```typescript
export interface Lane {
  id: string;                  // Unique identifier (auto-generated)
  name: string;                // e.g., "MUMBAI-PUNE"
  origin: string;              // Starting city (normalized)
  destination: string;         // Ending city (normalized)
  code: string;                // Auto-generated 3-letter code (e.g., "MUM-PUN")
  isActive: boolean;           // Soft delete flag
  createdAt: string;           // ISO timestamp
  updatedAt?: string;          // ISO timestamp
}
```

#### Vendor Interface (Extended User)
```typescript
export interface Vendor extends User {
  email: string;
  phone: string;
  vehicleTypes: VehicleType[];
  lanes: string[];             // Array of Lane IDs assigned to vendor
  isDeleted: boolean;
  createdAt: string;
  updatedAt?: string;
}
```

#### ShipmentBid (Uses origin/destination for matching)
```typescript
export interface ShipmentBid {
  pickupCity: string;          // Origin city (matched against lanes)
  deliveryCity: string;        // Destination city (matched against lanes)
  // ... other fields
}
```

### 2. Service Layer

#### FirebaseService Methods (`src/services/firebaseService.ts`)

**Lane CRUD Operations:**
```typescript
// Create a new lane
static async createLane(laneData: Omit<Lane, 'id' | 'createdAt'>): Promise<Lane>

// Get all active lanes (sorted by origin + destination)
static async getLanes(): Promise<Lane[]>

// Get all lanes including inactive
static async getAllLanes(includeInactive: boolean): Promise<Lane[]>

// Get single lane by ID
static async getLane(id: string): Promise<Lane | null>

// Update lane data
static async updateLane(id: string, updates: Partial<Lane>): Promise<Lane>

// Soft delete (mark inactive)
static async deleteLane(id: string): Promise<void>

// Real-time listener for lane changes
static async listenToLanes(callback: (lanes: Lane[]) => void): Promise<void>
```

### 3. Matching Logic

#### Lane Matching Utilities (`src/hooks/useLaneMatching.ts`)

**Core Functions:**

1. **`normalizeCityName(city: string): string`**
   - Trims whitespace
   - Converts to uppercase
   - Removes all internal spaces
   - Example: "new  delhi" → "NEWDELHI"

2. **`createLaneKey(origin: string, destination: string): string`**
   - Creates normalized lane identifier
   - Format: "ORIGIN-DESTINATION"
   - Example: ("Mumbai", "Pune") → "MUMBAI-PUNE"

3. **`shipmentMatchesLane(shipment: ShipmentBid, lane: Lane): boolean`**
   - ✅ Lane must be active
   - ✅ Shipment origin must match lane origin (case-insensitive)
   - ✅ Shipment destination must match lane destination (case-insensitive)
   - **No fallback lanes** - strict 1:1 matching only

4. **`filterShipmentsByVendorLanes(shipments: ShipmentBid[], vendor: Vendor, lanes: Lane[]): ShipmentBid[]`**
   - Returns shipments matching any of vendor's assigned lanes
   - Used in VendorDashboard to show available shipments

5. **`filterShipmentsByLanes(shipments: ShipmentBid[], laneIds: string[], lanes: Lane[]): ShipmentBid[]`**
   - Generic filter for any set of lane IDs
   - Reusable across components

6. **`getMatchingVendors(shipment: ShipmentBid, vendors: Vendor[], lanes: Lane[]): Vendor[]`**
   - Returns all vendors who can bid on a shipment
   - Used for vendor visibility and notifications

7. **`validateLaneOriginDestination(origin: string, destination: string): boolean`**
   - Ensures origin ≠ destination (case-insensitive)
   - Prevents circular/invalid lanes

8. **`laneExists(lanes: Lane[], origin: string, destination: string): boolean`**
   - Checks for duplicate lanes (case-insensitive)
   - Used during creation/update to prevent duplicates

9. **`generateLaneCode(origin: string, destination: string): string`**
   - Auto-generates 3-letter code from first 3 letters of each city
   - Example: ("Mumbai", "Pune") → "MUM-PUN"

## Implementation Flow

### Admin Lane Management

#### 1. Create Lane
```
Admin clicks "Add New Lane"
→ Modal opens with Origin & Destination fields
→ Validation:
   - Origin ≠ Destination (validateLaneOriginDestination)
   - No duplicate lanes (laneExists)
   - Both fields required
→ On Submit:
   - Normalize city names
   - Generate lane code
   - Call FirebaseService.createLane()
   - Add to local lanes state
   - Close modal & show success
```

#### 2. Edit Lane
```
Admin clicks Edit icon on lane card
→ Modal opens with populated fields
→ Same validation as Create
→ On Submit:
   - Call FirebaseService.updateLane()
   - Update local lanes state
   - Clear edit mode
```

#### 3. Delete Lane (Soft Delete)
```
Admin clicks Delete icon
→ Confirmation modal appears
→ On Confirm:
   - Call FirebaseService.deleteLane() (sets isActive=false)
   - Remove from local lanes state
   - Clear confirmation modal
→ Vendors no longer see shipments for this route
```

### Vendor Lane Assignment

#### In Vendor Management Modal
```
Admin selects vendor
→ "Assigned Lanes" section shows checkboxes
→ Admin can assign multiple lanes to vendor
→ When saving vendor:
   - Store array of lane IDs in vendor.lanes
   - Vendor can now see shipments matching those lanes
```

### Shipment to Vendor Visibility

#### VendorDashboard Shipment Filtering
```
Vendor logs in
→ Component loads lanes from Firebase
→ For each shipment bid:
   - Get vendor's assigned lane IDs
   - For each assigned lane:
     - Check if shipmentMatchesLane(bid, lane)
     - If ANY lane matches → shipment is visible
→ Display matching shipments in vendor dashboard
```

#### Matching Rules
- **Shipment pickup city** must match **lane origin** (normalized, case-insensitive)
- **Shipment delivery city** must match **lane destination** (normalized, case-insensitive)
- **Lane must be active** (isActive = true)
- **NO fallback matching** - if shipment doesn't exactly match a lane, vendor doesn't see it

## UI Components

### Admin Dashboard - Lane Master Tab

#### Lane Creation/Edit Modal
- Fields: Origin City, Destination City
- Validation messages below each field
- Error banner at top for form-level errors
- "Register Lane" or "Update Lane" button
- Loading state during submission

#### Lane Table
- Columns:
  - Route (Origin → Destination + full name)
  - Code (auto-generated 3-letter code)
  - Vendors (count + avatar stack showing up to 3)
  - Status (Active/Inactive badge)
  - Actions (Edit/Delete buttons)
- Empty state with CTA to add first lane
- Responsive design (mobile-friendly)

#### Delete Confirmation Modal
- Warning icon & message
- Explains soft delete behavior
- Cancel & Delete buttons
- Loading state on delete

### Vendor Dashboard - Updated

#### Shipment Filtering
- Only shows shipments matching vendor's assigned lanes
- Uses `shipmentMatchesLane()` for strict matching
- Real-time updates as lanes are added/removed

## Database Structure (Firebase)

```
database
├── lanes/
│   └── lane_id/
│       ├── name: "MUMBAI-PUNE"
│       ├── origin: "MUMBAI"
│       ├── destination: "PUNE"
│       ├── code: "MUM-PUN"
│       ├── isActive: true
│       ├── createdAt: "2024-01-15T10:30:00Z"
│       └── updatedAt: "2024-01-15T10:30:00Z"
│
├── users/
│   └── vendor_id/
│       ├── name: "Cargo Express"
│       ├── email: "cargo@example.com"
│       ├── phone: "9876543210"
│       ├── vehicleTypes: ["TRUCK", "SEMI_TRAILER"]
│       ├── lanes: ["lane_id_1", "lane_id_2"]  ← Added field
│       ├── isDeleted: false
│       ├── createdAt: "2024-01-10T09:00:00Z"
│       └── updatedAt: "2024-01-15T14:20:00Z"
│
├── shipments/ (existing)
│   └── bid_id/
│       ├── pickupCity: "MUMBAI"        ← Used for matching
│       ├── deliveryCity: "PUNE"        ← Used for matching
│       └── ... other fields
```

## Validation Rules

### Lane Creation/Update
✅ **Origin city required** - non-empty string
✅ **Destination city required** - non-empty string
✅ **Origin ≠ Destination** - validateLaneOriginDestination()
✅ **No duplicates** - laneExists() with case-insensitive check
✅ **City name normalization** - trim, uppercase, remove spaces

### Vendor Assignment
✅ **Can assign multiple lanes** - stored as array of IDs
✅ **Lanes must exist** - validated against lanes list
✅ **Can unassign lanes** - by removing from array

## API Endpoints (Firebase)

### Read Operations
```
GET /lanes           → All active lanes
GET /lanes?all       → All lanes (including inactive)
GET /lanes/{id}      → Single lane by ID
```

### Write Operations
```
POST /lanes          → Create new lane (admin only)
PUT /lanes/{id}      → Update lane (admin only)
PATCH /lanes/{id}    → Soft delete (admin only)
```

### Real-time Listeners
```
LISTEN /lanes        → Subscribe to lane changes
LISTEN /vendors/{id} → Subscribe to vendor changes (for lane assignments)
```

## Error Handling

### Lane Creation/Update Errors
- **Origin = Destination**: "Origin and destination must be different"
- **Duplicate Lane**: "This lane already exists"
- **Firebase Error**: Generic error message + console.error()

### Vendor Visibility Errors
- **No Lanes Assigned**: Vendor sees empty state (no shipments available)
- **No Matching Shipments**: Empty list if no shipments match assigned lanes
- **Firebase Connection Lost**: Fallback to cached lanes data

## Testing Scenarios

### Happy Path
1. ✅ Create lane "MUMBAI-PUNE"
2. ✅ Assign lane to vendor "Cargo Express"
3. ✅ Create shipment from Mumbai to Pune
4. ✅ Vendor sees shipment in dashboard
5. ✅ Vendor can place bid

### Edge Cases
1. ✅ Create lane with mixed case ("Mumbai" + "pune") → normalized to "MUMBAI-PUNE"
2. ✅ Try to create duplicate lane with different casing → prevented
3. ✅ Delete lane → vendor no longer sees related shipments
4. ✅ Shipment from "MUMBAI" to "PUNE" doesn't match lane "DELHI-MUMBAI" → vendor doesn't see it
5. ✅ Vendor with no lanes assigned → sees no shipments

## Performance Considerations

### Optimization Techniques
1. **Normalized city names** - case-insensitive matching without regex
2. **Lane codes** - quick visual identification + unique constraint
3. **Soft delete** - preserves historical data & audit trail
4. **Real-time listeners** - Firebase handles connection pooling
5. **Memoization** - useMemo on VendorDashboard for filtered shipments

### Scalability
- Lane count: O(1) lookup by ID, O(n) filter for vendor visibility
- Vendor count: O(1) lookup, O(n) filter by assigned lanes
- Shipment count: O(n) filter per vendor (n = shipments matching vendor's lanes)

## Future Enhancements

1. **Search & Filter** - Search lanes by origin/destination city
2. **Lane Analytics** - View shipments per lane, vendor performance metrics
3. **Bulk Operations** - Upload lanes from CSV, bulk assign vendors
4. **Lane Templating** - Save common lane configurations as templates
5. **Dynamic Pricing** - Different rates per lane
6. **Lane Capacity** - Limit shipments per lane per day
7. **Multi-leg Routes** - Support complex routes (A→B→C)
8. **Vendor Ratings by Lane** - Performance metrics per lane

## Troubleshooting

### Issue: Vendor doesn't see shipments
**Solution:**
1. Check vendor has lanes assigned (via admin panel)
2. Verify shipment pickupCity/deliveryCity match lane origin/destination (normalized)
3. Check lane isActive = true
4. Verify Firebase connectivity

### Issue: Duplicate lanes created
**Solution:**
- Refresh page → laneExists() should prevent with case-insensitive check
- Check Firebase database for conflicting lane names

### Issue: Wrong shipments visible to vendor
**Solution:**
- Verify shipment city names are normalized correctly
- Check lane origin/destination spelling
- Use Firebase console to inspect lane documents

## Files Modified

### Created
- `src/hooks/useLaneMatching.ts` - Centralized matching logic (8 functions)

### Updated
- `src/types.ts` - Extended Lane interface, Vendor interface
- `src/services/firebaseService.ts` - Added 7 lane methods
- `components/AdminDashboard.tsx` - Added lane management UI (CRUD + modals)
- `components/VendorDashboard.tsx` - Updated shipment filtering with lane matching
- `App.tsx` - Added lanes state management

## Compliance & Standards

✅ **TypeScript Strict Mode** - No `any` types, full type safety
✅ **Reusability** - All logic in centralized hooks
✅ **Firebase Best Practices** - Proper indexing, soft delete pattern
✅ **Accessibility** - ARIA labels, keyboard navigation
✅ **Responsive Design** - Mobile-friendly components
✅ **Performance** - Memoization, lazy loading
✅ **Error Handling** - Try-catch blocks, user feedback
✅ **Code Organization** - Separation of concerns, single responsibility

## Summary

The Lane Master implementation provides a robust, scalable system for managing operational routes and matching shipments to vendors. The strict matching logic ensures vendors only see shipments they can fulfill, while the flexible architecture supports future enhancements like dynamic pricing and capacity management.

Key principles:
- **Simplicity** - Easy to understand lane = origin-destination pair
- **Correctness** - No false positives in shipment matching
- **Maintainability** - Centralized logic, well-documented functions
- **Scalability** - Firebase backend handles growth, client-side optimization
