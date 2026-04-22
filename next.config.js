/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**.supabase.co',
      },
      {
        protocol: 'https',
        hostname: '**.openrouter.ai',
      },
      {
        protocol: 'https',
        hostname: 'seedream-images.bj.bytedance.com',
      },
    ],
  },
}

module.exports = nextConfig