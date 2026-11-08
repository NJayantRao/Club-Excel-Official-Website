import dotenv from "dotenv";
import { PrismaClient, MediaUsageType, Role } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { uploadLocalImageToCloudinary } from "@/lib/upload-local-cloudinary";

dotenv.config();

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL!,
});

const prisma = new PrismaClient({
  adapter,
});

// Alumni seed data
const alumni = [
  {
    name: "<enter-alumnus-name>",
    email: "<enter-alumnus-email>",
    phone: "<enter-alumnus-phone>",
    imageUrl: "/members/profile.jpg",
    role: Role.ALUMNI,
    year: "2022",
    designation: "Data Analyst at XYZ Company",
    skills: ["Python", "SQL"],
  },
];

const seedAlumni = async () => {
  try {
    for (const alumnus of alumni) {
      const { imageUrl: localImagePath, ...memberData } = alumnus;

      // Upload profile image to Cloudinary
      const { url: imageUrl, publicId } = await uploadLocalImageToCloudinary(
        localImagePath.replace("/members/", "members/"),
        "club-members"
      );

      // Create member and associated media
      await prisma.$transaction(async (tx) => {
        const created = await tx.member.create({
          data: memberData,
        });

        await tx.media.create({
          data: {
            url: imageUrl,
            publicId,
            usages: {
              create: {
                type: MediaUsageType.PROFILE,
                entityId: created.id,
              },
            },
          },
        });
      });

      console.log(`✔ Added alumnus: ${alumnus.name}`);
    }

    console.log(`\nAll ${alumni.length} alumni added successfully.`);
  } catch (error) {
    console.error("Failed to seed alumni:", error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
};

seedAlumni();
