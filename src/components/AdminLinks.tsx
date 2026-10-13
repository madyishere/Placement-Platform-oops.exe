import Link from "next/link";
export default function AdminLinks() {
  return (
    <Link
      href="/"
      style={{
        display: "block",
        padding: "16px 0",
        color: "var(--theme-success-500)",
        fontWeight: 600,
      }}
    >
      ← Placement workspace
    </Link>
  );
}
