const postcss = require('postcss');
const fs = require('fs');
const path = require('path');

const input = './styles.css';
const output = './dist/styles.css';

// Ensure dist directory exists
if (!fs.existsSync('./dist')) {
  fs.mkdirSync('./dist', { recursive: true });
}

const css = fs.readFileSync(input, 'utf8');

const config = require('./postcss.config.js');

postcss(Object.entries(config.plugins).map(([name, opts]) => {
  const plugin = require(name);
  return plugin(opts);
}))
  .process(css, { from: input, to: output })
  .then(result => {
    fs.writeFileSync(output, result.css);
    if (result.map) {
      fs.writeFileSync(output + '.map', result.map.toString());
    }
    console.log(`✓ CSS built: ${output}`);
  })
  .catch(err => {
    console.error('Error building CSS:', err);
    process.exit(1);
  });
