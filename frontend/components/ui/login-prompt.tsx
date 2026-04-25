import Link from "next/link";

export function LoginPrompt() {
  return (
    <div style={{ padding: "40px 20px", textAlign: "center" }}>
      <h1>Sign in required</h1>
      <p style={{ marginBottom: "16px" }}>
        You need to sign in to access this area of the template.
      </p>
      <Link href="/auth/login" className="btn btn-primary">
        Go to Login
      </Link>
    </div>
  );
}
