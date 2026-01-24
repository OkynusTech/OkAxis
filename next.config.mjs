/** @type {import('next').NextConfig} */
const nextConfig = {
    // Webpack configuration for transformers.js
    webpack: (config, { isServer }) => {
        // Client-side fallbacks for Node.js modules
        if (!isServer) {
            config.resolve.fallback = {
                ...config.resolve.fallback,
                fs: false,
                path: false,
                crypto: false,
            };
        }

        return config;
    },

    // Environment variables for transformers.js cache
    env: {
        TRANSFORMERS_CACHE: './.cache/transformers',
        NEXT_PUBLIC_TRANSFORMERS_CACHE: './.cache/transformers',
    },
    eslint: {
        ignoreDuringBuilds: true,
    },
    typescript: {
        ignoreBuildErrors: true,
    },
    // Prevent bundling of native modules
    serverExternalPackages: ['@xenova/transformers', 'onnxruntime-node'],
    experimental: {
        serverComponentsExternalPackages: ['@xenova/transformers', 'onnxruntime-node'],
    },
};

export default nextConfig;
