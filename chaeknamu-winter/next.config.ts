import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // 로컬 개발용 임시 DB(pglite)는 번들하지 않고 그대로 불러와요
  serverExternalPackages: ["@electric-sql/pglite", "pg", "exceljs"],
};

export default nextConfig;
