import { initializeApp } from 'firebase/app';
import { getDatabase, ref, get, remove } from 'firebase/database';

/* =====================================================
   Firebase Configuration
   (unchanged – connects to same project & DB)
===================================================== */
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


async function checkLanes(): Promise<void> {
  try {
    console.log('────────────────────────────────────────');
    console.log(' Starting lane integrity check...');
    console.log('────────────────────────────────────────\n');

    const lanesRef = ref(database, 'lanes');
    const snapshot = await get(lanesRef);

    if (!snapshot.exists()) {
      console.log('  No lanes found in database.');
      return;
    }

    const lanes = snapshot.val() as Record<string, any>;

    let validLanes = 0;
    let invalidLanes = 0;
    let cleanedLanes = 0;

    for (const [laneId, lane] of Object.entries(lanes)) {
      console.log(`\n Lane ID: ${laneId}`);
      console.log(lane);

      const hasOrigin =
        lane.origin &&
        typeof lane.origin === 'string' &&
        lane.origin.trim() !== '';

      const hasDestination =
        lane.destination &&
        typeof lane.destination === 'string' &&
        lane.destination.trim() !== '';

      const hasName =
        lane.name &&
        typeof lane.name === 'string' &&
        lane.name.trim() !== '';

      if (hasOrigin && hasDestination && hasName) {
        validLanes++;
        console.log(
          ` Valid lane: ${lane.name} (${lane.origin} → ${lane.destination})`
        );
      } else {
        invalidLanes++;

        console.log(
          ` Invalid lane – Missing: ${
            !hasOrigin ? 'origin ' : ''
          }${!hasDestination ? 'destination ' : ''}${
            !hasName ? 'name' : ''
          }`
        );

       
        console.log(`  Removing lane: ${laneId}`);
        await remove(ref(database, `lanes/${laneId}`));
        cleanedLanes++;
      }
    }

    console.log('\n────────────────────────────────────────');
    console.log(' Lane Cleanup Summary');
    console.log('────────────────────────────────────────');
    console.log(`  Valid lanes        : ${validLanes}`);
    console.log(` Invalid lanes removed: ${cleanedLanes}`);
    console.log(` Total lanes scanned : ${Object.keys(lanes).length}`);
    console.log('────────────────────────────────────────\n');
  } catch (error: any) {
    console.error('Error during lane check:', error?.message || error);
  } finally {
    // Explicit exit (unchanged behavior)
    process.exit(0);
  }
}


checkLanes();
