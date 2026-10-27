// Copia tokens/tokens.js a cada app, para que Vite y Metro no tengan que
// importar archivos fuera de su carpeta. Uso: node tokens/sync.mjs
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const source = readFileSync(join(here, 'tokens.js'), 'utf8');
const header = '// ARCHIVO GENERADO: no editar. Fuente: frontend/tokens/tokens.js (node tokens/sync.mjs)\n';

const targets = [
  join(here, '..', 'web-admin', 'src', 'tokens.js'),
  join(here, '..', 'mobile-residentes', 'src', 'constants', 'tokens.js'),
];

for (const target of targets) {
  writeFileSync(target, header + source);
  console.log('Tokens copiados a', target);
}
