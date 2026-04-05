/// <reference types="vitest" />
import path from 'path';
import { loadEnv } from 'vite';
import { defineConfig, configDefaults } from 'vitest/config';
import react from '@vitejs/plugin-react';

import { VitePWA } from 'vite-plugin-pwa';
import { visualizer } from 'rollup-plugin-visualizer';

import { watchSyncPlugin } from './config/vite-plugins/watch-sync';

export default defineConfig(({ command, mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  
  const plugins = [
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
  ];

  if (command === 'serve') {
    plugins.push(watchSyncPlugin);
  }

  return {
    base: './',
    server: {
      port: 3000,
      host: '0.0.0.0',
      proxy: {
        '/api': {
          target: 'http://localhost:3002',
          changeOrigin: true,
        },
        '/socket.io': {
            target: 'http://localhost:3002',
            ws: true,
        },
      },
    },
    plugins,
    build: {
      rollupOptions: {
        output: {
          manualChunks: {
            'vendor-react': ['react', 'react-dom'],
            'vendor-socket': ['socket.io-client'],
            'vendor-charts': ['recharts'],
            'vendor-pdf': ['jspdf'],
            'vendor-excel': ['xlsx'],
            'vendor-ui': ['lucide-react'],
          }
        }
      },
      chunkSizeWarningLimit: 1000,
      minify: 'terser',
      terserOptions: {
        compress: {
          drop_console: mode === 'production',
        }
      }
    },
    test: {
      globals: true,
      environment: 'jsdom',
      setupFiles: './test/setup.ts',
      exclude: [...configDefaults.exclude, 'tests/**'],
      coverage: {
        provider: 'v8',
        reporter: ['text', 'json', 'html', 'lcov'],
        exclude: [
          ...configDefaults.coverage.exclude || [],
          'test/',
          'tests/**',
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
