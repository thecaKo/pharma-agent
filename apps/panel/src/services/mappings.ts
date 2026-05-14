import { prisma } from "@/db/prisma";
import { ProductMapping } from "@/types/agent";

export async function saveMapping(agentId: string, mapping: ProductMapping) {
  return prisma.productMapping.upsert({
    where: { agentId },
    create: {
      agentId,
      tableName: mapping.table,
      idField: mapping.idField || null,
      nameField: mapping.nameField,
      priceField: mapping.priceField || null,
      stockField: mapping.stockField || null,
      imageField: mapping.imageField || null
    },
    update: {
      tableName: mapping.table,
      idField: mapping.idField || null,
      nameField: mapping.nameField,
      priceField: mapping.priceField || null,
      stockField: mapping.stockField || null,
      imageField: mapping.imageField || null
    }
  });
}

export function toAgentMapping(mapping: {
  tableName: string;
  idField: string | null;
  nameField: string;
  priceField: string | null;
  stockField: string | null;
  imageField: string | null;
}): ProductMapping {
  return {
    table: mapping.tableName,
    idField: mapping.idField ?? undefined,
    nameField: mapping.nameField,
    priceField: mapping.priceField ?? undefined,
    stockField: mapping.stockField ?? undefined,
    imageField: mapping.imageField ?? undefined
  };
}
