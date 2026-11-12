// Inlines CSS and JS into a single preview file: node tools/build-preview.js <out.html>
const fs = require('fs'), path = require('path');
const root = path.join(__dirname, '..');
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const between = (a, b) => html.split(a)[1].split(b)[0];
const css = fs.readFileSync(path.join(root, 'assets/css/style.css'), 'utf8');
const js = [...html.matchAll(/<script src="([^"]+)"><\/script>/g)].map(m => m[1]).filter(u => !/^https?:/.test(u)).map(u => fs.readFileSync(path.join(root, u), 'utf8')).join('\n;\n').replace("bookingMode: 'request'", "bookingMode: 'demo'").replace('showStaffMenu: false', 'showStaffMenu: true').replace('allowPrint: true', 'allowPrint: false').replace(/api: '[^']*',/, "api: '',"); // the preview always shows the full demo
const cdn = [...html.matchAll(/<script src="(https:[^"]+)"><\/script>/g)].map(m => m[0]).join('\n');
const out = between('<!--PREVIEW-HEAD-START-->', '<!--PREVIEW-HEAD-END-->') + `<style>\n${css}\n</style>\n` + between('<!--PREVIEW-BODY-START-->', '<!--PREVIEW-BODY-END-->') + cdn + `\n<script>\n${js.replace(/<\/script/gi, '<\\/script')}\n</script>\n`;
fs.writeFileSync(process.argv[2] || path.join(root, 'preview.html'), out);
console.log('wrote', out.length, 'bytes');
