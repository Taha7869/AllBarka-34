import { initializeApp, applicationDefault } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
try {
  const app = initializeApp({ credential: applicationDefault(), projectId: "primal-circuit-ck76w" });
  const db = getFirestore(app, "ai-studio-allbarkadryfruit-399bea9d-c3e1-40fd-99d8-34c767a5b8b0");
  console.log("Firestore init OK");
} catch(e) {
  console.error(e);
}
