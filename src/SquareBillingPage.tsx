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

type SquareConfig = {
  applicationId: string;
  locationId: string;
  environment?: "sandbox" | "production";
  defaultPlanVariationId?: string | null;
};

type SquarePlan = {
  id: string;
  name: string;
  description?: string;
  cadence?: string;
  amountCents?: number;
  currency?: string;
};

function formatPlanPrice(p: SquarePlan): string {
  if (p.amountCents == null || !p.currency) return "";
  const amt = (p.amountCents / 100).toFixed(2);
  const cad = p.cadence ? ` / ${p.cadence.toLowerCase().replace(/_/g, " ")}` : "";
  return `${p.currency} ${amt}${cad}`;
}

export default function SquareBillingPage() {
  const [config, setConfig] = useState<SquareConfig | null>(null);
  const [configError, setConfigError] = useState<string | null>(null);
  const [plans, setPlans] = useState<SquarePlan[]>([]);
  const [plansNotice, setPlansNotice] = useState<string | null>(null);
  const [selectedPlanId, setSelectedPlanId] = useState("");
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
    let cancelled = false;
    (async () => {
      setConfigError(null);
      try {
        const cfgRes = await axios.get<SquareConfig>(api("/api/square/config"));
        if (cancelled) return;
        setConfig(cfgRes.data);

        let list: SquarePlan[] = [];
        try {
          const plRes = await axios.get<{ plans?: SquarePlan[] }>(api("/api/square/plans"));
          list = Array.isArray(plRes.data?.plans) ? plRes.data.plans! : [];
        } catch (pe: any) {
          const msg = pe?.response?.data?.error || pe?.message || "catalog list failed";
          setPlansNotice(`Could not load catalog plans (${msg}). Using server default if set.`);
        }

        if (list.length === 0 && cfgRes.data.defaultPlanVariationId) {
          list = [
            {
              id: cfgRes.data.defaultPlanVariationId,
              name: "Default plan (SQUARE_PLAN_VARIATION_ID)",
            },
          ];
        }

        if (cancelled) return;
        setPlans(list);
        const def = cfgRes.data.defaultPlanVariationId || "";
        if (def && list.some((p) => p.id === def)) setSelectedPlanId(def);
        else if (list[0]) setSelectedPlanId(list[0].id);
        else setSelectedPlanId("");
      } catch (e: any) {
        if (cancelled) return;
        const d = e?.response?.data as { error?: string; missing?: string[]; hint?: string } | undefined;
        const parts = [d?.error || e?.message || "Failed to load Square config"];
        if (d?.missing?.length) parts.push(`Missing: ${d.missing.join(", ")}.`);
        if (d?.hint) parts.push(d.hint);
        setConfigError(parts.join(" "));
      }
    })();
    return () => {
      cancelled = true;
    };
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
    if (!BACKEND || !config || !selectedPlanId) return;
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
        planVariationId: selectedPlanId,
        email: email.trim(),
        givenName: givenName.trim() || "Sooner",
        familyName: familyName.trim() || "Customer",
      });
      setResult(
        `Subscription created: id=${res.data.subscriptionId ?? "?"} status=${res.data.status ?? "?"} plan=${selectedPlanId}`,
      );
      await card.destroy?.();
    } catch (e: any) {
      setError(e?.response?.data?.error || e?.message || String(e));
    } finally {
      setBusy(false);
    }
  }, [config, email, givenName, familyName, selectedPlanId]);

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
          <code className="text-[#38BDF8]">SQUARE_ACCESS_TOKEN</code> to list catalog plans, create a customer, store the
          card, and start a subscription. Never put Application Secret / Access Token in the frontend or in git.
        </p>
        {!BACKEND && <p className="text-sm text-amber-400">Configure VITE_BACKEND_URL, then reload this page.</p>}
        {configError && <p className="text-sm text-red-400">{configError}</p>}
        {plansNotice && <p className="text-xs text-amber-400/90">{plansNotice}</p>}
        {config && (
          <>
            <div className="space-y-2">
              <label className="text-xs uppercase tracking-widest text-[#8E9299]">Plan</label>
              {plans.length === 0 ? (
                <p className="text-sm text-red-400">
                  No subscription plan variations found. Create a subscription plan in the Square Dashboard (Catalog),
                  or set <code className="text-[#38BDF8]">SQUARE_PLAN_VARIATION_ID</code> on the server as a fallback.
                </p>
              ) : (
                <ul className="space-y-2 rounded-lg border border-[#252525] bg-[#151515] p-3">
                  {plans.map((p) => {
                    const price = formatPlanPrice(p);
                    return (
                      <li key={p.id}>
                        <label className="flex cursor-pointer items-start gap-3 rounded-md p-2 hover:bg-[#1A1A1A]">
                          <input
                            type="radio"
                            name="square-plan"
                            className="mt-1"
                            checked={selectedPlanId === p.id}
                            onChange={() => setSelectedPlanId(p.id)}
                          />
                          <span className="flex-1">
                            <span className="block text-sm font-medium text-white">{p.name}</span>
                            {p.description ? (
                              <span className="mt-0.5 block text-xs text-[#8E9299]">{p.description}</span>
                            ) : null}
                            {price ? <span className="mt-1 block text-xs text-[#38BDF8]">{price}</span> : null}
                            <span className="mt-0.5 block font-mono text-[10px] text-[#555]">{p.id}</span>
                          </span>
                        </label>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
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
              disabled={busy || !sdkReady || !email.trim() || !selectedPlanId || plans.length === 0}
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
          Required on the <strong className="text-[#71717A]">same host as /api</strong> (the Node server):{" "}
          <code className="text-[#52525B]">SQUARE_APPLICATION_ID</code>, <code className="text-[#52525B]">SQUARE_LOCATION_ID</code>,{" "}
          <code className="text-[#52525B]">SQUARE_ACCESS_TOKEN</code>. Optional:{" "}
          <code className="text-[#52525B]">SQUARE_PLAN_VARIATION_ID</code> (default selection if catalog is empty),{" "}
          <code className="text-[#52525B]">SQUARE_ENVIRONMENT=production</code>.
        </p>
        <p className="text-[11px] text-[#555] leading-relaxed">
          <strong className="text-[#71717A]">Plans:</strong> loaded from Square Catalog (
          <code className="text-[#52525B]">GET /v2/catalog/list?types=SUBSCRIPTION_PLAN_VARIATION</code>). Create plans in
          the Square Seller / Developer Dashboard (Subscriptions / Catalog).
        </p>
      </div>
    </div>
  );
}
