import { currentUser } from "@clerk/nextjs/server";
import { db } from "./db";

export async function syncUser() {
  const clerkUser = await currentUser();
  if (!clerkUser) return null;

  let dbUser = await db.user.findUnique({
    where: { clerkId: clerkUser.id },
  });

  if (!dbUser) {
    const email = clerkUser.emailAddresses[0]?.emailAddress || "";
    const name =
      `${clerkUser.firstName || ""} ${clerkUser.lastName || ""}`.trim() ||
      email.split("@")[0] ||
      "User";
    
    dbUser = await db.user.create({
      data: {
        clerkId: clerkUser.id,
        name,
        email,
        avatarUrl: clerkUser.imageUrl || null,
      },
    });
  }

  return dbUser;
}
