const { execSync } = require('child_process');

try {
  const output = execSync('npx tsc --noEmit', {
    cwd: 'C:\\dray-web',
    encoding: 'utf8',
    stdio: 'pipe',
    maxBuffer: 10 * 1024 * 1024
  });
  console.log(output || 'No errors');
} catch (error) {
  const output = error.stdout ? error.stdout.toString('utf8') : '';
  const stderr = error.stderr ? error.stderr.toString('utf8') : '';
  const combined = (output + stderr).split('\n').slice(0, 80).join('\n');
  console.log(combined || error.message);
}
