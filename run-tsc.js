const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

try {
  const output = execSync('npx tsc --noEmit 2>&1', { 
    cwd: 'C:\\dray-web',
    encoding: 'utf-8',
    maxBuffer: 10 * 1024 * 1024
  });
  console.log(output);
} catch (error) {
  console.log(error.stdout || error.message || error);
  process.exit(0);
}
