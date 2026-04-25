import {
  PublicClientApplication,
  type Configuration,
  type AuthenticationResult,
  BrowserAuthError,
} from "@azure/msal-browser";

const MICROSOFT_CLIENT_ID = process.env.NEXT_PUBLIC_MICROSOFT_CLIENT_ID || "";
const MICROSOFT_AUTHORITY =
  process.env.NEXT_PUBLIC_MICROSOFT_AUTHORITY || "https://login.microsoftonline.com/common";

const LOGIN_SCOPES = ["openid", "profile", "email"];

/** Returns true when MICROSOFT_CLIENT_ID contains a real value (not placeholder). */
export function isMicrosoftConfigured(): boolean {
  return (
    MICROSOFT_CLIENT_ID.length > 0 &&
    !MICROSOFT_CLIENT_ID.includes("your-microsoft-client-id")
  );
}

// Singleton MSAL instance — created lazily to avoid SSR issues.
let _msalInstance: PublicClientApplication | null = null;

function getMsalConfig(): Configuration {
  return {
    auth: {
      clientId: MICROSOFT_CLIENT_ID,
      authority: MICROSOFT_AUTHORITY,
      redirectUri: typeof window !== "undefined" ? window.location.origin : "/",
    },
    cache: {
      cacheLocation: "sessionStorage",
    },
  };
}

async function getMsalInstance(): Promise<PublicClientApplication> {
  if (!_msalInstance) {
    _msalInstance = new PublicClientApplication(getMsalConfig());
    await _msalInstance.initialize();
  }
  return _msalInstance;
}

export type MicrosoftAuthResult = {
  idToken: string;
  account: AuthenticationResult["account"];
};

/**
 * Open the Microsoft sign-in popup. Returns the ID token needed by the backend.
 *
 * Throws `MicrosoftAuthCancelledError` if the user closes the popup.
 * Throws `Error` for genuine auth / config / network failures.
 */
export async function signInWithMicrosoftPopup(): Promise<MicrosoftAuthResult> {
  const msal = await getMsalInstance();

  let result: AuthenticationResult;
  try {
    result = await msal.loginPopup({ scopes: LOGIN_SCOPES });
  } catch (err) {
    // Treat popup closure / user cancellation as a non-fatal signal.
    if (
      err instanceof BrowserAuthError &&
      (err.errorCode === "user_cancelled" ||
        err.errorCode === "user_cancelled_operation" ||
        err.message?.toLowerCase().includes("cancelled") ||
        err.message?.toLowerCase().includes("closed"))
    ) {
      throw new MicrosoftAuthCancelledError();
    }
    throw err;
  }

  msal.setActiveAccount(result.account);

  return {
    idToken: result.idToken,
    account: result.account,
  };
}

/** Sentinel error thrown when the user deliberately cancels the Microsoft popup. */
export class MicrosoftAuthCancelledError extends Error {
  constructor() {
    super("Microsoft sign-in cancelled by user");
    this.name = "MicrosoftAuthCancelledError";
  }
}
