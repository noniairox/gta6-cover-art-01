/**
 * Vice Cover Studio — the entry's program (gta6-cover-art-01).
 *
 * Copies app/ and screenshots/ from this repository to the output directory
 * and writes the dossier there with buildDossier from vendor/makefun-app.ts,
 * the kit's library. The output directory is MAKEFUN_OUTPUT_DIR when set,
 * else /output. Runs twice in grading and writes the same bytes both times:
 * the copy is a plain file copy and the dossier is canonical JSON built from
 * the files alone, so nothing in the output depends on the clock or the run.
 */
import { cpSync, mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-app.ts';

const repoRoot = dirname(fileURLToPath(import.meta.url));
const outDir = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

mkdirSync(outDir, { recursive: true });
cpSync(join(repoRoot, 'app'), join(outDir, 'app'), { recursive: true });
cpSync(join(repoRoot, 'screenshots'), join(outDir, 'screenshots'), { recursive: true });

const dossier = buildDossier(repoRoot, {
  text_max_bytes: 163840,
  screenshots: { max: 4, max_bytes: 262144 },
  app_max_files: 993,
  app_max_bytes: 48 * 1024 * 1024,
  app_path_max_bytes: 1000,
});
writeFileSync(join(outDir, 'dossier.json'), dossier);
console.log(`wrote ${join(outDir, 'dossier.json')} (${dossier.length} bytes)`);
