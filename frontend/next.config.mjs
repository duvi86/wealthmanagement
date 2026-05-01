/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  output: "standalone",
  webpack: (config, { dev }) => {
    if (dev) {
      // Avoid intermittent corrupted module maps from filesystem cache on synced folders.
      config.cache = false;
    }
    return config;
  },
  env: {
    NEXT_PUBLIC_API_BASE_URL:
      process.env.NEXT_PUBLIC_API_BASE_URL ||
      "https://wealthmanagement-34um.onrender.com",
  },
};

export default nextConfig;
