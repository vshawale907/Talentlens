const { execSync } = require('child_process');
const fs = require('fs');
const out = execSync('npx tsx src/scripts/calibration.ts', { encoding: 'utf-8' });
fs.writeFileSync('utf8_output.txt', out);
