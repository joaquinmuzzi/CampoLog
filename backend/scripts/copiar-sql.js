// Copia las migraciones SQL a dist/ para que el backend compilado las encuentre.
const fs = require('fs');
const path = require('path');

const origen = path.join(__dirname, '..', 'src', 'db', 'migraciones');
const destino = path.join(__dirname, '..', 'dist', 'db', 'migraciones');
fs.mkdirSync(destino, { recursive: true });
for (const archivo of fs.readdirSync(origen).filter((a) => a.endsWith('.sql'))) {
  fs.copyFileSync(path.join(origen, archivo), path.join(destino, archivo));
}
