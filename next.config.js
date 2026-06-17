/** @type {import('next').NextConfig} */
const nextConfig = {
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          // Cho phép sketchus.de nhúng qua iframe
          {
            key: 'X-Frame-Options',
            value: 'ALLOW-FROM https://sketchus.de',
          },
          {
            key: 'Content-Security-Policy',
            value: "frame-ancestors 'self' https://sketchus.de https://*.myshopify.com",
          },
        ],
      },
    ];
  },
};

module.exports = nextConfig;
