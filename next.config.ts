/** @type {import('next').NextConfig} */
const nextConfig = {
  // REMOVED: serverComponentsExternalPackages is no longer a recognized option in Next.js 15+

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
