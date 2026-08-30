import { createDatabase, resetKnownDemoData } from './db.js';

const filename = process.argv[2] || 'data/lexflow.db';
if (process.argv[3] !== '--confirm-reset-local-data') {
  console.error('This command is destructive and only accepts the known demo workspace.');
  console.error(`Usage: node src/reset-local-data.js ${filename} --confirm-reset-local-data`);
  process.exitCode = 2;
} else {
  const db = createDatabase(filename);
  try {
    resetKnownDemoData(db);
    console.log(`Reset complete: ${filename}`);
  } finally {
    db.close();
  }
}
