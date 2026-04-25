export interface SsoUser {
  id: string;
  email: string;
  display_name: string | null;
  profile_picture_url: string | null;
  is_authorized: boolean;
}

export interface AuthorizedEmail {
  id: string;
  email: string;
  approved_by_user_id: string | null;
  approved_at: string;
  notes: string | null;
}

export function getAuthApiBaseUrl(): string {
  return (
    process.env.NEXT_PUBLIC_API_URL ||
    process.env.NEXT_PUBLIC_API_BASE_URL ||
    "http://localhost:8000"
  );
}

async function parseOrThrow(response: Response) {
  if (response.ok) {
    if (response.status === 204) {
      return null;
    }
    return response.json();
  }

  let detail = "Request failed";
  try {
    const body = await response.json();
    detail = body?.detail || detail;
  } catch {
    // Keep default detail when response body is not JSON.
  }

  throw new Error(detail);
}

export async function ssoMe(): Promise<SsoUser> {
  const response = await fetch(`${getAuthApiBaseUrl()}/api/auth/me`, {
    method: "GET",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
  });
  return parseOrThrow(response);
}

export async function ssoLoginWithGoogle(credential: string): Promise<{ access_token: string; token_type: string; user: SsoUser }> {
  const response = await fetch(`${getAuthApiBaseUrl()}/api/auth/google`, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ credential }),
  });
  return parseOrThrow(response);
}

export async function ssoLoginWithMicrosoft(credential: string): Promise<{ access_token: string; token_type: string; user: SsoUser }> {
  const response = await fetch(`${getAuthApiBaseUrl()}/api/auth/microsoft`, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ credential }),
  });
  return parseOrThrow(response);
}

export async function ssoLogout(): Promise<void> {
  const response = await fetch(`${getAuthApiBaseUrl()}/api/auth/logout`, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
  });
  await parseOrThrow(response);
}

export async function listAuthorizedEmails(): Promise<AuthorizedEmail[]> {
  const response = await fetch(`${getAuthApiBaseUrl()}/api/auth/authorized-emails`, {
    method: "GET",
    credentials: "include",
  });
  return parseOrThrow(response);
}

export async function addAuthorizedEmail(email: string, notes: string | null): Promise<AuthorizedEmail> {
  const response = await fetch(`${getAuthApiBaseUrl()}/api/auth/authorized-emails`, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, notes }),
  });
  return parseOrThrow(response);
}

export async function removeAuthorizedEmail(email: string): Promise<void> {
  const response = await fetch(`${getAuthApiBaseUrl()}/api/auth/authorized-emails/${email}`, {
    method: "DELETE",
    credentials: "include",
  });
  await parseOrThrow(response);
}
