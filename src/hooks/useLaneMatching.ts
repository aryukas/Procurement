import { ShipmentBid, Lane, Vendor } from '../types';

/**
 * Type guard: safely checks if value is a string
 */
const isString = (value: unknown): value is string => {
  return typeof value === 'string';
};

/**
 * Type guard: safely checks if value is an array
 */
const isArray = (value: unknown): value is unknown[] => {
  return Array.isArray(value);
};

/**
 * Runtime-safe city name normalization
 * Accepts any input type and returns safe normalized string
 * 
 * @param city - Input value (unknown type)
 * @returns Normalized city name (uppercase, trimmed, no spaces) or empty string if invalid
 * 
 * Examples:
 * - "mumbai" → "MUMBAI"
 * - " pune " → "PUNE"
 * - "new  delhi" → "NEWDELHI"
 * - null → ""
 * - undefined → ""
 * - 123 → ""
 * - { city: "Mumbai" } → ""
 * 
 * NEVER THROWS - safe for any input
 */
export const normalizeCityName = (city: unknown): string => {
  // Guard: ensure input is a string
  if (!isString(city)) {
    if (city === null || city === undefined) {
      console.warn('[Lane Matching] Received null/undefined city name');
      return '';
    }
    console.warn(`[Lane Matching] Expected string, received ${typeof city}:`, city);
    return '';
  }

  // Guard: ensure string is not empty before processing
  if (city.length === 0) {
    return '';
  }

  try {
    // Safe normalization chain
    return city
      .trim()           // Remove leading/trailing whitespace
      .toUpperCase()    // Normalize casing
      .replace(/\s+/g, ''); // Remove internal spaces
  } catch (error) {
    // Should not happen with string, but catch unexpected errors
    console.error('[Lane Matching] Error normalizing city:', error);
    return '';
  }
};

/**
 * Creates a safe lane key from origin and destination
 * Returns empty string if either input normalizes to empty
 * 
 * @param origin - Origin city (unknown type, will be normalized)
 * @param destination - Destination city (unknown type, will be normalized)
 * @returns Lane key "ORIGIN-DESTINATION" or empty string if invalid
 */
export const createLaneKey = (origin: unknown, destination: unknown): string => {
  const normalizedOrigin = normalizeCityName(origin);
  const normalizedDestination = normalizeCityName(destination);

  // If either city is empty after normalization, lane key is invalid
  if (normalizedOrigin === '' || normalizedDestination === '') {
    return '';
  }

  return `${normalizedOrigin}-${normalizedDestination}`;
};

/**
 * Safely validates if origin and destination are different
 * Returns false if either value is invalid (empty after normalization)
 * 
 * @param origin - Origin city (unknown type)
 * @param destination - Destination city (unknown type)
 * @returns True if they're different valid cities, false otherwise
 */
export const validateLaneOriginDestination = (
  origin: unknown,
  destination: unknown
): boolean => {
  const normalizedOrigin = normalizeCityName(origin);
  const normalizedDestination = normalizeCityName(destination);

  // Both must be non-empty and different
  if (normalizedOrigin === '' || normalizedDestination === '') {
    return false;
  }

  return normalizedOrigin !== normalizedDestination;
};

/**
 * Checks if a lane already exists (case-insensitive)
 * Runtime-safe: handles missing or invalid lanes array
 * 
 * @param lanes - Array of existing lanes (will be validated)
 * @param origin - Origin city to check (unknown type)
 * @param destination - Destination city to check (unknown type)
 * @param excludeId - Optional lane ID to skip (for edit operations)
 * @returns True if lane exists, false otherwise (also false if inputs invalid)
 */
