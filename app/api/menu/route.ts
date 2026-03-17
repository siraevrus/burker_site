import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { SUBcategoryToSlug } from "@/lib/utils";

/** Порядок подкатегорий — новые из БД добавляются в конец */
const WATCHES_ORDER = [
  "Diana",
  "Sophie",
  "Olivia",
  "Macy",
  "Isabell",
  "Julia",
  "Ruby",
  "Olivia Petite",
  "Macy Petite",
  "Isabell Petite",
  "Ruby Petite",
];
const JEWELRY_ORDER = ["Браслеты", "Ожерелье", "Серьги", "Кольца"];

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
    const [watchSubs, jewelrySubs] = await Promise.all([
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
    for (const sub of WATCHES_ORDER) {
      if (watchSubSet.has(sub) && SUBcategoryToSlug[sub]) {
        watches.push({
          label: sub,
          slug: SUBcategoryToSlug[sub],
          href: `/products/watches/${SUBcategoryToSlug[sub]}`,
        });
        added.add(sub);
      }
    }
    for (const sub of watchSubSet) {
      if (!added.has(sub) && SUBcategoryToSlug[sub]) {
        watches.push({
          label: sub,
          slug: SUBcategoryToSlug[sub],
          href: `/products/watches/${SUBcategoryToSlug[sub]}`,
        });
      }
    }

    const jewelry: MenuItem[] = [];
    const addedJ = new Set<string>();
    for (const sub of JEWELRY_ORDER) {
      if (jewelrySubSet.has(sub) && SUBcategoryToSlug[sub]) {
        jewelry.push({
          label: sub,
          slug: SUBcategoryToSlug[sub],
          href: `/products/jewelry/${SUBcategoryToSlug[sub]}`,
        });
        addedJ.add(sub);
      }
    }
    for (const sub of jewelrySubSet) {
      if (!addedJ.has(sub) && SUBcategoryToSlug[sub]) {
        jewelry.push({
          label: sub,
          slug: SUBcategoryToSlug[sub],
          href: `/products/jewelry/${SUBcategoryToSlug[sub]}`,
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
