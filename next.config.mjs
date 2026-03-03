/** @type {import('next').NextConfig} */
import path from 'path';

const nextConfig = {
  webpack: (config) => {
    // support the same '@' alias used in tsconfig.json
    // __dirname is not defined in ESM; use process.cwd()
    config.resolve.alias['@'] = path.resolve(process.cwd(), 'src');

    config.resolve.alias.canvas = false;
    return config;
  }
};

export default nextConfig;
