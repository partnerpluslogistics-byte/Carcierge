/**
 * Returns the URL for the login page.
 * Used by Home.tsx and DashboardLayout.tsx to redirect unauthenticated users.
 */
export function getLoginUrl(): string {
  return "/login";
}
