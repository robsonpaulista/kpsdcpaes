import type { Firestore } from "firebase/firestore";
import {
  EQUIPMENT_SEED,
  equipmentFromSeed,
} from "@/domain/production/equipment-seed";
import {
  getEquipmentById,
  listEquipment,
  upsertEquipment,
} from "@/repositories/equipment.repository";
import type { Equipment } from "@/types/equipment";

export async function seedFactoryEquipment(db: Firestore): Promise<{
  created: number;
  skipped: number;
  equipment: Equipment[];
}> {
  const now = new Date().toISOString();
  let created = 0;
  let skipped = 0;

  for (const seed of EQUIPMENT_SEED) {
    const existing = await getEquipmentById(db, seed.id);
    if (existing) {
      skipped += 1;
      continue;
    }
    await upsertEquipment(db, equipmentFromSeed(seed, now));
    created += 1;
  }

  const equipment = await listEquipment(db);
  return { created, skipped, equipment };
}
