/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,
  
  // 支持自定义域名和API配置
  env: {
    CUSTOM_DOMAIN: 'zhengshu.yuexinjiance.top',
    WINDOWS_API_URL: process.env.WINDOWS_API_URL || 'http://139.196.115.44:5000',
  },
  
  // 头部优化 - 预连接 Google Fonts
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'X-DNS-Prefetch-Control',
            value: 'on'
          },
          {
            key: 'Link',
            value: '<https://fonts.googleapis.com>; rel=preconnect; crossorigin, <https://fonts.gstatic.com>; rel=preconnect; crossorigin'
          },
          // 安全头部
          {
            key: 'X-Frame-Options',
            value: 'DENY'
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff'
          },
          {
            key: 'Referrer-Policy',
            value: 'origin-when-cross-origin'
          }
        ],
      },
    ]
  },
  
  // 重定向配置
  async redirects() {
    return [
      // 如果直接访问IP，重定向到域名
      {
        source: '/:path*',
        has: [
          {
            type: 'host',
            value: '139.196.115.44'
          }
        ],
        destination: 'https://zhengshu.yuexinjiance.top/:path*',
        permanent: true,
      },
    ]
  },
}

module.exports = nextConfig 