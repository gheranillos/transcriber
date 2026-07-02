import { build } from 'esbuild';

const targets = [
  { name: 'background', entry: 'src/background/background.js', format: 'esm' },
  { name: 'content', entry: 'src/content/content.js', format: 'iife' },
  { name: 'offscreen', entry: 'src/offscreen/offscreen.js', format: 'esm' },
];

for (const target of targets) {
  await build({
    entryPoints: [target.entry],
    bundle: true,
    outfile: `dist/${target.name}.js`,
    format: target.format,
    target: 'chrome110',
  });
}

console.log('Build complete.');
