import type { LegalSection } from "./legalContent";
import snap20260415 from "./legalSnapshot20260415PreLp.json";
import snap20260415PreCookie from "./legalSnapshot20260415PreCookieConsent.json";

/** One frozen snapshot of all four legal bodies (add a new entry before you edit legalContent.ts). */
export type LegalSnapshotBundle = {
  id: string;
  labelEn: string;
  labelJa: string;
  archivedOn: string;
  termsEn: LegalSection[];
  termsJa: LegalSection[];
  privacyEn: LegalSection[];
  privacyJa: LegalSection[];
};

/**
 * Archiving workflow (required when publishing new legal text):
 * 1. Copy the current `termsEn`, `termsJa`, `privacyEn`, `privacyJa` arrays from `legalContent.ts`
 *    into a new object below (new `id`, labels, and `archivedOn`).
 * 2. Only then edit the live text in `legalContent.ts` and bump `lastUpdated` in `legalMeta`.
 * 3. Deploy. Old versions remain available at `/legal/{en|ja}/archive/{id}/{terms|privacy}`.
 */
export const LEGAL_SNAPSHOTS: LegalSnapshotBundle[] = [
  {
    id: "2026-04-15-pre-cookie",
    labelEn:
      "April 15, 2026 archive — text frozen before cookie consent banner and Privacy Policy “Cookies, local storage” section (version id in source at freeze: 2026-04-15)",
    labelJa:
      "2026年4月15日アーカイブ — Cookie 同意バナーおよびプライバシーポリシー「Cookie・ローカルストレージ」条の直前の文面（凍結時の版IDは2026-04-15）",
    archivedOn: "2026-04-15",
    termsEn: snap20260415PreCookie.termsEn as LegalSection[],
    termsJa: snap20260415PreCookie.termsJa as LegalSection[],
    privacyEn: snap20260415PreCookie.privacyEn as LegalSection[],
    privacyJa: snap20260415PreCookie.privacyJa as LegalSection[],
  },
  {
    id: "2026-04-15",
    labelEn: "April 15, 2026 archive — text frozen from prior publish (marketing host in text was site.sooner.sh; version id 2026-04-15)",
    labelJa: "2026年4月15日アーカイブ — 直前までの公開文面を固定（本文中のマーケ表記は site.sooner.sh、版ID 2026-04-15）",
    archivedOn: "2026-04-15",
    termsEn: snap20260415.termsEn as LegalSection[],
    termsJa: snap20260415.termsJa as LegalSection[],
    privacyEn: snap20260415.privacyEn as LegalSection[],
    privacyJa: snap20260415.privacyJa as LegalSection[],
  },
];

export function getLegalSnapshot(id: string): LegalSnapshotBundle | undefined {
  return LEGAL_SNAPSHOTS.find((s) => s.id === id);
}
