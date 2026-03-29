const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'src', 'components', 'DeliveryFormModal.jsx');
let content = fs.readFileSync(filePath, 'utf8');

// Remove the orphaned invoice lines that were left from the old section
// These appear after the flag section closes and before </section>
const orphanPattern = /(\s+<\/div>\s+\)}\s+)([ \t]+<label>Invoice Number<\/label>\s+<input[^>]+INV-12345[^>]+\/>\s+<\/div>\s+)(<\/section>)/;
content = content.replace(orphanPattern, '$1$3');

fs.writeFileSync(filePath, content, 'utf8');
console.log('Fixed! Lines removed successfully.');
console.log('File size:', fs.statSync(filePath).size, 'bytes');
