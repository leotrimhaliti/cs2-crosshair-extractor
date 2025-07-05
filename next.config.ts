/** @type {import('next').NextConfig} */
const nextConfig = {
  // serverComponentsExternalPackages is for Server Components, API routes are different
  // We need to ensure demoparser2 is bundled correctly for the API route.
  // The webpack config below handles native modules for server-side code (including API routes).
  serverComponentsExternalPackages: [], // Remove demoparser2 from here if it was present

  webpack: (config, { isServer }) => {
    if (isServer) {
      // Ensure demoparser2 is treated as an external commonjs module for server-side bundling
      // This prevents webpack from trying to bundle the native .node file directly
      const originalExternals = config.externals;

      config.externals = [
        ({ request }, callback) => {
          if (request === '@laihoe/demoparser2') {
            return callback(null, `commonjs ${request}`);
          }
          callback();
        },
        ...(Array.isArray(originalExternals) ? originalExternals : [originalExternals]),
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

export default nextConfig;
