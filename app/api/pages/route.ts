import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const category = searchParams.get("category");
    const published = searchParams.get("published");

    const where: any = {};
    if (category) {
      where.category = category;
    }
    if (published !== null) {
      where.published = published === "true";
    }

    const pages = await prisma.page.findMany({
      where,
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ pages });
  } catch (error: any) {
    console.error("Error fetching pages:", error);
    return NextResponse.json(
      { error: error.message || "Ошибка при получении страниц" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { title, slug, content, category, published, seoTitle, seoDescription } = body;

    if (!title || !slug || !content) {
      return NextResponse.json(
        { error: "Необходимо указать название, slug и содержимое" },
        { status: 400 }
      );
    }

    const data: any = {
      title,
      slug,
      content,
      published: published || false,
      seoTitle: seoTitle != null && seoTitle !== "" ? seoTitle : null,
      seoDescription: seoDescription != null && seoDescription !== "" ? seoDescription : null,
    };

    // Добавляем category только если оно указано
    if (category && category !== "") {
      data.category = category;
    }

    const page = await prisma.page.create({
      data,
    });

    return NextResponse.json({ page });
  } catch (error: any) {
    console.error("Error creating page:", error);
    return NextResponse.json(
      { error: error.message || "Ошибка при создании страницы" },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, title, slug, content, category, published, seoTitle, seoDescription } = body;

    if (!id) {
      return NextResponse.json(
        { error: "Необходимо указать ID страницы" },
        { status: 400 }
      );
    }

    const data: any = {
      title,
      slug,
      content,
      published: published || false,
      seoTitle: seoTitle != null && seoTitle !== "" ? seoTitle : null,
      seoDescription: seoDescription != null && seoDescription !== "" ? seoDescription : null,
    };

    // Добавляем category только если оно указано, иначе устанавливаем null
    if (category && category !== "") {
      data.category = category;
    } else {
      data.category = null;
    }

    const page = await prisma.page.update({
      where: { id },
      data,
    });

    return NextResponse.json({ page });
  } catch (error: any) {
    console.error("Error updating page:", error);
    return NextResponse.json(
      { error: error.message || "Ошибка при обновлении страницы" },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json(
        { error: "Необходимо указать ID страницы" },
        { status: 400 }
      );
    }

    await prisma.page.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Error deleting page:", error);
    return NextResponse.json(
      { error: error.message || "Ошибка при удалении страницы" },
      { status: 500 }
    );
  }
}
