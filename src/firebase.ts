import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore, doc, getDocFromServer } from 'firebase/firestore';
import firebaseConfig from '../firebase-applet-config.json';

const app = initializeApp(firebaseConfig);
// Note: CRITICAL requirement from Firebase skill
export const firestore = getFirestore(app, firebaseConfig.firestoreDatabaseId);
export const auth = getAuth(app);

// Verify connection
export async function testFirestoreConnection(): Promise<boolean> {
  try {
    await getDocFromServer(doc(firestore, 'test', 'connection'));
    return true;
  } catch (error) {
    // If not found, that's fine, it means server connected!
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.warn('Firestore offline notice:', error.message);
      return false;
    }
    return true;
  }
}

testFirestoreConnection();
