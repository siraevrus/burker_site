import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/admin-api";

export async function GET(request: NextRequest) {
  try {
    const links = await prisma.socialLink.findMany({
      orderBy: [
        { order: "asc" },
        { createdAt: "asc" },
      ],
    });

    return NextResponse.json({ links });
  } catch (error: any) {
    console.error("Error fetching social links:", error);
    return NextResponse.json(
      { error: error.message || "Ошибка при получении ссылок" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  const unauthorized = await requireAdmin(request);
  if (unauthorized) return unauthorized;

  try {
    const body = await request.json();
    const { name, url, order } = body;

    if (!name || !url) {
      return NextResponse.json(
        { error: "Необходимо указать название и URL" },
        { status: 400 }
      );
    }

    const link = await prisma.socialLink.create({
      data: {
        name: name.trim(),
        url: url.trim(),
        order: order != null ? order : 0,
      },
    });

    return NextResponse.json({ link });
  } catch (error: any) {
    console.error("Error creating social link:", error);
    return NextResponse.json(
      { error: error.message || "Ошибка при создании ссылки" },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  const unauthorized = await requireAdmin(request);
  if (unauthorized) return unauthorized;

  try {
    const body = await request.json();
    const { id, name, url, order } = body;

    if (!id) {
      return NextResponse.json(
        { error: "Необходимо указать ID ссылки" },
        { status: 400 }
      );
    }

    const data: any = {
      name: name?.trim(),
      url: url?.trim(),
    };

    if (order != null) {
      data.order = order;
    }

    const link = await prisma.socialLink.update({
      where: { id },
      data,
    });

    return NextResponse.json({ link });
  } catch (error: any) {
    console.error("Error updating social link:", error);
    return NextResponse.json(
      { error: error.message || "Ошибка при обновлении ссылки" },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  const unauthorized = await requireAdmin(request);
  if (unauthorized) return unauthorized;

  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json(
        { error: "Необходимо указать ID ссылки" },
        { status: 400 }
      );
    }

    await prisma.socialLink.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Error deleting social link:", error);
    return NextResponse.json(
      { error: error.message || "Ошибка при удалении ссылки" },
      { status: 500 }
    );
  }
}
