import { NextRequest } from "next/server";
import { adminAuth } from "./firebase-admin";

export async function verifyRequest(req: NextRequest): Promise<string> {
  const token = req.headers.get("Authorization")?.replace("Bearer ", "");
  if (!token) throw new Error("Unauthorized");
  const decoded = await adminAuth().verifyIdToken(token);
  return decoded.uid;
}
