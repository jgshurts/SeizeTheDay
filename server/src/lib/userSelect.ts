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
  themeBannerColor: true,
  themeSubBannerColor: true,
  themeBackgroundColor: true,
  themeLeftImage: true,
  themeRightImage: true,
} as const;
