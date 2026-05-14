import { prisma } from "@/db/prisma";
import { ImportResult } from "@/types/agent";

export async function createImportJob(agentId: string) {
  return prisma.importJob.create({
    data: {
      agentId,
      status: "running"
    }
  });
}

export async function finishImportJob(jobId: string, result: ImportResult) {
  const job = await prisma.importJob.update({
    where: { id: jobId },
    data: {
      status: "finished",
      totalRows: result.totalRows,
      successRows: result.successRows,
      failedRows: result.failedRows,
      logs: result.logs.join("\n")
    }
  });

  if (result.products?.length) {
    await prisma.importedProduct.createMany({
      data: result.products.map((product) => ({
        importJobId: job.id,
        agentId: job.agentId,
        externalId: null,
        active: true,
        lastSeenAt: new Date(),
        name: product.name,
        price: product.price ?? null,
        stock: product.stock ?? null,
        image: product.image ?? null,
        rawJson: JSON.stringify(product)
      }))
    });
  }

  return prisma.importJob.findUniqueOrThrow({
    where: { id: jobId },
    include: {
      products: {
        orderBy: { createdAt: "asc" },
        take: 20
      }
    }
  });
}

export async function failImportJob(jobId: string, error: string) {
  return prisma.importJob.update({
    where: { id: jobId },
    data: {
      status: "failed",
      logs: error
    }
  });
}
