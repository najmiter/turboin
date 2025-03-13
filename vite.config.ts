import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
  build: {
    rollupOptions: {
      input: {
        // main: resolve(__dirname, 'src/popup/popup.html'),
        background: resolve(__dirname, 'src/background.ts'),
        content: resolve(__dirname, 'src/content.ts'),
        popup: resolve(__dirname, 'src/popup/popup.ts'),
      },
      output: {
        entryFileNames: (chunkInfo) => {
          return chunkInfo.name === 'popup'
            ? 'src/popup/[name].js'
            : 'src/[name].js';
        },
      },
    },
    outDir: 'dist',
    emptyOutDir: true,
  },
});
