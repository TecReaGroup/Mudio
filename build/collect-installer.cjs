// electron-builder hook: copies only the installers from temp/package into release/,
// leaving unpacked apps, blockmaps and builder logs behind as intermediates.
const fs = require('node:fs');
const path = require('node:path');

const RELEASE_DIRECTORY = path.resolve(__dirname, '../release');
const INSTALLER_EXTENSIONS = new Set(['.exe', '.dmg', '.AppImage']);

exports.default = async function collectInstaller({ artifactPaths }) {
  fs.rmSync(RELEASE_DIRECTORY, { recursive: true, force: true });
  fs.mkdirSync(RELEASE_DIRECTORY, { recursive: true });
  for (const artifactPath of artifactPaths.filter(artifact => INSTALLER_EXTENSIONS.has(path.extname(artifact)))) {
    fs.copyFileSync(artifactPath, path.join(RELEASE_DIRECTORY, path.basename(artifactPath)));
    console.log(`Collected installer ${path.basename(artifactPath)} into release/`);
  }
  return [];
};
