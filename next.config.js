/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'export',
  trailingSlash: true,
  images: { unoptimized: true },

  // Next.js 14 key for keeping packages out of the server bundle
  experimental: {
    serverComponentsExternalPackages: ['mammoth', 'pdfjs-dist'],
  },

  webpack: (config, { isServer }) => {
    if (isServer) {
      config.resolve.alias = { ...config.resolve.alias, canvas: false };
    }
    return config;
  },
};
module.exports = nextConfig;
