import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import { exec } from 'child_process';

import { VitePWA } from 'vite-plugin-pwa';
import { visualizer } from 'rollup-plugin-visualizer';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  
  const watchSyncPlugin = {
    name: 'watch-sync-mock',
    configureServer(server: any) {
      server.middlewares.use('/api/sync-watch', (req: any, res: any) => {
        if (req.method !== 'POST') return;
        let body = '';
        req.on('data', (chunk: any) => body += chunk.toString());
        req.on('end', () => {
          try {
            const data = JSON.parse(body);
            const adbPath = process.env.HOME ? `${process.env.HOME}/Library/Android/sdk/platform-tools/adb` : 'adb';
            let cmd = `${adbPath} shell am broadcast -a com.korfstat.UPDATE_STATE`;
            if (data.homeScore !== undefined) cmd += ` --ei homeScore ${data.homeScore}`;
            if (data.awayScore !== undefined) cmd += ` --ei awayScore ${data.awayScore}`;
            if (data.gameTime !== undefined) cmd += ` --el gameTime ${data.gameTime}`;
            if (data.shotClock !== undefined) cmd += ` --el shotClock ${data.shotClock}`;
            if (data.isGameTimeRunning !== undefined) cmd += ` --ez isGameTimeRunning ${data.isGameTimeRunning}`;
            if (data.isShotClockRunning !== undefined) cmd += ` --ez isShotClockRunning ${data.isShotClockRunning}`;
            if (data.period !== undefined) cmd += ` --ei period ${data.period}`;
            if (data.subPending !== undefined) cmd += ` --ez subPending ${data.subPending}`;
            if (data.latestSubId !== undefined) cmd += ` --es latestSubId "${data.latestSubId}"`;
            if (data.subOut !== undefined) cmd += ` --es subOut "${data.subOut}"`;
            if (data.subIn !== undefined) cmd += ` --es subIn "${data.subIn}"`;
            if (data.watchControlMode !== undefined) {
                const isReadOnly = data.watchControlMode === 'read-only';
                cmd += ` --ez isReadOnly ${isReadOnly}`;
            }
            
            const tTeam = data.timeoutTeam || "NONE";
            cmd += ` --es timeoutTeam "${tTeam}"`;
            
            if (data.hapticSignal !== undefined) {
                cmd += ` --es hapticSignal "${data.hapticSignal}"`;
            }
            if (data.hapticSignalId !== undefined) {
                cmd += ` --es hapticSignalId "${data.hapticSignalId}"`;
            }

            exec(cmd, (error) => {
              res.setHeader('Content-Type', 'application/json');
              if (error) {
                res.statusCode = 500;
                res.end(JSON.stringify({ error: error.message }));
              } else {
                res.statusCode = 200;
                res.end(JSON.stringify({ success: true }));
              }
            });
          } catch(e) {
             res.statusCode = 400;
             res.end(JSON.stringify({ error: 'Bad Request' }));
          }
        });
      });
    }
  };

  return {
    base: './',
    server: {
      port: 3000,
      host: '0.0.0.0',
    },
    plugins: [
      react(),
      watchSyncPlugin,
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
