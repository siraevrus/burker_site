import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: 'standalone',
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "www.burkerwatches.com",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "cdn.shopify.com",
        pathname: "/**",
      },
    ],
  },
  webpack: (config, { isServer, dev }) => {
    // Исключаем Prisma и связанные модули из клиентского бандла
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        net: false,
        tls: false,
        crypto: false,
      };
      
      // Исключаем Prisma Client из клиентского бандла
      config.externals = config.externals || [];
      config.externals.push({
        "@prisma/client": "commonjs @prisma/client",
        "prisma": "commonjs prisma",
      });
    }

    // Настройки для hot reload в Docker
    if (dev) {
      config.watchOptions = {
        poll: 1000, // Проверять изменения каждую секунду
        aggregateTimeout: 300, // Задержка перед пересборкой
      };
    }
    
    return config;
  },
};

export default nextConfig;
