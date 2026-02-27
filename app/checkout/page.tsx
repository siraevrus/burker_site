import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import CheckoutPageClient from "./CheckoutPageClient";

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
