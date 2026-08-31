import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { wasm } from '@rollup/plugin-wasm';
import { viteStaticCopy } from 'vite-plugin-static-copy';
import { vanillaExtractPlugin } from '@vanilla-extract/vite-plugin';
import { NodeGlobalsPolyfillPlugin } from '@esbuild-plugins/node-globals-polyfill';
import inject from '@rollup/plugin-inject';
import topLevelAwait from 'vite-plugin-top-level-await';
import { VitePWA } from 'vite-plugin-pwa';
import fs from 'fs';
import path from 'path';
import buildConfig from './build.config.ts';
const pkg = JSON.parse(fs.readFileSync(new URL('./package.json', import.meta.url), 'utf-8'));

const copyFiles = {
  targets: [
    {
      src: 'node_modules/@element-hq/element-call-embedded/dist/**/*',
      dest: 'public/element-call',
      rename: { stripBase: 4 },
    },
    {
      src: 'node_modules/pdfjs-dist/build/pdf.worker.min.mjs',
      dest: '',
      rename: { stripBase: true, name: 'pdf.worker.min.js' },
    },
    {
      src: 'netlify.toml',
      dest: '',
    },
    {
      src: 'config.json',
      dest: '',
    },
    {
      src: 'public/manifest.json',
      dest: '',
      rename: { stripBase: true },
    },
    {
      src: 'public/favicon.ico',
      dest: '',
      rename: { stripBase: true },
    },
    {
      src: 'public/res/android',
      dest: '',
    },
    {
      src: 'public/res/apple',
      dest: '',
    },
    {
      src: 'public/locales',
      dest: '',
    },
    {
      src: 'public/offline.html',
      dest: '',
      rename: { stripBase: true },
    },
  ],
};

function serverMatrixSdkCryptoWasm(wasmFilePath) {
  return {
    name: 'vite-plugin-serve-matrix-sdk-crypto-wasm',
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        if (req.url === wasmFilePath) {
          const resolvedPath = path.join(
            path.resolve(),
            '/node_modules/@matrix-org/matrix-sdk-crypto-wasm/pkg/matrix_sdk_crypto_wasm_bg.wasm',
          );

          if (fs.existsSync(resolvedPath)) {
            res.setHeader('Content-Type', 'application/wasm');
            res.setHeader('Cache-Control', 'no-cache');

            const fileStream = fs.createReadStream(resolvedPath);
            fileStream.pipe(res);
          } else {
            res.writeHead(404);
            res.end('File not found');
          }
        } else {
          next();
        }
      });
    },
  };
}

function fixManifestBase() {
  let base = buildConfig.base;
  return {
    name: 'fix-manifest-base',
    configResolved(config) {
      base = config.base;
    },
    transformIndexHtml(html) {
      if (base === '/') return html;
      const baseWithSlash = base.endsWith('/') ? base : `${base}/`;
      let out = html;
      out = out.replaceAll('href="/manifest.json"', `href="${baseWithSlash}manifest.json"`);
      out = out.replaceAll('href="/favicon.ico"', `href="${baseWithSlash}favicon.ico"`);
      return out;
    },
  };
}

function securityHeaders() {
  return {
    name: 'security-headers',
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        res.setHeader(
          'Permissions-Policy',
          'camera=(self), microphone=(self), display-capture=(self), geolocation=(), payment=(), usb=()',
        );
        next();
      });
    },
    transformIndexHtml(html) {
      if (!html.includes('Permissions-Policy')) {
        return html.replace(
          '</head>',
          '  <meta http-equiv="Permissions-Policy" content="camera=(self), microphone=(self), display-capture=(self), geolocation=(), payment=(), usb=()" />\n  </head>',
        );
      }
      return html;
    },
  };
}

export default defineConfig({
  appType: 'spa',
  publicDir: false,
  base: buildConfig.base,
  define: {
    __APP_VERSION__: JSON.stringify(pkg.version),
  },
  resolve: {
    alias: [{ find: /^folds$/, replacement: path.resolve('./src/app/utils/folds-animated.ts') }],
  },
  server: {
    port: 8080,
    host: true,
    fs: {
      allow: ['.'],
    },
  },
  plugins: [
    securityHeaders(),
    fixManifestBase(),
    serverMatrixSdkCryptoWasm('/node_modules/.vite/deps/pkg/matrix_sdk_crypto_wasm_bg.wasm'),
    topLevelAwait({
      // The export name of top-level await promise for each chunk module
      promiseExportName: '__tla',
      // The function to generate import names of top-level await promise in each chunk module
      promiseImportName: (i) => `__tla_${i}`,
    }),
    viteStaticCopy(copyFiles),
    vanillaExtractPlugin(),
    wasm(),
    react(),
    VitePWA({
      srcDir: 'src',
      filename: 'sw.ts',
      strategies: 'injectManifest',
      injectRegister: false,
      manifest: false,
      injectManifest: {
        injectionPoint: 'self.__WB_MANIFEST',
        globPatterns: ['**/*.{js,css,html,woff2,ttf,svg,png,ico,json}'],
        maximumFileSizeToCacheInBytes: 5 * 1024 * 1024,
      },
      devOptions: {
        enabled: false,
      },
    }),
  ],
  optimizeDeps: {
    rolldownOptions: {
      plugins: [
        NodeGlobalsPolyfillPlugin({
          process: false,
          buffer: true,
        }),
      ],
    },
  },
  build: {
    target: 'esnext',
    outDir: 'dist',
    sourcemap: false,
    copyPublicDir: false,
    rollupOptions: {
      plugins: [inject({ Buffer: ['buffer', 'Buffer'] })],
      output: {
        manualChunks: (id) => {
          if (
            id.includes('node_modules/react/') ||
            id.includes('node_modules/react-dom/') ||
            id.includes('node_modules/react-router-dom/')
          )
            return 'vendor';
          if (
            id.includes('node_modules/matrix-js-sdk/') ||
            id.includes('node_modules/matrix-widget-api/')
          )
            return 'matrix';
          if (
            id.includes('node_modules/folds/') ||
            id.includes('node_modules/@vanilla-extract/css/') ||
            id.includes('node_modules/classnames/')
          )
            return 'ui';
          if (
            id.includes('node_modules/slate/') ||
            id.includes('node_modules/slate-react/') ||
            id.includes('node_modules/slate-history/') ||
            id.includes('node_modules/slate-dom/')
          )
            return 'editor';
          return undefined;
        },
      },
    },
    chunkSizeWarningLimit: 1000,
  },
});
