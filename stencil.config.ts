import { Config } from '@stencil/core';
import builtins from 'rollup-plugin-node-builtins';

export const config: Config = {
  namespace: 'omega-topology-graph',
  outputTargets: [
    {
      type: 'dist',
      esmLoaderPath: '../loader'
    },
    {
      type: 'docs-readme'
    },
    {
      type: 'www',
      serviceWorker: null // disable service workers
    }
  ],
  plugins: [
    builtins()
  ],
  nodeResolve: {
    browser: true,
    preferBuiltins: true // Workaround for https://github.com/ionic-team/stencil/issues/1326
  },
  globalStyle: 'src/global/style.css'
};
