import { useEffect, useState } from "react";

// Matches Tailwind's `sm` breakpoint boundary. Viewport-based rather than
// user-agent sniffing, so it also reacts to resizing a desktop browser
// window down, and to phone/tablet orientation changes.
const MOBILE_QUERY = "(max-width: 640px)";

export function useIsMobile(): boolean {
  const [isMobile, setIsMobile] = useState(() => window.matchMedia(MOBILE_QUERY).matches);

  useEffect(() => {
    const mql = window.matchMedia(MOBILE_QUERY);
    function handleChange(e: MediaQueryListEvent) {
      setIsMobile(e.matches);
    }
    mql.addEventListener("change", handleChange);
    return () => mql.removeEventListener("change", handleChange);
  }, []);

  return isMobile;
}
