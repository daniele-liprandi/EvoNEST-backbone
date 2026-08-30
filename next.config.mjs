import { fileURLToPath } from "node:url";
import { dirname } from "node:path";

const repoRoot = dirname(fileURLToPath(import.meta.url));

/** @type {import('next').NextConfig} */
const nextConfig = {
    basePath: '',
    // Pin the workspace root to this repo. Without it Next walks up and can
    // pick a stray package-lock.json in the home directory as the root.
    outputFileTracingRoot: repoRoot,
    experimental: {
        forceSwcTransforms: true,
    },
    // Enable file watching for Docker
    webpack: (config, { dev }) => {
        if (dev) {
            config.watchOptions = {
                poll: 1000,
                aggregateTimeout: 300,
            }
        }
        return config
    },
}



export default nextConfig;
