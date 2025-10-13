// next.config.js
module.exports = {
  output: 'standalone',
  reactStrictMode: false,
  async rewrites() {
    // Azureなどで /_next が /next に変換されるケース対策
    return [{ source: '/next/:path*', destination: '/_next/:path*' }];
  },
};
