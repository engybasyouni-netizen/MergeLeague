"use client";

import { useEffect, useMemo, useState } from "react";
import { JoinLeagueModal } from "@/components/join-league-modal";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  DEMO_MODE,
  apiUrl,
  connectWallet,
  createWallet,
  fetchCurrentSeason,
  fetchMe,
  fetchWallet,
  getStoredToken,
  payEntryFee,
} from "@/lib/api";
import { demoUser, demoWallet } from "@/lib/demo-data";
import type { CurrentUser, SeasonSummary, WalletSummary } from "@/lib/types";
import { formatXlm, truncateKey } from "@/lib/utils";

export function WalletPageClient() {
  const [user, setUser] = useState<CurrentUser | null>(null);
  const [season, setSeason] = useState<SeasonSummary | null>(null);
  const [wallet, setWallet] = useState<WalletSummary | null>(null);
  const [freighterPublicKey, setFreighterPublicKey] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<"wallet" | "pay" | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  async function reload() {
    if (DEMO_MODE) {
      const currentSeason = await fetchCurrentSeason();
      setUser(demoUser);
      setSeason(currentSeason);
      setWallet(demoWallet);
      setError(null);
      return;
    }

    const token = getStoredToken();
    if (!token) {
      setError(null);
      return;
    }

    const [me, currentSeason] = await Promise.all([fetchMe(token), fetchCurrentSeason()]);
    setUser(me);
    setSeason(currentSeason);

    try {
      setWallet(await fetchWallet(token));
    } catch {
      setWallet(null);
    }
  }

  useEffect(() => {
    if (typeof window !== "undefined") {
      const cached = window.localStorage.getItem("mergeleague_freighter_public_key");
      if (cached) setFreighterPublicKey(cached);
    }
    void reload().catch((cause) => {
      setError(cause instanceof Error ? cause.message : "Failed to load wallet page");
    });
  }, []);

  const pendingEntry = useMemo(
    () => user?.leagueEntries.find((entry) => entry.status === "PENDING_PAYMENT" && entry.season.status === "ACTIVE") ?? null,
    [user],
  );

  async function handleCreateWallet() {
    if (DEMO_MODE) {
      setBusy("wallet");
      setSuccess(null);
      setError(null);
      setWallet(demoWallet);
      setSuccess("Demo wallet is ready.");
      setBusy(null);
      return;
    }

    const token = getStoredToken();
    if (!token) {
      setError("Sign in with GitHub first if you want a server custodial wallet. For Freighter, use Connect Freighter.");
      return;
    }

    setBusy("wallet");
    setSuccess(null);
    setError(null);

    try {
      const created = await createWallet(token);
      setWallet(created);
      setSuccess("Wallet created and funded on Stellar Testnet.");
      await reload();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Failed to create wallet");
    } finally {
      setBusy(null);
    }
  }

  async function handleConnectFreighter() {
    if (DEMO_MODE) {
      setBusy("wallet");
      setSuccess(null);
      setError(null);
      if (typeof window !== "undefined") {
        window.localStorage.setItem("mergeleague_freighter_public_key", demoWallet.publicKey);
      }
      setFreighterPublicKey(demoWallet.publicKey);
      setWallet(demoWallet);
      setSuccess("Freighter connected (demo mode).");
      setBusy(null);
      return;
    }

    const token = getStoredToken();
    setBusy("wallet");
    setSuccess(null);
    setError(null);

    try {
      const freighter = await import("@stellar/freighter-api");
      const api = freighter.default ?? freighter;

      const access = await api.requestAccess();
      if (access?.error) {
        throw new Error(access.error);
      }

      const publicKey = access.address;
      if (typeof window !== "undefined") {
        window.localStorage.setItem("mergeleague_freighter_public_key", publicKey);
      }
      setFreighterPublicKey(publicKey);

      // If user is signed in, persist it as their primary wallet on the API.
      if (token) {
        const connected = await connectWallet(token, { publicKey, network: "TESTNET" });
        setWallet(connected);
        setSuccess("Freighter wallet connected and saved to your account.");
        await reload();
      } else {
        setSuccess("Freighter connected locally. Sign in with GitHub to save it to your account and join/pay in a season.");
      }
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Failed to connect Freighter");
    } finally {
      setBusy(null);
    }
  }

  async function handlePayEntryFee() {
    if (DEMO_MODE) {
      setBusy("pay");
      setSuccess(null);
      setError(null);
      setSuccess("Demo payment submitted. Tx hash: DEMO_PAYMENT_TX_HASH");
      setBusy(null);
      return;
    }

    const token = getStoredToken();
    if (!token) {
      window.location.href = `${apiUrl}/auth/github`;
      return;
    }
    if (!pendingEntry) return;

    setBusy("pay");
    setSuccess(null);
    setError(null);

    try {
      const result = await payEntryFee(token, pendingEntry.season.id);
      if ("status" in result && result.status === "SIGNATURE_REQUIRED") {
        const freighter = await import("@stellar/freighter-api");
        const api = freighter.default ?? freighter;
        const signed = await api.signTransaction(result.xdr, {
          networkPassphrase: result.networkPassphrase,
        });
        if (signed?.error) {
          throw new Error(signed.error);
        }
        const submitted = await payEntryFee(token, pendingEntry.season.id, signed.signedTxXdr);
        if ("status" in submitted) {
          throw new Error("Payment still requires signature");
        }
        setSuccess(`Entry fee paid successfully. Tx hash: ${submitted.payment.txHash}`);
      } else {
        setSuccess(`Entry fee paid successfully. Tx hash: ${result.payment.txHash}`);
      }
      await reload();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Payment failed");
    } finally {
      setBusy(null);
    }
  }

  return (
    <main className="space-y-8 pb-10">
      <Card>
        <CardHeader className="gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="space-y-3">
            <Badge>Wallet</Badge>
            <CardTitle className="text-4xl">Stellar wallet and season pool</CardTitle>
            <CardDescription className="max-w-2xl text-base leading-7">
              Create a custodial Testnet wallet, join the current season, and push your entry fee into the pool account
              with server-side signing.
            </CardDescription>
          </div>
          {season ? <JoinLeagueModal season={season} teams={user?.teamMembers.map((member) => member.team) ?? []} /> : null}
        </CardHeader>
      </Card>

      {error ? (
        <Card>
          <CardHeader>
            <CardTitle>Wallet action blocked</CardTitle>
            <CardDescription>{error}</CardDescription>
          </CardHeader>
        </Card>
      ) : null}

      {success ? (
        <Card className="border-emerald-300/20">
          <CardHeader>
            <CardTitle>Success</CardTitle>
            <CardDescription>{success}</CardDescription>
          </CardHeader>
        </Card>
      ) : null}

      <section className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Primary wallet</CardTitle>
            <CardDescription>Provisioned on Stellar Testnet for season deposits and payouts.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
              <p className="text-sm text-slate-400">Wallet address</p>
              <p className="mt-2 font-mono text-sm text-white">
                {wallet
                  ? truncateKey(wallet.publicKey, 10, 8)
                  : freighterPublicKey
                    ? truncateKey(freighterPublicKey, 10, 8)
                    : "Not connected"}
              </p>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                <p className="text-sm text-slate-400">Network</p>
                <p className="mt-2 text-xl font-semibold text-white">{wallet?.network ?? "TESTNET"}</p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                <p className="text-sm text-slate-400">Funded</p>
                <p className="mt-2 text-xl font-semibold text-white">{wallet?.fundedAt ? "Yes" : "No"}</p>
              </div>
            </div>
            <div className="flex flex-wrap gap-3">
              <Button onClick={handleConnectFreighter} disabled={busy === "wallet"}>
                {busy === "wallet" ? "Connecting..." : "Connect Freighter"}
              </Button>
              <Button
                variant="secondary"
                onClick={handleCreateWallet}
                disabled={busy === "wallet" || Boolean(wallet)}
              >
                {wallet ? "Wallet ready" : busy === "wallet" ? "Creating wallet..." : "Create custodial wallet"}
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Season payment</CardTitle>
            <CardDescription>Join first, then fund your season entry into the shared pool wallet.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
              <p className="text-sm text-slate-400">Pending season</p>
              <p className="mt-2 text-xl font-semibold text-white">{pendingEntry?.season.name ?? "No pending payment"}</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
              <p className="text-sm text-slate-400">Entry fee</p>
              <p className="mt-2 text-xl font-semibold text-white">
                {pendingEntry?.season.entryFeeXlm ? formatXlm(pendingEntry.season.entryFeeXlm) : "Not available"}
              </p>
            </div>
            <Button onClick={handlePayEntryFee} disabled={busy === "pay" || !pendingEntry}>
              {busy === "pay" ? "Submitting payment..." : "Pay entry fee"}
            </Button>
          </CardContent>
        </Card>
      </section>

      <Card>
        <CardHeader>
          <CardTitle>League entries</CardTitle>
          <CardDescription>Your most recent season entries and payout readiness.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {user?.leagueEntries.length ? (
            user.leagueEntries.map((entry) => (
              <div
                key={entry.id}
                className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-white/10 bg-white/5 p-4"
              >
                <div>
                  <p className="font-medium text-white">{entry.season.name}</p>
                  <p className="text-sm text-slate-400">
                    {entry.team ? `Team ${entry.team.name}` : "Solo entry"} - Status {entry.status}
                  </p>
                </div>
                <Badge className={entry.status === "ACTIVE" ? "text-emerald-100" : "text-amber-100"}>
                  {entry.status}
                </Badge>
              </div>
            ))
          ) : (
            <p className="text-sm text-slate-400">No season entries yet.</p>
          )}
        </CardContent>
      </Card>
    </main>
  );
}
