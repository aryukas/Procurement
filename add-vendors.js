const { initializeApp } = require('firebase/app');
const { getDatabase, ref, set } = require('firebase/database');

/* ---------------------------------- */
/* FIREBASE CONFIG */
/* ---------------------------------- */

const firebaseConfig = {
  apiKey: process.env.FIREBASE_API_KEY || 'AIzaSyCvzs-HsRtaObQUHD0VCPigEbHj_nZX4g0',
  authDomain: process.env.FIREBASE_AUTH_DOMAIN || 'dms1-d9c09.firebaseapp.com',
  databaseURL:
    process.env.FIREBASE_DB_URL ||
    'https://dms1-d9c09-default-rtdb.firebaseio.com',
  projectId: process.env.FIREBASE_PROJECT_ID || 'dms1-d9c09',
  storageBucket:
    process.env.FIREBASE_STORAGE_BUCKET ||
    'dms1-d9c09.firebasestorage.app',
  messagingSenderId:
    process.env.FIREBASE_MESSAGING_SENDER_ID || '200431721433',
  appId:
    process.env.FIREBASE_APP_ID ||
    '1:200431721433:web:7edafc573157af72e697c8',
  measurementId: process.env.FIREBASE_MEASUREMENT_ID || 'G-2NRP205RBD'
};

/* ---------------------------------- */
/* INIT */
/* ---------------------------------- */

const app = initializeApp(firebaseConfig);
const database = getDatabase(app);

const VENDORS_PATH = 'vendors';

/* ---------------------------------- */
/* TEST DATA */
/* ---------------------------------- */

const testVendors = [
  {
    id: 'v-1',
    name: 'Blue Dart Logistics',
    role: 'VENDOR',
    lanes: ['DELHI-MUMBAI', 'DELHI-JAIPUR']
  },
  {
    id: 'v-2',
    name: 'Gati KWE',
    role: 'VENDOR',
    lanes: ['DELHI-MUMBAI', 'BLR-CHN']
  },
  {
    id: 'v-3',
    name: 'Safexpress',
    role: 'VENDOR',
    lanes: ['MUMBAI-PUNE', 'DELHI-MUMBAI']
  }
];

/* ---------------------------------- */
/* SCRIPT */
/* ---------------------------------- */

async function addTestVendors() {
  console.log('🚀 Seeding vendors to Firebase...\n');

  try {
    for (const vendor of testVendors) {
      if (!vendor.id || !vendor.name) {
        console.warn('⚠️ Skipping invalid vendor record:', vendor);
        continue;
      }

      const vendorRef = ref(database, `${VENDORS_PATH}/${vendor.id}`);
      await set(vendorRef, vendor);

      console.log(`✅ Added vendor: ${vendor.name}`);
    }

    console.log('\n🎉 All test vendors added successfully');
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Error adding vendors:', error);
    process.exit(1);
  }
}

addTestVendors();
