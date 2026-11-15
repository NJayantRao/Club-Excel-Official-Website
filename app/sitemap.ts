import type { MetadataRoute } from "next";
import prisma from "@/lib/prisma";

// Rebuild the sitemap at most once an hour
export const revalidate = 3600;

const baseUrl = (
  process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"
).replace(/\/$/, "");

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();

  // Public static pages only (no /dashboard, /sign-in or /api)
  const staticRoutes: MetadataRoute.Sitemap = [
    {
      url: `${baseUrl}/`,
      lastModified: now,
      changeFrequency: "weekly",
      priority: 1,
    },
    {
      url: `${baseUrl}/events`,
      lastModified: now,
      changeFrequency: "daily",
      priority: 0.9,
    },
    {
      url: `${baseUrl}/achievements`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.7,
    },
    {
      url: `${baseUrl}/our-team`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.7,
    },
    {
      url: `${baseUrl}/recruitment`,
      lastModified: now,
      changeFrequency: "weekly",
      priority: 0.8,
    },
    {
      url: `${baseUrl}/contact-us`,
      lastModified: now,
      changeFrequency: "yearly",
      priority: 0.5,
    },
  ];

  // Dynamic pages: registration pages of events that can still be joined
  let eventRoutes: MetadataRoute.Sitemap = [];
  try {
    const events = await prisma.event.findMany({
      where: { status: { in: ["UPCOMING", "ONGOING"] } },
      select: { id: true, updatedAt: true },
    });

    eventRoutes = events.map((event) => ({
      url: `${baseUrl}/events/${event.id}/register`,
      lastModified: event.updatedAt,
      changeFrequency: "weekly" as const,
      priority: 0.6,
    }));
  } catch (error) {
    // If the database is unreachable (e.g. at build time), still serve static pages
    console.error("Sitemap: failed to load events", error);
  }

  return [...staticRoutes, ...eventRoutes];
}
