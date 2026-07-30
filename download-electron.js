const { downloadArtifact } = require('@electron/get');
const extract = require('extract-zip');
const fs = require('fs');
const path = require('path');

async function go() {
  console.log('Downloading Electron...');
  const zipPath = await downloadArtifact({
    version: '34.5.8',
    artifactName: 'electron',
    platform: 'darwin',
    arch: 'arm64',
    force: true
  });
  console.log('Downloaded to', zipPath);
  
  const distPath = path.join(__dirname, 'node_modules', 'electron', 'dist');
  fs.mkdirSync(distPath, { recursive: true });
  
  console.log('Extracting...');
  await extract(zipPath, { dir: distPath });
  
  const pathTxt = path.join(__dirname, 'node_modules', 'electron', 'path.txt');
  fs.writeFileSync(pathTxt, 'Electron.app/Contents/MacOS/Electron');
  console.log('Done! Wrote path.txt');
}

go().catch(console.error);
