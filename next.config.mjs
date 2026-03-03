/** @type {import('next').NextConfig} */
import path from 'path';

const nextConfig = {
  webpack: (config) => {
    // support the same '@' alias used in tsconfig.json
    config.resolve.alias['@'] = path.resolve(__dirname, 'src');

    config.resolve.alias.canvas = false;
    return config;
  }
};

export default nextConfig;
