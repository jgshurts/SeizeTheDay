import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  await prisma.status.createMany({
    data: [
      {
        statusCode: "O",
        isComplete: false,
        backgroundColor: "#E5E7EB",
        foregroundColor: "#374151",
        description: "Open",
      },
      {
        statusCode: "P",
        isComplete: false,
        backgroundColor: "#FEF3C7",
        foregroundColor: "#92400E",
        description: "In Progress",
      },
      {
        statusCode: "D",
        isComplete: true,
        backgroundColor: "#D1FAE5",
        foregroundColor: "#065F46",
        description: "Done",
      },
    ],
    skipDuplicates: true,
  });

  await prisma.priorityGroup.createMany({
    data: [
      { prty: 1, prtyCode: "A", description: "High priority" },
      { prty: 2, prtyCode: "B", description: "Medium priority" },
      { prty: 3, prtyCode: "C", description: "Low priority" },
    ],
    skipDuplicates: true,
  });

  const passwordHash = await bcrypt.hash("password", 10);
  await prisma.user.upsert({
    where: { nickname: "jeff" },
    update: {},
    create: {
      firstName: "Jeff",
      lastName: "Shurts",
      nickname: "jeff",
      password: passwordHash,
    },
  });
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
