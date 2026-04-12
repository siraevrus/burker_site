import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCatalogMaps } from "@/lib/catalog-lines";

export interface MenuItem {
  label: string;
  slug: string;
  href: string;
}

export interface MenuResponse {
  watches: MenuItem[];
  jewelry: MenuItem[];
}

export async function GET() {
  try {
    const [maps, watchLines, jewelryLines, watchSubs, jewelrySubs] = await Promise.all([
      getCatalogMaps(),
      prisma.catalogLine.findMany({
        where: { kind: "watches", enabled: true },
        orderBy: { sortOrder: "asc" },
        select: { subcategory: true, slug: true },
      }),
      prisma.catalogLine.findMany({
        where: { kind: "jewelry", enabled: true },
        orderBy: { sortOrder: "asc" },
        select: { subcategory: true, slug: true },
      }),
      prisma.product.findMany({
        where: {
          collection: { not: "Украшения" },
          disabled: { not: true },
          soldOut: false,
          subcategory: { not: null },
        },
        select: { subcategory: true },
        distinct: ["subcategory"],
      }),
      prisma.product.findMany({
        where: {
          collection: "Украшения",
          disabled: { not: true },
          soldOut: false,
          subcategory: { not: null },
        },
        select: { subcategory: true },
        distinct: ["subcategory"],
      }),
    ]);

    const watchSubSet = new Set(
      watchSubs.map((p) => p.subcategory).filter((s): s is string => Boolean(s))
    );
    const jewelrySubSet = new Set(
      jewelrySubs.map((p) => p.subcategory).filter((s): s is string => Boolean(s))
    );

    const watches: MenuItem[] = [];
    const added = new Set<string>();
    for (const line of watchLines) {
      if (watchSubSet.has(line.subcategory) && maps.subToSlug[line.subcategory]) {
        watches.push({
          label: line.subcategory,
          slug: line.slug,
          href: `/products/watches/${line.slug}`,
        });
        added.add(line.subcategory);
      }
    }
    for (const sub of watchSubSet) {
      if (!added.has(sub) && maps.subToSlug[sub]) {
        watches.push({
          label: sub,
          slug: maps.subToSlug[sub],
          href: `/products/watches/${maps.subToSlug[sub]}`,
        });
      }
    }

    const jewelry: MenuItem[] = [];
    const addedJ = new Set<string>();
    for (const line of jewelryLines) {
      if (jewelrySubSet.has(line.subcategory) && maps.subToSlug[line.subcategory]) {
        jewelry.push({
          label: line.subcategory,
          slug: line.slug,
          href: `/products/jewelry/${line.slug}`,
        });
        addedJ.add(line.subcategory);
      }
    }
    for (const sub of jewelrySubSet) {
      if (!addedJ.has(sub) && maps.subToSlug[sub]) {
        jewelry.push({
          label: sub,
          slug: maps.subToSlug[sub],
          href: `/products/jewelry/${maps.subToSlug[sub]}`,
        });
      }
    }

    return NextResponse.json({ watches, jewelry } as MenuResponse);
  } catch (error) {
    console.error("Error fetching menu:", error);
    return NextResponse.json(
      { error: "Ошибка при получении меню" },
      { status: 500 }
    );
  }
}
