/** @type {import('next').NextConfig} */
const nextConfig = {
  // If you were using serverComponentsExternalPackages before for @laihoe/demoparser2,
  // it is a valid option in Next.js 14.x. However, the webpack rule below
  // generally handles native modules correctly by making them external.
  // If you still encounter issues related to demoparser2 after fixing this config,
  // you might consider uncommenting and using this as well:
  // serverComponentsExternalPackages: ['@laihoe/demoparser2'],

  webpack: (config, { isServer }) => {
    if (isServer) {
      // Ensure demoparser2 is treated as an external commonjs module for server-side bundling
      // This prevents webpack from trying to bundle the native .node file directly
      const originalExternals = config.externals;

      // Ensure originalExternals is always an array
      const externalsArray = Array.isArray(originalExternals)
        ? originalExternals
        : typeof originalExternals === 'function'
          ? [originalExternals]
          : []; // Handle null/undefined or other types

      config.externals = [
        ({ request }, callback) => {
          if (request === '@laihoe/demoparser2') {
            return callback(null, `commonjs ${request}`);
          }
          callback();
        },
        ...externalsArray,
      ];

      // Rule to handle .node files (native modules)
      // This ensures that the .node binary is copied to the build output
      config.module.rules.push({
        test: /\.node$/,
        type: 'asset/resource',
        generator: {
          filename: 'static/[name][ext]', // Output to static/ directory
        },
      });
    }
    return config;
  },

  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
};

module.exports = nextConfig; // Changed from export default