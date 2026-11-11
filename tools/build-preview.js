// Inlines CSS and JS into a single preview file: node tools/build-preview.js <out.html>
const fs = require('fs'), path = require('path');
const root = path.join(__dirname, '..');
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const between = (a, b) => html.split(a)[1].split(b)[0];
const css = fs.readFileSync(path.join(root, 'assets/css/style.css'), 'utf8');
const js = [...html.matchAll(/<script src="([^"]+)"><\/script>/g)].map(m => fs.readFileSync(path.join(root, m[1]), 'utf8')).join('\n;\n');
const out = between('<!--PREVIEW-HEAD-START-->', '<!--PREVIEW-HEAD-END-->') + `<style>\n${css}\n</style>\n` + between('<!--PREVIEW-BODY-START-->', '<!--PREVIEW-BODY-END-->') + `<script>\n${js.replace(/<\/script/gi, '<\\/script')}\n</script>\n`;
fs.writeFileSync(process.argv[2] || path.join(root, 'preview.html'), out);
console.log('wrote', out.length, 'bytes');
