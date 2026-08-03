import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Allow HMR WebSocket connections from any origin (network IPs, VirtualBox, etc.)
  allowedDevOrigins: ["*"],
};

export default nextConfig;
