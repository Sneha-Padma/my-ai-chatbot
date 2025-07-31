// next.config.js
/** @type {import('next').NextConfig} */
const nextConfig = {
  webpack(config) {
    config.resolve.extensions.push('.mjs');

    // Prevent build errors from Node-only modules like 'canvas', 'fs', etc.
    config.resolve.fallback = {
      ...config.resolve.fallback,
      fs: false,
      path: false,
      canvas: false,
    };

    return config;
  },
};

module.exports = nextConfig;
