/**
 * Runs after `vite build`. Prints SEO reminders (does not fail the build).
 */
import { readFileSync, existsSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");
const distIndex = join(root, "dist", "index.html");

console.log("\n\x1b[36m[Sooner SEO]\x1b[0m Production build finished.\n");
if (existsSync(distIndex)) {
  const html = readFileSync(distIndex, "utf8");
  const hasDesc = /name="description"/i.test(html);
  const hasOg = /property="og:title"/i.test(html);
  console.log(`  dist/index.html: description=${hasDesc ? "ok" : "missing"}  og:title=${hasOg ? "ok" : "missing"}`);
  const m = html.match(/name="build-time"\s+content="([^"]+)"/);
  if (m) console.log(`  build-time: ${m[1]}`);
}
console.log("\n  Next steps:");
console.log("  • Submit sitemap: https://lp.sooner.sh/sitemap.xml (Search Console)");
console.log("  • Register custom hosts in Firebase: site, sooner, signup, signin, blog");
console.log("  • Runtime SEO: applyDocumentSeo() updates title/meta per subdomain after load\n");
