import resolve from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';
import terser from '@rollup/plugin-terser';
import typescript from '@rollup/plugin-typescript';
import filesize from 'rollup-plugin-filesize';
import { visualizer } from 'rollup-plugin-visualizer';

const pkg = require('./package.json');

const banner = `/*!
 * ${pkg.name} v${pkg.version}
 * ${pkg.description}
 * 
 * Author: ${pkg.author.name}
 * License: ${pkg.license}
 * Homepage: ${pkg.homepage}
 * 
 * Telegram: ${pkg.social.telegram}
 * TikTok: ${pkg.social.tiktok}
 * Donate: ${pkg.social.donate}
 * 
 * Copyright (c) ${new Date().getFullYear()} ${pkg.author.name}
 */`;

const input = 'src/index.js';

// Common plugins
const commonPlugins = [
  resolve({
    browser: true,
    preferBuiltins: false
  }),
  commonjs(),
  filesize({
    showMinifiedSize: true,
    showGzippedSize: true,
    showBrotliSize: true
  })
];

// Development build
const devConfig = {
  input,
  output: [
    {
      file: pkg.main,
      format: 'cjs',
      banner,
      exports: 'auto',
      sourcemap: true
    },
    {
      file: pkg.module,
      format: 'es',
      banner,
      sourcemap: true
    },
    {
      file: pkg.browser,
      format: 'umd',
      name: 'Kompreser',
      banner,
      sourcemap: true,
      globals: {}
    }
  ],
  plugins: [
    ...commonPlugins,
    visualizer({
      filename: 'dist/stats.html',
      open: false,
      gzipSize: true,
      brotliSize: true
    })
  ]
};

// Production build (minified)
const prodConfig = {
  input,
  output: [
    {
      file: 'dist/kompreser.min.js',
      format: 'umd',
      name: 'Kompreser',
      banner,
      sourcemap: true,
      globals: {}
    },
    {
      file: 'dist/kompreser.esm.min.js',
      format: 'es',
      banner,
      sourcemap: true
    }
  ],
  plugins: [
    ...commonPlugins,
    terser({
      compress: {
        drop_console: false,
        drop_debugger: true,
        pure_funcs: ['console.debug']
      },
      mangle: {
        keep_fnames: true,
        keep_classnames: true
      },
      format: {
        comments: /^!/
      }
    })
  ]
};

// Library build (for CDN)
const libConfig = {
  input,
  output: [
    {
      file: 'dist/kompreser.lib.js',
      format: 'iife',
      name: 'Kompreser',
      banner,
      sourcemap: true
    },
    {
      file: 'dist/kompreser.lib.min.js',
      format: 'iife',
      name: 'Kompreser',
      banner,
      sourcemap: true,
      plugins: [terser()]
    }
  ],
  plugins: commonPlugins
};

// Modern build (ES2020+)
const modernConfig = {
  input,
  output: {
    file: 'dist/kompreser.modern.js',
    format: 'es',
    banner,
    sourcemap: true
  },
  plugins: [
    ...commonPlugins,
    {
      renderStart() {
        this.warn('Building modern ES2020+ version');
      }
    }
  ]
};

// Node.js build
const nodeConfig = {
  input,
  output: {
    file: 'dist/kompreser.node.js',
    format: 'cjs',
    banner,
    sourcemap: true,
    exports: 'auto'
  },
  plugins: [
    resolve({
      preferBuiltins: true
    }),
    commonjs(),
    filesize()
  ],
  external: ['canvas', 'sharp']
};

// Export configurations
export default [
  devConfig,
  prodConfig,
  libConfig,
  modernConfig,
  nodeConfig
];