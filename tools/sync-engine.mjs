/**
 * Copia o motor de poker (fonte única de verdade) para a edge function do
 * Supabase, que só empacota arquivos dentro de supabase/functions/.
 * Rodar: npm run sync:engine
 */
import { copyFileSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '..');
const target = resolve(root, 'supabase/functions/_shared');
mkdirSync(target, { recursive: true });

for (const file of ['engine.ts', 'bot.ts']) {
  copyFileSync(resolve(root, `src/games/poker/${file}`), resolve(target, `poker-${file}`));
  console.log(`✔ src/games/poker/${file} -> supabase/functions/_shared/poker-${file}`);
}
