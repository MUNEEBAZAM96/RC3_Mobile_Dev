import { config } from 'dotenv';
import { existsSync } from 'node:fs';
import path from 'node:path';

const backendRoot = process.cwd();

function loadFile(name: string, override: boolean): void {
  const filePath = path.join(backendRoot, name);
  if (existsSync(filePath)) config({ path: filePath, override });
}

loadFile('.env', false);
loadFile('.env.local', true);
