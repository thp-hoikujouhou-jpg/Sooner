/**
 * One-off / rare: rebuild `src/legalSnapshot20260416PreLp.json` from a frozen `legalContent.ts`.
 * 1. Save the target commit file as UTF-8 `_extract_prev_legal.ts` in repo root, e.g.:
 *    git show 3bd5995:src/legalContent.ts > _extract_prev_legal.ts
 * 2. node scripts/build-legal-snapshot.mjs
 * 3. Remove `_extract_prev_legal.ts` (do not commit).
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
const src = fs.readFileSync(path.join(root, "_extract_prev_legal.ts"), "utf8");
const i = src.indexOf("export const termsEn:");
const j = src.indexOf("export const legalMeta");
if (i < 0 || j < 0) throw new Error("markers not found");
const block = src.slice(i, j).trim();

function sliceExport(name) {
  const re = new RegExp(`export const ${name}: LegalSection\\[\\] = ([\\s\\S]*?);\\s*(?=export const|$)`);
  const m = block.match(re);
  if (!m) throw new Error(`export ${name} not found`);
  return m[1].trim();
}

function evalArrayLiteral(lit) {
  return new Function(`return ${lit}`)();
}

const termsEn = evalArrayLiteral(sliceExport("termsEn"));
const termsJa = evalArrayLiteral(sliceExport("termsJa"));
const privacyEn = evalArrayLiteral(sliceExport("privacyEn"));
const privacyJa = evalArrayLiteral(sliceExport("privacyJa"));

const bundle = {
  _meta: {
    legalDocumentVersionId: "2026-04-16",
    note: "Frozen before lp.sooner.sh; marketing host was site.sooner.sh",
  },
  termsEn,
  termsJa,
  privacyEn,
  privacyJa,
};

const outPath = path.join(root, "src", "legalSnapshot20260416PreLp.json");
fs.writeFileSync(outPath, JSON.stringify(bundle, null, 2), "utf8");
console.log("Wrote", outPath);
