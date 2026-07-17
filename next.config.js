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
  
  // Exclude example and doc files from build
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: false,
  },
  
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
      ...config.resolve.fallback,
      fs: false, 
      path: false, 
      crypto: false,
      module: false,
      url: false,
    };

    // manifold-3d is a universal Emscripten module. Its browser branch never
    // touches Node built-ins, but Webpack still parses the guarded `node:*`
    // imports. Normalize those specifiers and let the browser fallbacks above
    // replace them with empty modules.
    if (!isServer) {
      config.plugins.push(
        new webpack.NormalModuleReplacementPlugin(/^node:/, (resource) => {
          resource.request = resource.request.replace(/^node:/, '');
        })
      );
    }
    
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
