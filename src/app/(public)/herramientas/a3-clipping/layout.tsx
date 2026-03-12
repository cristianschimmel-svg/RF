/**
 * A3 Clipping Layout
 * Passes children through — auth is handled per-page.
 * The login page is public, the dashboard checks auth itself.
 */

export default function ClippingLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
