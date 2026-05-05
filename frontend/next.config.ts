import type { NextConfig } from "next";

const host = process.env.NEXT_PUBLIC_HOST ?? "localhost";

const nextConfig: NextConfig = {
  allowedDevOrigins: [host],
};

export default nextConfig;