import dotenv from "dotenv";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { v2 as cloudinary } from "cloudinary";

dotenv.config();

const DEFAULT_FOLDERS = [
  "club-members",
  "event-images",
  "gallery",
  "club-achievements",
];

const args = process.argv.slice(2);
const shouldDelete = args.includes("--delete");
const folderArgs = args
  .filter((a) => a.startsWith("--folder="))
  .map((a) => a.slice("--folder=".length))
  .filter(Boolean);
const folders = folderArgs.length ? folderArgs : DEFAULT_FOLDERS;

cloudinary.config({
  cloud_name: process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

async function listFolderImages(folder: string) {
  const found: { publicId: string; bytes: number; createdAt: string }[] = [];
  let nextCursor: string | undefined;

  do {
    const res = await cloudinary.api.resources({
      type: "upload",
      resource_type: "image",
      prefix: `${folder}/`,
      max_results: 500,
      next_cursor: nextCursor,
    });

    for (const r of res.resources) {
      found.push({
        publicId: r.public_id,
        bytes: r.bytes ?? 0,
        createdAt: r.created_at,
      });
    }
    nextCursor = res.next_cursor;
  } while (nextCursor);

  return found;
}

async function main() {
  console.log(
    shouldDelete
      ? "MODE: DELETE (unreferenced images will be removed)"
      : "MODE: DRY RUN (nothing will be deleted; use --delete to remove)"
  );
  console.log(`Folders: ${folders.join(", ")}\n`);

  const rows = await prisma.media.findMany({
    where: { publicId: { not: null } },
    select: { publicId: true },
  });
  const referenced = new Set(rows.map((r) => r.publicId as string));
  console.log(`Images referenced in database: ${referenced.size}`);

  const orphans: { publicId: string; bytes: number; createdAt: string }[] = [];
  let totalInCloudinary = 0;

  for (const folder of folders) {
    const images = await listFolderImages(folder);
    totalInCloudinary += images.length;
    const folderOrphans = images.filter((i) => !referenced.has(i.publicId));
    console.log(
      `  ${folder}: ${images.length} in Cloudinary, ${folderOrphans.length} unreferenced`
    );
    orphans.push(...folderOrphans);
  }

  console.log(`\nTotal in Cloudinary (scanned folders): ${totalInCloudinary}`);
  console.log(`Unreferenced images: ${orphans.length}`);

  if (!orphans.length) {
    console.log("Nothing to clean up.");
    return;
  }

  const mb = orphans.reduce((s, o) => s + o.bytes, 0) / (1024 * 1024);
  console.log(`Space they use: ${mb.toFixed(2)} MB\n`);

  for (const o of orphans) {
    console.log(`  ${o.publicId}  (${o.createdAt})`);
  }

  if (!shouldDelete) {
    console.log("\nDry run complete. Re-run with --delete to remove these.");
    return;
  }

  console.log("\nDeleting...");
  let deleted = 0;
  const ids = orphans.map((o) => o.publicId);

  // Cloudinary allows up to 100 public IDs per delete call
  for (let i = 0; i < ids.length; i += 100) {
    const batch = ids.slice(i, i + 100);
    const res = await cloudinary.api.delete_resources(batch);
    for (const state of Object.values(res.deleted ?? {})) {
      if (state === "deleted") deleted++;
    }
  }

  console.log(`Deleted ${deleted} of ${ids.length} images.`);
}

main()
  .catch((err) => {
    console.error("Cleanup failed:", err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
