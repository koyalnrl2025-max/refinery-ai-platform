/** @type {import('next').NextConfig} */
const nextConfig = {
  // Keep these native Node.js packages out of the webpack bundle
  serverExternalPackages: ['mammoth', 'pdfjs-dist'],

  webpack: (config, { isServer }) => {
    if (isServer) {
      // pdfjs-dist optionally requires 'canvas' for image rendering.
      // We only need text extraction — stub it out so webpack doesn't error.
      config.resolve.alias = {
        ...config.resolve.alias,
        canvas: false,
      };
    }
    return config;
  },
};
module.exports = nextConfig;
