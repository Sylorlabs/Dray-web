// Run this script to create all necessary directories for the backend
// Usage: node setup-backend.js
const fs = require('fs');
const path = require('path');

const dirs = [
  'prisma',
  'src/app/api/auth/[...nextauth]',
  'src/app/api/projects/[id]',
  'src/app/api/upload',
  'src/app/api/collab',
  'src/lib/collab',
  'public/uploads',
  'src/components/daw/auth',
];

dirs.forEach(d => {
  const full = path.join(__dirname, d);
  fs.mkdirSync(full, { recursive: true });
  console.log('Created:', full);
});

console.log('\nAll directories created. Now run: npm install');
