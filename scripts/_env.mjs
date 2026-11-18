// Loads .env.local (then .env) for the command-line scripts, the same way Next.js does for the app.
// Import this FIRST in every script so DATA_DIR etc. are set before the database module loads.
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
process.chdir(root); // DATA_DIR=./data must resolve against the project, wherever the script is started from

for (const file of ['.env.local', '.env']) {
  try {
    process.loadEnvFile(path.join(root, file)); // never overrides variables that are already set
  } catch {
    /* file not present */
  }
}
