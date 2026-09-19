import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  assetPrefix: process.env.NODE_ENV === 'production' ? '/travel' : undefined,
  serverExternalPackages: ['node-cron'],
}

export default nextConfig
