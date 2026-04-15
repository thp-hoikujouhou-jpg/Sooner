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
    id: "2026-04-16",
    labelEn: "April 16, 2026 — before lp.sooner.sh (marketing host was site.sooner.sh)",
    labelJa: "2026年4月16日 — lp.sooner.sh 移行前（マーケ用ホストは site.sooner.sh）",
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
