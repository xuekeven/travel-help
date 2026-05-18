import type { NextConfig } from 'next'
import { BASE_PATH } from './lib/base-path'

const nextConfig: NextConfig = {
  basePath: BASE_PATH,
  serverExternalPackages: ['node-cron'],
}

export default nextConfig
