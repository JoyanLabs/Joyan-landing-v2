/**
 * SVGO config for dither source art (docs/DESIGN.md — Asset generation workflow).
 *
 * Run: pnpm dlx svgo --config scripts/svgo.config.mjs --folder scripts/dither-src
 *
 * Keeps viewBox and ids stable (sources reference url(#...) patterns and the
 * pipeline derives aspect from viewBox), and leaves hidden decorative layers
 * alone. All other preset-default optimizations apply.
 */
export default {
  multipass: true,
  plugins: [
    {
      name: 'preset-default',
      params: {
        overrides: {
          removeViewBox: false,
          removeHiddenElems: false,
          cleanupIds: false,
        },
      },
    },
  ],
};
