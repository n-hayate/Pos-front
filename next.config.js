// next.config.js
module.exports = {
  output: 'standalone',
  reactStrictMode: false,
  async rewrites() {
    // 万一、上流で /_next → /next に変換されても拾えるように
    return [{ source: '/next/:path*', destination: '/_next/:path*' }];
  },
};
