import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig} from 'vite';

export default defineConfig(() => {
  return {
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, 'src'),
      },
    },
    server: {
      watch: { ignored: [path.resolve('.local-setup').replace(/\\/g, '/') + '/**'] },
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      hmr: process.env.DISABLE_HMR !== 'true',
    },
    build: {
      rollupOptions: {
        output: {
          manualChunks(id) {
            if (id.includes('node_modules')) {
              if (id.includes('motion') || id.includes('framer-motion')) return 'motion';
              if (id.includes('gsap')) return 'gsap';
              if (id.includes('lucide-react') || id.includes('react-icons')) return 'icons';
              if (id.includes('react-dom') || id.includes('react-router')) return 'react-vendor';
            }
          },
        },
      },
    },
  };
});