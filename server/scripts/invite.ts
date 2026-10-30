// Prints a one-time invite link for a user, creating the account first if
// needed. This is how the very first admin gets in, since every other route
// to an invite requires being signed in already:
//
//   npm run user:invite -- <email> [--admin] [--name "First Last"] [--nickname nick]
//
// The link goes to APP_URL (default http://localhost:5174).
import dotenv from "dotenv";
dotenv.config();

import { PrismaClient } from "@prisma/client";
import { newInvite } from "../src/lib/password";

const prisma = new PrismaClient();

function flag(name: string): string | undefined {
  const i = process.argv.indexOf(`--${name}`);
  return i === -1 ? undefined : process.argv[i + 1];
}

async function main() {
  const email = process.argv[2];
  if (!email || email.startsWith("--")) {
    throw new Error("Usage: npm run user:invite -- <email> [--admin] [--name \"First Last\"] [--nickname nick]");
  }

  let user = await prisma.user.findFirst({ where: { email: { equals: email, mode: "insensitive" } } });
  if (!user) {
    const [firstName, ...rest] = (flag("name") ?? email.split("@")[0]).split(" ");
    user = await prisma.user.create({
      data: {
        email,
        firstName,
        lastName: rest.join(" "),
        nickname: flag("nickname") ?? email.split("@")[0],
        isAdmin: process.argv.includes("--admin"),
      },
    });
    console.log(`Created user ${user.nickname} <${user.email}>${user.isAdmin ? " (admin)" : ""}`);
  }

  const { token, tokenHash, expiresAt } = newInvite();
  await prisma.user.update({
    where: { id: user.id },
    data: { inviteTokenHash: tokenHash, inviteExpiresAt: expiresAt },
  });

  const base = process.env.APP_URL ?? "http://localhost:5174";
  console.log(`Invite link for ${user.nickname} (expires ${expiresAt.toISOString()}):`);
  console.log(`${base}/?invite=${token}`);
}

main()
  .catch((err) => {
    console.error(err instanceof Error ? err.message : err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
