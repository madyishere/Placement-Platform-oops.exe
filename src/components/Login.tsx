"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, LoaderCircle } from "lucide-react";
export default function Login() {
  const router = useRouter();
  const [pending, setPending] = useState(false),
    [error, setError] = useState("");
  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setPending(true);
    setError("");
    const data = new FormData(e.currentTarget);
    try {
      const response = await fetch("/api/users/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({
          email: data.get("email"),
          password: data.get("password"),
        }),
      });
      if (!response.ok) {
        setError(
          response.status === 429
            ? "Too many attempts. Please wait before trying again."
            : "Sign-in failed. Check your credentials and account status.",
        );
        return;
      }
      router.push("/");
      router.refresh();
    } catch {
      setError("Unable to connect. Please try again.");
    } finally {
      setPending(false);
    }
  }
  return (
    <form onSubmit={submit} className="form-stack">
      <label>
        Email address
        <input
          name="email"
          type="email"
          placeholder="you@nfsu.ac.in"
          autoComplete="username"
          required
        />
      </label>
      <label>
        Password
        <input
          name="password"
          type="password"
          placeholder="Enter your password"
          autoComplete="current-password"
          required
          minLength={8}
        />
      </label>
      {error && (
        <p role="alert" className="form-error">
          {error}
        </p>
      )}
      <button className="button primary wide" disabled={pending}>
        {pending ? (
          <LoaderCircle size={17} className="spin" />
        ) : (
          <>
            Sign in to workspace <ArrowRight size={17} />
          </>
        )}
      </button>
    </form>
  );
}
