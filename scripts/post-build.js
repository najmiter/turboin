import { mkdir, copyFile } from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');
const distDir = path.join(rootDir, 'dist');
const iconDir = path.join(distDir, 'icons');
const popupDir = path.join(distDir, 'src/popup');

async function copyAssets() {
  try {
    await mkdir(iconDir, { recursive: true });
    await mkdir(popupDir, { recursive: true });

    await copyFile(
      path.join(rootDir, 'manifest.json'),
      path.join(distDir, 'manifest.json')
    );

    await copyFile(
      path.join(rootDir, 'src/icons', 'icon.png'),
      path.join(iconDir, 'icon.png')
    );

    await copyFile(
      path.join(rootDir, 'src/popup', 'popup.html'),
      path.join(popupDir, 'popup.html')
    );

    await copyFile(
      path.join(rootDir, 'src/popup', 'style.css'),
      path.join(popupDir, 'style.css')
    );

    console.log('Extension assets copied successfully.');
  } catch (error) {
    console.error('Error copying extension assets:', error);
    process.exit(1);
  }
}

copyAssets();
