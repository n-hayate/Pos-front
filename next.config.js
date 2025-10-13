require('dotenv').config()
/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  // ↓ この行を追加してください
  reactStrictMode: false, 
}

module.exports = nextConfig