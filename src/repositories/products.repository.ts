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
import {
  FACTORY_PRODUCT_CATALOG,
  LEGACY_MOCK_PRODUCT_CODES,
} from "@/domain/production/product-catalog-seed";

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
    imageUrl: product.imageUrl,
    processRoute: product.processRoute,
    createdAt: existing.exists()
      ? ((existing.data().createdAt as string) ?? now)
      : now,
    updatedAt: now,
  }) as Product;

  await setDoc(ref, payload, { merge: true });
  return payload;
}

/** Semear catálogo DC Pães (imagens reais) e desativar SKUs mock antigos. */
export async function seedMockFactoryProducts(db: Firestore): Promise<Product[]> {
  const seeded: Product[] = [];
  for (const p of FACTORY_PRODUCT_CATALOG) {
    const product = await upsertProduct(db, {
      code: p.code,
      name: p.name,
      externalProductCode: p.externalProductCode,
      imageUrl: p.imageUrl,
      unit: p.unit,
      active: true,
    });
    seeded.push(product);
  }

  for (const code of LEGACY_MOCK_PRODUCT_CODES) {
    const existing = await getProductById(db, code);
    if (existing?.active) {
      await upsertProduct(db, {
        ...existing,
        active: false,
      });
    }
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
