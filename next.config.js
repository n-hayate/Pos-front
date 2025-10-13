// next.config.js
require('dotenv').config();
/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  reactStrictMode: false,

  // /next/* で来たものは /_next/* に繋ぎ替える
  async rewrites() {
    return [{ source: '/next/:path*', destination: '/_next/:path*' }];
  },

  // 必要に応じて配信プレフィックスを環境変数で切り替え可能に
  assetPrefix: process.env.NEXT_ASSET_PREFIX || undefined,
};

module.exports = nextConfig;
