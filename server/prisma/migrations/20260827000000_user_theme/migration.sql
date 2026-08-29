-- Per-user theming: banner color, background color, and optional
-- left/right panel background images (stored as data URLs).
ALTER TABLE "users" ADD COLUMN "theme_banner_color" TEXT;
ALTER TABLE "users" ADD COLUMN "theme_background_color" TEXT;
ALTER TABLE "users" ADD COLUMN "theme_left_image" TEXT;
ALTER TABLE "users" ADD COLUMN "theme_right_image" TEXT;
