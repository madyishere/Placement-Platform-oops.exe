import type { Metadata } from "next";
import "./styles.css";
export const metadata: Metadata = {
  title: "Placement Office · NFSU",
  description: "Secure, policy-driven student placement management.",
};
export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
