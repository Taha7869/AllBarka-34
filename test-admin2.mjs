import { initializeApp, applicationDefault } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
try {
  const app = initializeApp({ credential: applicationDefault(), projectId: "primal-circuit-ck76w" });
  const db = getFirestore(app, "ai-studio-allbarkadryfruit-399bea9d-c3e1-40fd-99d8-34c767a5b8b0");
  const doc = await db.collection("users").limit(1).get();
  console.log("Read OK", doc.empty);
} catch(e) {
  console.error("Error:", e.message);
}
