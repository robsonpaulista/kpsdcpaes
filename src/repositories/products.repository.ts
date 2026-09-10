import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  type Firestore,
} from "firebase/firestore";
import { COLLECTIONS } from "@/lib/firebase/collections";
import { omitUndefined } from "@/lib/firestore/omit-undefined";
import type { Product } from "@/types/production";
import { MOCK_FACTORY_PRODUCTS } from "@/integrations/production-orders/fixtures/mock-orders";

function productsCol(db: Firestore) {
  return collection(db, COLLECTIONS.products);
}

export async function upsertProduct(
  db: Firestore,
  product: Omit<Product, "id" | "createdAt" | "updatedAt"> & {
    id?: string;
    createdAt?: string;
    updatedAt?: string;
  },
): Promise<Product> {
  const id = product.id ?? product.code;
  const ref = doc(productsCol(db), id);
  const now = new Date().toISOString();
  const existing = await getDoc(ref);

  const payload = omitUndefined({
    id,
    code: product.code,
    name: product.name,
    externalProductId: product.externalProductId,
    externalProductCode: product.externalProductCode,
    active: product.active ?? true,
    unit: product.unit,
    nominalWeight: product.nominalWeight,
    processRoute: product.processRoute,
    createdAt: existing.exists()
      ? ((existing.data().createdAt as string) ?? now)
      : now,
    updatedAt: now,
  }) as Product;

  await setDoc(ref, payload, { merge: true });
  return payload;
}

export async function seedMockFactoryProducts(db: Firestore): Promise<Product[]> {
  const seeded: Product[] = [];
  for (const p of MOCK_FACTORY_PRODUCTS) {
    const product = await upsertProduct(db, {
      code: p.code,
      name: p.name,
      externalProductCode: p.externalProductCode,
      nominalWeight: p.nominalWeight,
      unit: p.unit,
      active: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
    seeded.push(product);
  }
  return seeded;
}

export async function listProducts(db: Firestore): Promise<Product[]> {
  const snap = await getDocs(productsCol(db));
  return snap.docs.map((d) => d.data() as Product);
}

export async function getProductById(
  db: Firestore,
  id: string,
): Promise<Product | null> {
  const snap = await getDoc(doc(productsCol(db), id));
  return snap.exists() ? (snap.data() as Product) : null;
}
