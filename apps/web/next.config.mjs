/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // @11ftc/shared ships built dist ESM; transpiling it keeps Next's target handling simple.
  transpilePackages: ["@11ftc/shared"],
};

export default nextConfig;
