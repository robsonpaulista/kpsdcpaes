import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  type Firestore,
} from "firebase/firestore";
import {
  COLLECTIONS,
  productMappingDocId,
} from "@/lib/firebase/collections";
import { omitUndefined } from "@/lib/firestore/omit-undefined";
import type { ProductMapping } from "@/types/production";
import {
  MOCK_FACTORY_PRODUCTS,
  MOCK_SOURCE_SYSTEM,
} from "@/integrations/production-orders/fixtures/mock-orders";

function mappingsCol(db: Firestore) {
  return collection(db, COLLECTIONS.productMappings);
}

export async function upsertProductMapping(
  db: Firestore,
  mapping: Omit<ProductMapping, "id" | "createdAt" | "updatedAt"> & {
    createdAt?: string;
  },
): Promise<ProductMapping> {
  const id = productMappingDocId(
    mapping.sourceSystem,
    mapping.externalProductCode,
  );
  const ref = doc(mappingsCol(db), id);
  const now = new Date().toISOString();
  const existing = await getDoc(ref);

  const payload = omitUndefined({
    id,
    sourceSystem: mapping.sourceSystem,
    externalProductCode: mapping.externalProductCode,
    externalProductId: mapping.externalProductId,
    productId: mapping.productId,
    active: mapping.active,
    createdAt: existing.exists()
      ? ((existing.data().createdAt as string) ?? now)
      : now,
    updatedAt: now,
  }) as ProductMapping;

  await setDoc(ref, payload, { merge: true });
  return payload;
}

export async function seedMockProductMappings(
  db: Firestore,
): Promise<ProductMapping[]> {
  const result: ProductMapping[] = [];
  for (const p of MOCK_FACTORY_PRODUCTS) {
    const mapping = await upsertProductMapping(db, {
      sourceSystem: MOCK_SOURCE_SYSTEM,
      externalProductCode: p.externalProductCode,
      productId: p.code,
      active: true,
    });
    result.push(mapping);
  }
  return result;
}

export async function findActiveMapping(
  db: Firestore,
  sourceSystem: string,
  externalProductCode: string,
): Promise<ProductMapping | null> {
  const id = productMappingDocId(sourceSystem, externalProductCode);
  const snap = await getDoc(doc(mappingsCol(db), id));
  if (!snap.exists()) return null;
  const data = snap.data() as ProductMapping;
  return data.active ? data : null;
}

export async function listProductMappings(
  db: Firestore,
): Promise<ProductMapping[]> {
  const snap = await getDocs(mappingsCol(db));
  return snap.docs.map((d) => d.data() as ProductMapping);
}
