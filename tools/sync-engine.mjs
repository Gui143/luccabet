/**
 * Copia o motor de poker (fonte única de verdade) para a edge function do
 * Supabase, que só empacota arquivos dentro de supabase/functions/.
 * Rodar: npm run sync:engine
 */
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '..');
const target = resolve(root, 'supabase/functions/_shared');
mkdirSync(target, { recursive: true });

for (const file of ['engine.ts', 'bot.ts']) {
  const src = readFileSync(resolve(root, `src/games/poker/${file}`), 'utf8')
    // o Deno resolve caminhos literais: ./engine -> ./poker-engine.ts
    .replace(/(from\s+['"])\.\/(engine|bot)(\.ts)?(['"])/g, '$1./poker-$2.ts$4');
  writeFileSync(resolve(target, `poker-${file}`), src);
  console.log(`✔ src/games/poker/${file} -> supabase/functions/_shared/poker-${file}`);
}

