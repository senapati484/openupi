import { defineConfig } from 'tsup';

export default defineConfig({
  entry: {
    index: 'src/index.ts',
    'node/index': 'src/node/index.ts',
    'react/index': 'src/react/index.ts'
  },
  format: ['cjs', 'esm'],
  dts: true,
  clean: true,
  minify: true,
  sourcemap: true,
  external: ['react', 'react-dom'],
  esbuildOptions: (opts) => {
    opts.jsx = 'automatic';
  }
});
