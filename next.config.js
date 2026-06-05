/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'export',
  trailingSlash: true,
  images: { unoptimized: true },

  // Next.js 14 key for keeping packages out of the server bundle
  experimental: {
    serverComponentsExternalPackages: ['mammoth', 'pdf2json'],
  },
};
module.exports = nextConfig;
