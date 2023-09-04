import fs from 'node:fs/promises';
import { parseBugspotsOptions } from './BugspotsOptions';
import { round } from './utils/round';
import { Bugspots } from './Bugspots';

export async function run(): Promise<void> {
  const options = parseBugspotsOptions(process.argv.slice(2));
  const bugspots = new Bugspots(options);
  const hotspots = await bugspots.scan();
  const output = hotspots
    .map(([file, score]) => {
      const roundedScore = round(score, 20);
      return `${String(roundedScore).padEnd(20, '0')}\t${file}`;
    })
    .join('\n');
  await fs.writeFile('hotspot.txt', output, 'utf8');
}
