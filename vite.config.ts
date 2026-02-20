/// <reference types="vitest" />
import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

import { VitePWA } from 'vite-plugin-pwa';
import { visualizer } from 'rollup-plugin-visualizer';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  return {
    base: '/korfstat-pro/',
    server: {
      port: 3000,
      host: '0.0.0.0',
    },
    plugins: [
      react(),
      visualizer({
        filename: './dist/stats.html',
        open: false,
        gzipSize: true,
        brotliSize: true,
      }),
      VitePWA({
        registerType: 'autoUpdate',
        includeAssets: ['favicon.ico', 'apple-touch-icon.png', 'masked-icon.svg'],
        manifest: {
          name: 'KorfStat Pro',
          short_name: 'KorfStat',
          description: 'Professional Korfball Statistics Tracker',
          theme_color: '#4f46e5',
          background_color: '#ffffff',
          display: 'standalone',
          icons: [
            {
              src: 'pwa-192x192.png',
              sizes: '192x192',
              type: 'image/png'
            },
            {
              src: 'pwa-512x512.png',
              sizes: '512x512',
              type: 'image/png'
            }
          ]
        }
      })
    ],
    build: {
      rollupOptions: {
        output: {
          manualChunks: {
            // Split vendor code from app code
            'vendor-react': ['react', 'react-dom'],
            'vendor-socket': ['socket.io-client'],
            'vendor-charts': ['recharts'],
            'vendor-pdf': ['jspdf'],
            'vendor-excel': ['xlsx'],
            'vendor-ui': ['lucide-react'],
          }
        }
      },
      // Increase chunk size warning limit for large components
      chunkSizeWarningLimit: 1000,
      // Enable minification
      minify: 'terser',
      terserOptions: {
        compress: {
          drop_console: mode === 'production', // Remove console.log in production
        }
      }
    },
    test: {
      globals: true,
      environment: 'jsdom',
      setupFiles: './test/setup.ts',
      coverage: {
        provider: 'v8',
        reporter: ['text', 'json', 'html', 'lcov'],
        exclude: [
          'node_modules/',
          'test/',
          '**/*.test.ts',
          '**/*.test.tsx',
          '**/types.ts',
          'vite.config.ts',
          'server/index.js',
        ],
        statements: 70,
        branches: 65,
        functions: 70,
        lines: 70,
      },
    },
    define: {
      'process.env.API_KEY': JSON.stringify(env.GEMINI_API_KEY),
      'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY)
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      }
    }
  };
});
