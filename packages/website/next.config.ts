import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  transpilePackages: ['@motif-ts/core', '@motif-ts/react', '@motif-ts/middleware'],
};

export default nextConfig;
