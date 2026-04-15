import type { LegalSection } from "./legalContent";
import snap20260416 from "./legalSnapshot20260416PreLp.json";

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
    id: "2026-04-15",
    labelEn: "April 15, 2026 archive — text frozen from prior publish (marketing host was site.sooner.sh; in-repo version id had been 2026-04-16)",
    labelJa: "2026年4月15日アーカイブ — 直前までの公開文面を固定（マーケは site.sooner.sh。リポジトリ上の版IDは2026-04-16でした）",
    archivedOn: "2026-04-15",
    termsEn: snap20260416.termsEn as LegalSection[],
    termsJa: snap20260416.termsJa as LegalSection[],
    privacyEn: snap20260416.privacyEn as LegalSection[],
    privacyJa: snap20260416.privacyJa as LegalSection[],
  },
];

export function getLegalSnapshot(id: string): LegalSnapshotBundle | undefined {
  return LEGAL_SNAPSHOTS.find((s) => s.id === id);
}
