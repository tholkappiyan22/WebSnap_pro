import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Allow HMR WebSocket connections from any origin (network IPs, VirtualBox, etc.)
  allowedDevOrigins: ["192.168.56.1", "localhost", "127.0.0.1"],
};

export default nextConfig;
