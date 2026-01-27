import { initializeApp } from 'firebase/app';
import { getDatabase, ref, get, update } from 'firebase/database';



const firebaseConfig = {
  apiKey: 'AIzaSyCvzs-HsRtaObQUHD0VCPigEbHj_nZX4g0',
  authDomain: 'dms1-d9c09.firebaseapp.com',
  databaseURL: 'https://dms1-d9c09-default-rtdb.firebaseio.com',
  projectId: 'dms1-d9c09',
  storageBucket: 'dms1-d9c09.firebasestorage.app',
  messagingSenderId: '200431721433',
  appId: '1:200431721433:web:7edafc573157af72e697c8',
  measurementId: 'G-2NRP205RBD'
};


const app = initializeApp(firebaseConfig);
const database = getDatabase(app);

const BIDS_PATH = 'bids';

/* ---------------------------------- */
/* SCRIPT */
/* ---------------------------------- */

async function fixBidsOffers() {
  console.log('🔍 Checking and fixing bids offers array...\n');

  try {
    const bidsRef = ref(database, BIDS_PATH);
    const snapshot = await get(bidsRef);

    if (!snapshot.exists()) {
      console.log('ℹ No bids found in database');
      process.exit(0);
    }

    const bids = snapshot.val();
    const bidEntries = Object.entries(bids);
    let fixedCount = 0;

    for (const [bidId, bid] of bidEntries) {
      const hasValidOffersArray = Array.isArray(bid?.offers);

      if (!hasValidOffersArray) {
        console.log(`🛠️  Fixing bid "${bidId}" → offers missing or invalid`);

        await update(ref(database, `${BIDS_PATH}/${bidId}`), {
          offers: bid?.offers || []
        });

        fixedCount++;
      }
    }

    console.log('\n Fix complete');
    console.log(`• Fixed bids: ${fixedCount}`);
    console.log(`• Total bids scanned: ${bidEntries.length}`);
  } catch (error) {
    console.error('\n Error fixing bids offers:', error?.message || error);
  } finally {
    process.exit(0);
  }
}



fixBidsOffers();
