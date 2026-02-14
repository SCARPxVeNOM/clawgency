/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  webpack: (config) => {
    // Some wallet libs ship optional deps that are not needed for the web build.
    // Avoid noisy "Module not found" warnings in Vercel builds.
    config.resolve = config.resolve || {};
    config.resolve.alias = {
      ...(config.resolve.alias || {}),
      "@react-native-async-storage/async-storage": false,
      "pino-pretty": false
    };

    return config;
  }
};

module.exports = nextConfig;
