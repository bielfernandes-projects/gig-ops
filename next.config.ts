import type { NextConfig } from "next";
import pkg from "./package.json";

const nextConfig: NextConfig = {
  allowedDevOrigins: ['192.168.40.18'],
  // Só a string da versão vai para o bundle (Client Components incluídos), não o package.json inteiro.
  env: { NEXT_PUBLIC_APP_VERSION: pkg.version },
};

export default nextConfig;
