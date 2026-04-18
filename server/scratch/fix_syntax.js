const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '..', 'server.js');
let content = fs.readFileSync(filePath, 'utf8');

const target = "            content TEXT DEFAULT '',\n    // Schema is managed via schema.sql. Redundant ALTER TABLE statements removed.";
const replacement = `            content TEXT DEFAULT '',
            show_in_nav BOOLEAN DEFAULT true,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
    \`);

    // Schema is managed via schema.sql. Redundant ALTER TABLE statements removed.`;

if (content.includes(target)) {
    content = content.replace(target, replacement);
    fs.writeFileSync(filePath, content);
    console.log('Successfully fixed syntax error in server.js');
} else {
    // Try without the newline for safety
    const target2 = "            content TEXT DEFAULT '',";
    const replacement2 = `            content TEXT DEFAULT '',
            show_in_nav BOOLEAN DEFAULT true,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
    \`);`;
    
    // This is more risky, so we verify we are in the right place
    if (content.indexOf(target2) !== -1 && content.indexOf("// Schema is managed via schema.sql") !== -1) {
         content = content.replace(target2, replacement2);
         fs.writeFileSync(filePath, content);
         console.log('Successfully fixed syntax error in server.js (using fallback)');
    } else {
        console.error('Target content not found in server.js');
    }
}
