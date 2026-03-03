const fs = require('fs');
let c = fs.readFileSync('src/lib/services/connectors/bcra.ts', 'utf-8');

c = c.replace(/const riesgoPais = await fetchRiesgoPais\(\);/,
`const plazoFijo = await fetchTasaPlazoFijo();
      if (plazoFijo) {
        indicators.push({
          ...plazoFijo,
          id: 'bcra-6',
        });
      }

      const riesgoPais = await fetchRiesgoPais();`);

fs.writeFileSync('src/lib/services/connectors/bcra.ts', c);
