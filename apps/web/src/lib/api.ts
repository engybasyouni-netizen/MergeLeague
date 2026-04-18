import type {
  CurrentUser,
  JoinLeagueResponse,
  LeaderboardResponse,
  SeasonSummary,
  Team,
  WalletSummary,
} from "@/lib/types";
import { demoLeaderboard, demoSeason, demoTeams, demoUser, demoWallet } from "@/lib/demo-data";

export const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";
export const authStorageKey = "mergeleague_token";
export const DEMO_MODE = true;

export function getStoredToken() {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(authStorageKey);
}

export function setStoredToken(token: string) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(authStorageKey, token);
  document.cookie = `mergeleague_token=${encodeURIComponent(token)}; path=/; max-age=${60 * 60 * 24 * 30}; samesite=lax`;
}

export function clearStoredToken() {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(authStorageKey);
  document.cookie = "mergeleague_token=; path=/; max-age=0; samesite=lax";
}

async function parseJson<T>(response: Response): Promise<T> {
  if (!response.ok) {
    const message = await response.text();
    throw new Error(message || "Request failed");
  }
  return response.json() as Promise<T>;
}

export async function fetchPublicJson<T>(path: string, init?: RequestInit) {
  if (DEMO_MODE) {
    return demoRoute(path) as T;
  }
  const response = await fetch(`${apiUrl}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
    cache: init?.cache ?? "no-store",
  });
  return parseJson<T>(response);
}

export async function fetchAuthedJson<T>(path: string, token: string, init?: RequestInit) {
  if (DEMO_MODE) {
    return demoRoute(path, token, init) as T;
  }
  const response = await fetch(`${apiUrl}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      ...(init?.headers ?? {}),
    },
  });
  return parseJson<T>(response);
}

function demoRoute(path: string, _token?: string, init?: RequestInit) {
  if (path === "/seasons/current") return demoSeason;
  if (path.startsWith("/seasons/") && path.endsWith("/leaderboard")) return demoLeaderboard;
  if (path === "/users/me") return demoUser;
  if (path === "/teams") return demoTeams;
  if (path === "/wallets/me") return demoWallet;
  if (path === "/wallets/create") return demoWallet;
  if (path === "/wallets/connect") return demoWallet;
  if (path === "/league/join") {
    const body = typeof init?.body === "string" ? (JSON.parse(init.body) as { seasonId: string; teamId?: string }) : null;
    const memo = `demo-join-${(body?.seasonId ?? demoSeason.id).slice(0, 8)}-demo`;
    const entry: JoinLeagueResponse = {
      id: "entry-demo-join",
      status: "PENDING_PAYMENT",
      paidAt: null,
      entryTxHash: null,
      paymentMemo: memo,
      season: demoSeason,
      team: body?.teamId ? { id: body.teamId, name: "Demo Team", slug: "demo-team" } : null,
      payment: {
        network: "TESTNET",
        walletPublicKey: demoWallet.publicKey,
        poolPublicKey: "GDEMOPOOLPUBLICKEYXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX",
        amountXlm: demoSeason.entryFeeXlm ?? "0",
        memo,
      },
    };
    return entry;
  }
  if (path === "/league/pay") {
    return { payment: { txHash: "DEMO_PAYMENT_TX_HASH", poolPublicKey: "GDEMOPOOLPUBLICKEYXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX", amountXlm: demoSeason.entryFeeXlm ?? "0" } };
  }

  // Default: return something harmless instead of throwing.
  return null;
}

export async function fetchCurrentSeason() {
  return fetchPublicJson<SeasonSummary>("/seasons/current");
}

export async function fetchLeaderboard(seasonId: string) {
  return fetchPublicJson<LeaderboardResponse>(`/seasons/${seasonId}/leaderboard`);
}

export async function fetchMe(token: string) {
  return fetchAuthedJson<CurrentUser>("/users/me", token);
}

export async function fetchTeams(token: string) {
  return fetchAuthedJson<Team[]>("/teams", token);
}

export async function fetchWallet(token: string) {
  return fetchAuthedJson<WalletSummary>("/wallets/me", token);
}

export async function createWallet(token: string) {
  return fetchAuthedJson<WalletSummary>("/wallets/create", token, { method: "POST" });
}

export async function connectWallet(token: string, payload: { publicKey: string; network?: string }) {
  return fetchAuthedJson<WalletSummary>("/wallets/connect", token, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function joinLeague(token: string, payload: { seasonId: string; teamId?: string }) {
  return fetchAuthedJson<JoinLeagueResponse>("/league/join", token, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function payEntryFee(
  token: string,
  seasonId: string,
  signedXdr?: string,
): Promise<
  | { payment: { txHash: string; poolPublicKey: string; amountXlm: string } }
  | {
      status: "SIGNATURE_REQUIRED";
      networkPassphrase: string;
      xdr: string;
      payment: { walletPublicKey: string; poolPublicKey: string; amountXlm: string; memo: string };
    }
> {
  return fetchAuthedJson("/league/pay", token, {
    method: "POST",
    body: JSON.stringify({ seasonId, signedXdr }),
  });
}

