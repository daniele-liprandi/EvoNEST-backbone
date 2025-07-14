/** @type {import('next').NextConfig} */

const nextConfig = {
    basePath: '',
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
