const fs = require('fs');

const directories = [
    'C:\\Dray-web\\prisma',
    'C:\\Dray-web\\src\\app\\api\\auth\\[...nextauth]',
    'C:\\Dray-web\\src\\app\\api\\projects\\[id]',
    'C:\\Dray-web\\src\\app\\api\\upload',
    'C:\\Dray-web\\src\\app\\api\\collab',
    'C:\\Dray-web\\src\\lib\\collab',
    'C:\\Dray-web\\public\\uploads',
    'C:\\Dray-web\\src\\components\\daw\\auth'
];

directories.forEach(dir => {
    try {
        fs.mkdirSync(dir, { recursive: true });
        console.log(`✓ Created: ${dir}`);
    } catch (err) {
        console.error(`✗ Error creating ${dir}:`, err.message);
    }
});

console.log('\nAll directories processed!');