export const laneExists = (
  lanes: unknown,
  origin: unknown,
  destination: unknown,
  excludeId?: string
): boolean => {
  // Guard: ensure lanes is valid array
  if (!isArray(lanes)) {
    console.warn('[Lane Matching] Expected lanes array, received:', typeof lanes);
    return false;
  }

  // Guard: validate inputs are valid cities
  if (!validateLaneOriginDestination(origin, destination)) {
    return false;
  }

  const normalizedOrigin = normalizeCityName(origin);
  const normalizedDestination = normalizeCityName(destination);

  return lanes.some(lane => {
    try {
      // Type check on lane object
      if (lane === null || typeof lane !== 'object') {
        return false;
      }

      const typedLane = lane as Record<string, unknown>;

      // Skip excluded lane
      if (excludeId && typedLane.id === excludeId) {
        return false;
      }

      // Safe property access
      const laneOrigin = typedLane.origin;
      const laneDestination = typedLane.destination;

      const normalizedLaneOrigin = normalizeCityName(laneOrigin);
      const normalizedLaneDestination = normalizeCityName(laneDestination);

      return (
        normalizedLaneOrigin === normalizedOrigin &&
        normalizedLaneDestination === normalizedDestination
      );
    } catch (error) {
      console.error('[Lane Matching] Error checking lane existence:', error);
      return false;
    }
  });
};

/**
 * Generates lane code from origin and destination
 * Returns empty string if either input is invalid
 * 
 * @param origin - Origin city (unknown type)
 * @param destination - Destination city (unknown type)
 * @returns 3-letter lane code "ABC-DEF" or empty string if invalid
 */
export const generateLaneCode = (origin: unknown, destination: unknown): string => {
  const normalizedOrigin = normalizeCityName(origin);
  const normalizedDestination = normalizeCityName(destination);

  // Both must be valid
  if (normalizedOrigin === '' || normalizedDestination === '') {
    console.warn('[Lane Matching] Cannot generate code for empty cities');
    return '';
  }

  try {
    const originCode = normalizedOrigin.substring(0, 3);
    const destCode = normalizedDestination.substring(0, 3);
    return `${originCode}-${destCode}`;
  } catch (error) {
    console.error('[Lane Matching] Error generating lane code:', error);
    return '';
  }
};

/**
 * Checks if shipment matches a lane with full runtime safety
 * Returns false for any invalid input, never throws
 * 
 * @param shipment - Shipment object (validated)
 * @param lane - Lane object (validated)
 * @returns True if shipment matches lane, false otherwise
 */
export const shipmentMatchesLane = (shipment: ShipmentBid, lane: Lane): boolean => {
  try {
    // Guard: lane must be active
    if (!lane || typeof lane !== 'object' || lane.isActive !== true) {
      return false;
    }

    // Guard: shipment must be valid
    if (!shipment || typeof shipment !== 'object') {
      return false;
    }

    // Safe property access through unknown casting
    const pickupCity = (shipment as unknown as Record<string, unknown>).pickupCity;
    const deliveryCity = (shipment as unknown as Record<string, unknown>).deliveryCity;
    const laneOrigin = (lane as unknown as Record<string, unknown>).origin;
    const laneDestination = (lane as unknown as Record<string, unknown>).destination;

    // Create safe lane keys (returns empty if invalid)
    const shipmentLaneKey = createLaneKey(pickupCity, deliveryCity);
    const laneLaneKey = createLaneKey(laneOrigin, laneDestination);

    // Both keys must be valid (non-empty) and match
    return shipmentLaneKey !== '' && shipmentLaneKey === laneLaneKey;
  } catch (error) {
    console.error('[Lane Matching] Error matching shipment to lane:', error);
    return false;
  }
};

/**
 * Filters shipments that match a vendor's assigned lanes
 * Runtime-safe: validates all inputs, returns empty array on any error
 * 
 * @param shipments - Array of shipments (validated)
 * @param vendor - Vendor object (validated)
 * @param lanes - Array of all available lanes (validated)
 * @returns Filtered shipments that match vendor's lanes
 */
