import { initializeApp, getApps, cert, App } from "firebase-admin/app";
import { getDatabase } from "firebase-admin/database";
import { getAuth } from "firebase-admin/auth";

function parsePrivateKey(raw: string | undefined): string | undefined {
  if (!raw) return undefined;
  // Strip surrounding quotes added by some deployment platforms
  let key = raw.replace(/^["']|["']$/g, "");
  // Replace literal \n sequences with real newlines
  key = key.replace(/\\n/g, "\n");
  return key;
}

function getAdminApp(): App {
  if (getApps().length) return getApps()[0];
  return initializeApp({
    credential: cert({
      projectId: process.env.FIREBASE_ADMIN_PROJECT_ID,
      clientEmail: process.env.FIREBASE_ADMIN_CLIENT_EMAIL,
      privateKey: parsePrivateKey(process.env.FIREBASE_ADMIN_PRIVATE_KEY),
    }),
    databaseURL: process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL,
  });
}

export const adminDb = () => getDatabase(getAdminApp());
export const adminAuth = () => getAuth(getAdminApp());
