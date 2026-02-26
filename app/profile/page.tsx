import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { redirect } from "next/navigation";
import ProfilePageClient from "./ProfilePageClient";

export const metadata = {
  title: "Профиль | Mira Brands | Burker",
  description: "Личный кабинет — смена пароля",
};

export default async function ProfilePage() {
  const currentUser = await getCurrentUser();
  if (!currentUser) {
    redirect("/login?redirect=/profile");
  }

  const user = await prisma.user.findUnique({
    where: { id: currentUser.userId },
    select: { email: true, firstName: true, lastName: true },
  });

  if (!user) {
    redirect("/login?redirect=/profile");
  }

  return (
    <ProfilePageClient
      user={{
        email: user.email,
        firstName: user.firstName ?? undefined,
        lastName: user.lastName ?? undefined,
      }}
    />
  );
}
