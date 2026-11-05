import '../src/loadEnv.js';
import { applyBenchmarkPreset, type BenchmarkPreset } from '../src/household/benchmarkSeed.js';
import { createHouseholdStore } from '../src/household/store.js';

const PRESETS: BenchmarkPreset[] = [
  'empty',
  'pre_settlement',
  'post_settlement',
  'shopping_demo',
  'paisa_test',
];

async function main(): Promise<void> {
  const arg = process.argv[2];
  if (!arg || !PRESETS.includes(arg as BenchmarkPreset)) {
    console.error(`Usage: npm run seed:benchmark -- <${PRESETS.join('|')}>`);
    process.exit(1);
  }

  const store = await createHouseholdStore();
  const report = await applyBenchmarkPreset(store, arg as BenchmarkPreset);
  console.log(JSON.stringify(report, null, 2));

  if (!report.assertions.ok) {
    console.error('Benchmark assertions failed.');
    process.exit(1);
  }
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : String(err));
  process.exit(1);
});
