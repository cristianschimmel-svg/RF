const fs = require('fs');
let c = fs.readFileSync('src/lib/services/connectors/argentina-datos.ts', 'utf-8');
c = c.replace(/const url = \$\{API_CONFIG.*/, "const url = `${API_CONFIG.argentinaDatos.baseUrl}/v1/finanzas/tasas/plazoFijo`;");
fs.writeFileSync('src/lib/services/connectors/argentina-datos.ts', c);
