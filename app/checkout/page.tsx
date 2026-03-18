import type { Metadata } from "next";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getMetadataForPath } from "@/lib/seo";
import CheckoutPageClient from "./CheckoutPageClient";

export async function generateMetadata(): Promise<Metadata> {
  return getMetadataForPath("/checkout", {
    title: "Оформление заказа | Мира Брендс | Буркер",
    description: "Оформление заказа в интернет-магазине Мира Брендс | Буркер",
  });
}

export default async function CheckoutPage() {
  const currentUser = await getCurrentUser();
  
  let user = null;
  if (currentUser) {
    const dbUser = await prisma.user.findUnique({
      where: { id: currentUser.userId },
      select: {
        email: true,
        firstName: true,
        lastName: true,
        middleName: true,
        phone: true,
      },
    });
    user = dbUser;
  }

  return <CheckoutPageClient user={user} />;
}
