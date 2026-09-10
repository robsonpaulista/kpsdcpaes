import { doc, setDoc, type Firestore } from "firebase/firestore";
import { COLLECTIONS } from "@/lib/firebase/collections";
import { omitUndefined } from "@/lib/firestore/omit-undefined";
import {
  listProductionOrders,
} from "@/repositories/orders.repository";
import { upsertProductMapping } from "@/repositories/product-mappings.repository";
import {
  getProductById,
  listProducts,
  upsertProduct,
} from "@/repositories/products.repository";
import type { ProductionOrder, Product } from "@/types/production";

function externalCodeFromOrder(order: ProductionOrder): string | undefined {
  const snap = order.externalSnapshot as
    | { externalProductCode?: string }
    | undefined;
  return snap?.externalProductCode;
}

function suggestProductCode(externalCode: string, name: string): string {
  const fromName = name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 32);
  return fromName || `EXT-${externalCode}`;
}

export interface MapProductInput {
  sourceSystem: string;
  externalProductCode: string;
  externalProductName?: string;
  /** Vincular a produto Factory existente */
  existingProductId?: string;
  /** Cadastrar novo produto Factory */
  createNew?: boolean;
  newProductCode?: string;
  newProductName?: string;
  nominalWeight?: number;
}

export interface MapProductResult {
  product: Product;
  mappingId: string;
  resolvedOrders: ProductionOrder[];
}

/**
 * Mapeia código externo → produto Factory e resolve OPs PENDING_VALIDATION
 * com o mesmo código (sem exigir nova sincronização).
 * Mapping é por código externo — não por nome.
 */
export async function mapExternalProduct(
  db: Firestore,
  input: MapProductInput,
): Promise<MapProductResult> {
  const code = input.externalProductCode.trim();
  if (!code) throw new Error("Código externo obrigatório.");

  let product: Product | null = null;

  if (input.existingProductId) {
    product = await getProductById(db, input.existingProductId);
    if (!product) throw new Error("Produto Factory não encontrado.");
  } else if (input.createNew) {
    const name =
      input.newProductName?.trim() ||
      input.externalProductName?.trim() ||
      `Produto ${code}`;
    const productCode =
      input.newProductCode?.trim() || suggestProductCode(code, name);

    const existing = await listProducts(db);
    if (existing.some((p) => p.code === productCode || p.id === productCode)) {
      throw new Error(
        `Já existe produto com código ${productCode}. Vincule ao existente.`,
      );
    }

    product = await upsertProduct(db, {
      code: productCode,
      name,
      externalProductCode: code,
      nominalWeight: input.nominalWeight,
      unit: "un",
      active: true,
    });
  } else {
    throw new Error("Escolha vincular a um produto ou cadastrar um novo.");
  }

  const mapping = await upsertProductMapping(db, {
    sourceSystem: input.sourceSystem,
    externalProductCode: code,
    productId: product.id,
    active: true,
  });

  const now = new Date().toISOString();
  const orders = await listProductionOrders(db);
  const resolvedOrders: ProductionOrder[] = [];

  for (const order of orders) {
    if (order.sourceSystem !== input.sourceSystem) continue;
    if (order.integrationStatus !== "PENDING_VALIDATION") continue;
    if (externalCodeFromOrder(order) !== code) continue;

    const updated: ProductionOrder = {
      ...order,
      productId: product.id,
      integrationStatus: "SYNCED",
      updatedAt: now,
    };
    await setDoc(
      doc(db, COLLECTIONS.productionOrders, order.id),
      omitUndefined({ ...updated }),
      { merge: true },
    );
    resolvedOrders.push(updated);
  }

  return {
    product,
    mappingId: mapping.id,
    resolvedOrders,
  };
}
