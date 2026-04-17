/**
 * GitHub REST: SAML SSO and `X-GitHub-SSO` (see GitHub docs on authenticating with SAML SSO).
 * Browsers only expose response headers listed in `Access-Control-Expose-Headers`; when the
 * header is missing we still infer SSO from the JSON `message` when possible.
 */

export type GithubAccessErrorResult = {
  message: string;
  /** URL from `X-GitHub-SSO` when GitHub returns one (may be null if header not exposed). */
  ssoAuthorizeUrl: string | null;
  showSsoHelp: boolean;
};

export function parseGithubSsoHeader(raw: string | null | undefined): {
  required: boolean;
  authorizeUrl: string | null;
} {
  if (!raw || typeof raw !== "string") return { required: false, authorizeUrl: null };
  const required = /\brequired\b/i.test(raw);
  const urlMatch = raw.match(/\burl=([^;\s]+)/i);
  let authorizeUrl: string | null = null;
  if (urlMatch?.[1]) {
    try {
      authorizeUrl = decodeURIComponent(urlMatch[1].trim());
    } catch {
      authorizeUrl = urlMatch[1].trim();
    }
  }
  return { required, authorizeUrl };
}

function looksLikeSamlMessage(message: string): boolean {
  const m = message.toLowerCase();
  return (
    /\bsso\b/.test(m) ||
    /\bsaml\b/.test(m) ||
    /single sign-on/.test(m) ||
    /organization must authorize/.test(m) ||
    /organization required/.test(m) ||
    /resource protected by organization/.test(m)
  );
}

export function formatGithubAccessError(
  res: Response,
  apiMessage: string | undefined,
  lang: "en" | "ja",
): GithubAccessErrorResult {
  const status = res.status;
  const base = (apiMessage || "").trim() || `HTTP ${status}`;
  const headerRaw = res.headers.get("x-github-sso") || res.headers.get("X-GitHub-SSO");
  const parsed = parseGithubSsoHeader(headerRaw);

  if (status !== 403) {
    return { message: base, ssoAuthorizeUrl: null, showSsoHelp: false };
  }

  const showSsoHelp = parsed.required || parsed.authorizeUrl != null || looksLikeSamlMessage(base);
  if (!showSsoHelp) {
    return { message: base, ssoAuthorizeUrl: null, showSsoHelp: false };
  }

  const extra =
    lang === "ja"
      ? "\n\nこの組織のリポジトリは SAML SSO で保護されている可能性があります。GitHub 上で Sooner が使うトークン（OAuth アプリ／GitHub ログイン）の組織アクセスを承認してください。組織によっては管理者の承認が必要です。詳しくは下の「SSO のヘルプ」を参照してください。"
      : "\n\nThis repository may be protected by SAML SSO. On GitHub, authorize your token (OAuth app used when you sign in with GitHub) for the organization. Some companies require an org admin to approve the app first. See “SSO help” below for details.";

  return {
    message: base + extra,
    ssoAuthorizeUrl: parsed.authorizeUrl,
    showSsoHelp: true,
  };
}