export const filterShipmentsByVendorLanes = (
  shipments: ShipmentBid[],
  vendor: Vendor,
  lanes: Lane[]
): ShipmentBid[] => {
  try {
    // Guard: inputs must be arrays
    if (!isArray(shipments) || !isArray(lanes)) {
      console.warn('[Lane Matching] Expected arrays for shipments/lanes');
      return [];
    }

    // Guard: vendor must have assigned lanes
    if (!vendor || !isArray(vendor.lanes) || vendor.lanes.length === 0) {
      return [];
    }

    // Build a map of lane IDs to lane details for O(1) lookup
    const laneMap = new Map<string, Lane>();
    lanes.forEach(lane => {
      if (lane && typeof lane === 'object' && lane.id) {
        laneMap.set(lane.id as string, lane);
      }
    });

    // Filter shipments that match vendor's lanes
    return shipments.filter(shipment => {
      if (!shipment) return false;

      // Check if shipment matches any vendor lane
      return (vendor.lanes as string[]).some(laneId => {
        if (typeof laneId !== 'string') {
          return false;
        }

        const lane = laneMap.get(laneId);
        return lane ? shipmentMatchesLane(shipment, lane) : false;
      });
    });
  } catch (error) {
    console.error('[Lane Matching] Error filtering shipments by vendor lanes:', error);
    return [];
  }
};

/**
 * Filters shipments that match any of the provided lanes
 * Runtime-safe: validates all inputs
 * 
 * @param shipments - Array of shipments (validated)
 * @param lanes - Array of lanes to match (validated)
 * @returns Filtered shipments that match any lane
 */
export const filterShipmentsByLanes = (
  shipments: ShipmentBid[],
  lanes: Lane[]
): ShipmentBid[] => {
  try {
    // Guard: inputs must be arrays
    if (!isArray(shipments) || !isArray(lanes)) {
      console.warn('[Lane Matching] Expected arrays for shipments/lanes');
      return [];
    }

    if (lanes.length === 0) {
      return [];
    }

    return shipments.filter(shipment => {
      if (!shipment) return false;
      return lanes.some(lane => shipmentMatchesLane(shipment, lane));
    });
  } catch (error) {
    console.error('[Lane Matching] Error filtering shipments by lanes:', error);
    return [];
  }
};

/**
 * Gets all vendors that can bid on a shipment
 * Runtime-safe: validates all inputs, returns empty array on error
 * 
 * @param shipment - Shipment to find vendors for (validated)
 * @param vendors - Array of all vendors (validated)
 * @param lanes - Array of all lanes (validated)
 * @returns Vendors whose assigned lanes match the shipment
 */
export const getMatchingVendors = (
  shipment: ShipmentBid,
  vendors: Vendor[],
  lanes: Lane[]
): Vendor[] => {
  try {
    // Guard: inputs must be valid
    if (!shipment || !isArray(vendors) || !isArray(lanes)) {
      console.warn('[Lane Matching] Invalid inputs to getMatchingVendors');
      return [];
    }

    if (vendors.length === 0 || lanes.length === 0) {
      return [];
    }

    return vendors.filter(vendor => {
      try {
        if (!vendor || !isArray(vendor.lanes) || vendor.lanes.length === 0) {
          return false;
        }

        // Get lane objects for vendor's assigned lanes
        const vendorLanes: Lane[] = [];
        (vendor.lanes as string[]).forEach(laneId => {
          if (typeof laneId === 'string') {
            const lane = lanes.find(l => l && l.id === laneId);
            if (lane) {
              vendorLanes.push(lane);
            }
          }
        });

        // Check if shipment matches any of vendor's lanes
        return vendorLanes.length > 0 && vendorLanes.some(lane => shipmentMatchesLane(shipment, lane));
      } catch (error) {
        console.error('[Lane Matching] Error matching vendor:', error);
        return false;
      }
    });
  } catch (error) {
    console.error('[Lane Matching] Error getting matching vendors:', error);
    return [];
  }
};
