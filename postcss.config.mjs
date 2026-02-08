/** @type {import('postcss-load-config').Config} */
const config = {
  plugins: {
    '@csstools/postcss-oklab-function': { preserve: true },
    tailwindcss: {},
  },
};

export default config;
