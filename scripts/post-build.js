import { mkdir, copyFile } from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');
const distDir = path.join(rootDir, 'dist');
const iconDir = path.join(distDir, 'icons');

async function copyAssets() {
  try {
    // Create icons directory if it doesn't exist
    await mkdir(iconDir, { recursive: true });

    // Copy manifest file to dist
    await copyFile(
      path.join(rootDir, 'manifest.json'),
      path.join(distDir, 'manifest.json')
    );
    await copyFile(
      path.join(rootDir, 'src/icons', 'icon.jpg'),
      path.join(iconDir, 'icon.jpg')
    );

    console.log('Extension assets copied successfully.');
  } catch (error) {
    console.error('Error copying extension assets:', error);
    process.exit(1);
  }
}

copyAssets();
