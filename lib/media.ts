import prisma from "@/lib/prisma";
import { MediaUsageType, Prisma } from "@prisma/client";
import { randomUUID } from "crypto";
import { destroyCloudinaryImages } from "./destroy-cloudinary-image";

type Db = Prisma.TransactionClient | typeof prisma;

export async function attachMedia(
  type: MediaUsageType,
  entityId: string,
  url: string,
  publicId: string | null = null,
  db: Db = prisma
) {
  return db.media.create({
    data: {
      url,
      publicId,
      usages: {
        create: { type, entityId },
      },
    },
  });
}

/**
 * Attaches many media items in just two queries (instead of two per item).
 * Use this for multi-photo uploads to avoid interactive transaction timeouts.
 */
export async function attachMediaBatch(
  type: MediaUsageType,
  entityId: string,
  items: { url: string; publicId: string | null }[],
  db: Db = prisma
) {
  if (!items.length) return;

  const ids = items.map(() => randomUUID());
  const base = Date.now();

  await db.media.createMany({
    data: items.map((item, i) => ({
      id: ids[i],
      url: item.url,
      publicId: item.publicId,
    })),
  });

  await db.mediaUsage.createMany({
    data: ids.map((mediaId, i) => ({
      type,
      entityId,
      mediaId,
      // keep upload order, since listings sort by createdAt
      createdAt: new Date(base + i),
    })),
  });
}

export async function removeMedia(
  type: MediaUsageType,
  entityId: string,
  db: Db = prisma
) {
  const usages = await db.mediaUsage.findMany({
    where: { type, entityId },
    select: { mediaId: true },
  });

  if (usages.length === 0) return;

  const mediaIds = usages.map((usage) => usage.mediaId);

  const mediaRows = await db.media.findMany({
    where: { id: { in: mediaIds } },
    select: { publicId: true },
  });

  await destroyCloudinaryImages(mediaRows.map((m) => m.publicId));

  await db.media.deleteMany({
    where: { id: { in: mediaIds } },
  });
}

export async function removeMediaById(mediaId: string, db: Db = prisma) {
  const media = await db.media.findUnique({
    where: { id: mediaId },
    select: { publicId: true },
  });

  if (media?.publicId) {
    await destroyCloudinaryImages([media.publicId]);
  }

  await db.media.delete({
    where: { id: mediaId },
  });
}

export async function replaceMedia(
  type: MediaUsageType,
  entityId: string,
  url: string,
  publicId: string | null = null,
  db: Db = prisma
) {
  await removeMedia(type, entityId, db);
  return attachMedia(type, entityId, url, publicId, db);
}

export async function getMediaUrl(
  type: MediaUsageType,
  entityId: string
): Promise<string | null> {
  const usage = await prisma.mediaUsage.findFirst({
    where: { type, entityId },
    orderBy: { createdAt: "desc" },
    include: { media: true },
  });

  return usage?.media.url ?? null;
}

export async function getMediaUrlMap(
  type: MediaUsageType,
  entityIds: string[]
): Promise<Map<string, string>> {
  if (entityIds.length === 0) return new Map();

  const usages = await prisma.mediaUsage.findMany({
    where: { type, entityId: { in: entityIds } },
    orderBy: { createdAt: "desc" },
    include: { media: true },
  });

  const map = new Map<string, string>();

  for (const usage of usages) {
    if (!map.has(usage.entityId)) {
      map.set(usage.entityId, usage.media.url);
    }
  }

  return map;
}
