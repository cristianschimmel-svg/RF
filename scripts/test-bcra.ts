import { fetchBCRAVariables, getIndicatorsByCategory } from '../src/lib/services/connectors/bcra.ts';

async function test() {
  try {
    const allBcra = await fetchBCRAVariables();
    console.log("All BCRA Count:", allBcra.length);
    const rateIndicators = allBcra.filter(
      (i) => i.category === 'tasas' || 
             i.shortName.toLowerCase().includes('tasa') || 
             i.shortName.toLowerCase().includes('badlar') ||
             i.shortName.toLowerCase().includes('pase')
    );
    console.log("Filtered rates length:", rateIndicators.length);
    console.log(rateIndicators.map(r => r.name));
  } catch(e) {
    console.error(e);
  }
}

test();