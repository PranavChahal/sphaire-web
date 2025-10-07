const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,
  
  // SEO Optimization
  compress: true,
  
  // Security headers for better SEO
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
            key: 'X-Frame-Options',
            value: 'SAMEORIGIN'
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff'
          },
          {
            key: 'Referrer-Policy',
            value: 'origin-when-cross-origin'
          }
        ]
      }
    ]
  },
  
  // Exclude non-Next.js directories from compilation
  pageExtensions: ['js', 'jsx', 'ts', 'tsx', 'md', 'mdx'],
  
  webpack: (config, { buildId, dev, isServer, defaultLoaders, webpack }) => {
    // Exclude problematic directories from webpack processing
    config.resolve.alias = {
      ...config.resolve.alias,
    };
    
    // Add rules to ignore certain file patterns
    config.module.rules.push({
      test: /llm-server\/.*/,
      loader: 'ignore-loader'
    });
    
    config.module.rules.push({
      test: /.*\.cmake$/,
      loader: 'ignore-loader'
    });
    
    config.module.rules.push({
      test: /CMakeFiles\/.*/,
      loader: 'ignore-loader'
    });
    config.resolve.fallback = { 
      fs: false, 
      path: false, 
      crypto: false 
    };
    
    config.module.rules.push({
      test: /\.wasm$/,
      type: 'javascript/auto',
      loader: 'file-loader',
      options: {
        name: 'static/wasm/[name].[hash].[ext]',
        publicPath: '/_next/',
      },
    });
    
    return config;
  },
};

module.exports = nextConfig;
