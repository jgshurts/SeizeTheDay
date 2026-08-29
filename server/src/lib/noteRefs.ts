import { prisma } from "./prisma";

// Excludes 0/O/1/I/L -- characters that look alike when skimming a note or
// task, which matters here since refs are meant to be recognized at a
// glance, not typed.
const REF_CHARS = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
const REF_LENGTH = 4;
const MAX_ATTEMPTS = 20;

function randomRef(): string {
  let ref = "";
  for (let i = 0; i < REF_LENGTH; i++) {
    ref += REF_CHARS[Math.floor(Math.random() * REF_CHARS.length)];
  }
  return ref;
}

// Generates a short ref guaranteed not to collide with any note currently
// using one -- notes now rely on refs being unique to resolve an "@REF"
// link unambiguously (see the notes.by-ref route).
export async function generateUniqueShortRef(): Promise<string> {
  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    const ref = randomRef();
    const existing = await prisma.note.findFirst({
      where: { shortRef: { equals: ref, mode: "insensitive" } },
      select: { id: true },
    });
    if (!existing) return ref;
  }
  throw new Error("Could not generate a unique note reference");
}
