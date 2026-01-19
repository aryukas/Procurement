/**
 * Test cases for production-hardened lane matching utilities
 * Demonstrates runtime safety with invalid inputs
 */

import {
  normalizeCityName,
  createLaneKey,
  validateLaneOriginDestination,
  generateLaneCode,
  laneExists,
} from './useLaneMatching';

/**
 * Test Suite: normalizeCityName
 * Tests runtime safety with invalid input types
 */
console.log('\n=== normalizeCityName Tests ===');

// Valid inputs
console.log('Valid string:', normalizeCityName('mumbai')); // Expected: "MUMBAI"
console.log('String with spaces:', normalizeCityName('  new delhi  ')); // Expected: "NEWDELHI"
console.log('Multiple internal spaces:', normalizeCityName('new   delhi')); // Expected: "NEWDELHI"

// Invalid inputs (SHOULD NOT CRASH)
console.log('null input:', normalizeCityName(null)); // Expected: ""
console.log('undefined input:', normalizeCityName(undefined)); // Expected: ""
console.log('number input:', normalizeCityName(123)); // Expected: ""
console.log('boolean input:', normalizeCityName(true)); // Expected: ""
console.log('object input:', normalizeCityName({ city: 'Mumbai' })); // Expected: ""
console.log('array input:', normalizeCityName(['Mumbai'])); // Expected: ""
console.log('empty string:', normalizeCityName('')); // Expected: ""

/**
 * Test Suite: createLaneKey
 * Tests runtime safety with mixed invalid inputs
 */
console.log('\n=== createLaneKey Tests ===');

// Valid inputs
console.log('Valid inputs:', createLaneKey('Mumbai', 'Pune')); // Expected: "MUMBAI-PUNE"
console.log('Mixed case:', createLaneKey('MuMbAi', 'pUnE')); // Expected: "MUMBAI-PUNE"

// Invalid inputs (SHOULD NOT CRASH)
console.log('null origin:', createLaneKey(null, 'Pune')); // Expected: ""
console.log('undefined destination:', createLaneKey('Mumbai', undefined)); // Expected: ""
console.log('number both:', createLaneKey(123, 456)); // Expected: ""
console.log('object both:', createLaneKey({ city: 'Mumbai' }, { city: 'Pune' })); // Expected: ""
console.log('empty strings:', createLaneKey('', '')); // Expected: ""
console.log('same city:', createLaneKey('Mumbai', 'Mumbai')); // Expected: "MUMBAI-MUMBAI" (matching origin/destination)

/**
 * Test Suite: validateLaneOriginDestination
 * Tests validation with invalid inputs
 */
console.log('\n=== validateLaneOriginDestination Tests ===');

// Valid inputs
console.log('Different cities:', validateLaneOriginDestination('Mumbai', 'Pune')); // Expected: true
console.log('Same city:', validateLaneOriginDestination('Mumbai', 'Mumbai')); // Expected: false

// Invalid inputs
console.log('null values:', validateLaneOriginDestination(null, null)); // Expected: false
console.log('mixed types:', validateLaneOriginDestination('Mumbai', 123)); // Expected: false
console.log('empty strings:', validateLaneOriginDestination('', '')); // Expected: false
console.log('object inputs:', validateLaneOriginDestination({ city: 'Mumbai' }, { city: 'Pune' })); // Expected: false

/**
 * Test Suite: generateLaneCode
 * Tests code generation with invalid inputs
 */
console.log('\n=== generateLaneCode Tests ===');

// Valid inputs
console.log('Valid inputs:', generateLaneCode('Mumbai', 'Pune')); // Expected: "MUM-PUN"
console.log('Short names:', generateLaneCode('NYC', 'LA')); // Expected: "NYC-LA"

// Invalid inputs (SHOULD NOT CRASH)
console.log('null inputs:', generateLaneCode(null, null)); // Expected: ""
console.log('empty strings:', generateLaneCode('', '')); // Expected: ""
console.log('number inputs:', generateLaneCode(123, 456)); // Expected: ""
console.log('invalid types:', generateLaneCode({ city: 'Mumbai' }, ['Pune'])); // Expected: ""

/**
 * Test Suite: laneExists
 * Tests lane existence checking with runtime safety
 */
console.log('\n=== laneExists Tests ===');

const mockLanes = [
  {
    id: 'lane1',
    name: 'MUMBAI-PUNE',
    origin: 'MUMBAI',
    destination: 'PUNE',
    code: 'MUM-PUN',
    isActive: true,
    createdAt: '2024-01-01T00:00:00Z',
  },
  {
    id: 'lane2',
    name: 'DELHI-MUMBAI',
    origin: 'DELHI',
    destination: 'MUMBAI',
    code: 'DEL-MUM',
    isActive: true,
    createdAt: '2024-01-01T00:00:00Z',
  },
];

// Valid inputs
console.log('Lane exists:', laneExists(mockLanes, 'Mumbai', 'Pune')); // Expected: true
console.log('Lane does not exist:', laneExists(mockLanes, 'Mumbai', 'Delhi')); // Expected: false
console.log('Case insensitive:', laneExists(mockLanes, 'mumbai', 'pune')); // Expected: true
console.log('With spaces:', laneExists(mockLanes, ' mumbai ', ' pune ')); // Expected: true
console.log('Exclude ID:', laneExists(mockLanes, 'Mumbai', 'Pune', 'lane1')); // Expected: false

// Invalid inputs (SHOULD NOT CRASH)
console.log('null lanes:', laneExists(null, 'Mumbai', 'Pune')); // Expected: false
console.log('undefined lanes:', laneExists(undefined, 'Mumbai', 'Pune')); // Expected: false
console.log('empty array:', laneExists([], 'Mumbai', 'Pune')); // Expected: false
console.log('invalid lanes type:', laneExists('not-an-array', 'Mumbai', 'Pune')); // Expected: false
console.log('null origin:', laneExists(mockLanes, null, 'Pune')); // Expected: false
console.log('undefined destination:', laneExists(mockLanes, 'Mumbai', undefined)); // Expected: false
console.log('empty cities:', laneExists(mockLanes, '', '')); // Expected: false
console.log('same city:', laneExists(mockLanes, 'Mumbai', 'Mumbai')); // Expected: false

console.log('\n=== All tests completed without crashes ===\n');
