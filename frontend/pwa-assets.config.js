import { defineConfig } from '@vite-pwa/assets-generator/config';

export default defineConfig({
  preset: {
    transparent: {
      sizes: [64, 192, 512],
      favicons: [[48, 'favicon.ico']],
    },
    maskable: {
      sizes: [512],
      resizeOptions: { background: '#ffffff', fit: 'contain', kernel: 'lanczos3' },
      padding: 0.1,
    },
    apple: {
      sizes: [180],
      resizeOptions: { background: '#ffffff', fit: 'contain', kernel: 'lanczos3' },
      padding: 0.1,
    },
  },
  images: ['public/logo-icon.png'],
});
