// Shared Prisma `select` shape for user-facing responses -- keeps /auth/me,
// the Users settings list, and the theme endpoint all returning the same
// fields instead of drifting apart.
export const userSelect = {
  id: true,
  firstName: true,
  lastName: true,
  nickname: true,
  email: true,
  avatarUrl: true,
  isAdmin: true,
  themeBannerColor: true,
  themeSubBannerColor: true,
  themeBackgroundColor: true,
  themeLeftImage: true,
  themeRightImage: true,
} as const;

// For lists of users -- leaves out the theme columns, whose images are
// stored as data URLs and would bloat every list response.
export const userListSelect = {
  id: true,
  firstName: true,
  lastName: true,
  nickname: true,
  email: true,
  avatarUrl: true,
  isAdmin: true,
} as const;

// What a non-admin may see about other users: enough to pick someone to
// delegate a task to, without exposing their email address.
export const userDirectorySelect = {
  id: true,
  firstName: true,
  lastName: true,
  nickname: true,
} as const;
