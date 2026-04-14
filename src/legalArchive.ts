import type { LegalSection } from "./legalContent";

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
export const LEGAL_SNAPSHOTS: LegalSnapshotBundle[] = [];

export function getLegalSnapshot(id: string): LegalSnapshotBundle | undefined {
  return LEGAL_SNAPSHOTS.find((s) => s.id === id);
}
