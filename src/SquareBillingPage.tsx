import React, { useCallback, useEffect, useState } from "react";
import axios from "axios";
import { Loader2, CreditCard, ShieldCheck } from "lucide-react";

const BACKEND = (import.meta.env.VITE_BACKEND_URL || "").trim().replace(/\/$/, "");

function api(path: string) {
  return `${BACKEND}${path}`;
}

declare global {
  interface Window {
    Square?: any;
  }
}

export default function SquareBillingPage() {
  const [config, setConfig] = useState<{
    applicationId: string;
    locationId: string;
    environment?: "sandbox" | "production";
  } | null>(null);
  const [configError, setConfigError] = useState<string | null>(null);
  const [email, setEmail] = useState("");
  const [givenName, setGivenName] = useState("");
  const [familyName, setFamilyName] = useState("");
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [sdkReady, setSdkReady] = useState(false);

  useEffect(() => {
    if (!BACKEND) {
      setConfigError("Set VITE_BACKEND_URL to your workspace server (same host that exposes /api/square/*).");
      return;
    }
    axios
      .get<{ applicationId: string; locationId: string; environment?: string }>(api("/api/square/config"))
      .then((r) => setConfig(r.data))
      .catch((e) => setConfigError(e?.response?.data?.error || e?.message || "Failed to load Square config"));
  }, []);

  useEffect(() => {
    if (!config) return;
    const id = "square-js";
    if (document.getElementById(id)) {
      setSdkReady(!!window.Square);
      return;
    }
    const s = document.createElement("script");
    s.id = id;
    s.src =
      config.environment === "production"
        ? "https://web.squarecdn.com/v1/square.js"
        : "https://sandbox.web.squarecdn.com/v1/square.js";
    s.async = true;
    s.onload = () => setSdkReady(true);
    s.onerror = () => setError("Failed to load Square Web Payments SDK");
    document.body.appendChild(s);
    return () => {};
  }, [config]);

  const onSubscribe = useCallback(async () => {
    if (!BACKEND || !config) return;
    setBusy(true);
    setError(null);
    setResult(null);
    try {
      if (!window.Square?.payments) {
        throw new Error("Square SDK not ready");
      }
      const payments = window.Square.payments(config.applicationId, config.locationId);
      const card = await payments.card();
      await card.attach("#square-card-container");
      const tokenRes = await card.tokenize();
      if (tokenRes.status !== "OK") {
        throw new Error(tokenRes.errors?.map((e: any) => e.message).join("; ") || "Card tokenize failed");
      }
      const sourceId = tokenRes.token;
      const res = await axios.post(api("/api/square/subscribe"), {
        sourceId,
        email: email.trim(),
        givenName: givenName.trim() || "Sooner",
        familyName: familyName.trim() || "Customer",
      });
      setResult(
        `Subscription created: id=${res.data.subscriptionId ?? "?"} status=${res.data.status ?? "?"}`
      );
      await card.destroy?.();
    } catch (e: any) {
      setError(e?.response?.data?.error || e?.message || String(e));
    } finally {
      setBusy(false);
    }
  }, [config, email, givenName, familyName]);

  return (
    <div className="min-h-screen bg-[#0A0A0A] text-[#E4E3E0] px-4 py-10">
      <div className="max-w-lg mx-auto space-y-6">
        <div className="flex items-center gap-2 text-[#38BDF8]">
          <ShieldCheck className="w-6 h-6" />
          <h1 className="text-xl font-bold">
            Square billing ({config?.environment === "production" ? "production" : "sandbox"})
          </h1>
        </div>
        <p className="text-sm text-[#8E9299] leading-relaxed">
          Web Payments SDK tokenizes the card in the browser. Your server uses{" "}
          <code className="text-[#38BDF8]">SQUARE_ACCESS_TOKEN</code> to create a customer, store the card, and start a
          subscription. Never put Application Secret / Access Token in the frontend or in git.
        </p>
        {!BACKEND && (
          <p className="text-sm text-amber-400">Configure VITE_BACKEND_URL, then reload this page.</p>
        )}
        {configError && <p className="text-sm text-red-400">{configError}</p>}
        {config && (
          <>
            <div className="space-y-2">
              <label className="text-xs uppercase tracking-widest text-[#8E9299]">Email</label>
              <input
                className="w-full bg-[#151515] border border-[#252525] rounded-lg px-3 py-2 text-sm"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
              />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-2">
                <label className="text-xs uppercase tracking-widest text-[#8E9299]">First name</label>
                <input
                  className="w-full bg-[#151515] border border-[#252525] rounded-lg px-3 py-2 text-sm"
                  value={givenName}
                  onChange={(e) => setGivenName(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs uppercase tracking-widest text-[#8E9299]">Last name</label>
                <input
                  className="w-full bg-[#151515] border border-[#252525] rounded-lg px-3 py-2 text-sm"
                  value={familyName}
                  onChange={(e) => setFamilyName(e.target.value)}
                />
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-xs uppercase tracking-widest text-[#8E9299] flex items-center gap-1">
                <CreditCard className="w-3 h-3" /> Card
              </label>
              <div id="square-card-container" className="min-h-[90px] bg-[#151515] border border-[#252525] rounded-lg p-2" />
              {!sdkReady && <p className="text-xs text-[#8E9299]">Loading Square SDK…</p>}
            </div>
            <button
              type="button"
              disabled={busy || !sdkReady || !email.trim()}
              onClick={() => void onSubscribe()}
              className="w-full py-3 rounded-lg bg-[#38BDF8] text-black font-bold text-sm disabled:opacity-40 flex items-center justify-center gap-2"
            >
              {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
              Start subscription ({config?.environment === "production" ? "production" : "sandbox"})
            </button>
          </>
        )}
        {result && <p className="text-sm text-emerald-400">{result}</p>}
        {error && <p className="text-sm text-red-400">{error}</p>}
        <p className="text-[11px] text-[#555] leading-relaxed">
          Env on server: SQUARE_APPLICATION_ID, SQUARE_LOCATION_ID, SQUARE_ACCESS_TOKEN (Sandbox access token),
          SQUARE_PLAN_VARIATION_ID (subscription plan variation from Catalog), optional SQUARE_ENVIRONMENT=production.
        </p>
      </div>
    </div>
  );
}
