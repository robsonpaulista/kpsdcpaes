import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  type Firestore,
} from "firebase/firestore";
import type { FactoryRole } from "@/domain/access/roles";
import { COLLECTIONS } from "@/lib/firebase/collections";
import { omitUndefined } from "@/lib/firestore/omit-undefined";
import type { FactoryUserProfile } from "@/types/access";

function usersCol(db: Firestore) {
  return collection(db, COLLECTIONS.users);
}

export async function getUserProfile(
  db: Firestore,
  uid: string,
): Promise<FactoryUserProfile | null> {
  const snap = await getDoc(doc(usersCol(db), uid));
  return snap.exists() ? (snap.data() as FactoryUserProfile) : null;
}

export async function listUserProfiles(
  db: Firestore,
): Promise<FactoryUserProfile[]> {
  const snap = await getDocs(usersCol(db));
  return snap.docs
    .map((d) => d.data() as FactoryUserProfile)
    .sort((a, b) => (a.email ?? a.uid).localeCompare(b.email ?? b.uid));
}

export async function upsertUserProfile(
  db: Firestore,
  profile: Omit<FactoryUserProfile, "createdAt" | "updatedAt"> & {
    createdAt?: string;
    updatedAt?: string;
  },
): Promise<FactoryUserProfile> {
  const ref = doc(usersCol(db), profile.uid);
  const existing = await getDoc(ref);
  const now = new Date().toISOString();
  const roleIds =
    profile.roleIds.length > 0 ? profile.roleIds : [profile.role];

  const payload = omitUndefined({
    uid: profile.uid,
    email: profile.email,
    displayName: profile.displayName,
    role: profile.role,
    roleIds,
    stationIds: profile.stationIds ?? [],
    active: profile.active ?? true,
    createdAt: existing.exists()
      ? ((existing.data().createdAt as string) ?? now)
      : (profile.createdAt ?? now),
    updatedAt: now,
  }) as FactoryUserProfile;

  await setDoc(ref, payload, { merge: true });
  return payload;
}

export async function updateUserRole(
  db: Firestore,
  uid: string,
  role: FactoryRole,
): Promise<FactoryUserProfile | null> {
  const current = await getUserProfile(db, uid);
  if (!current) return null;
  return upsertUserProfile(db, {
    ...current,
    role,
    roleIds: [role],
  });
}
