/** @type {import('next').NextConfig} */
const nextConfig = {


    // Environment variables for transformers.js cache
    env: {
        TRANSFORMERS_CACHE: './.cache/transformers',
        NEXT_PUBLIC_TRANSFORMERS_CACHE: './.cache/transformers',
    },
    // Prevent bundling of native modules
    serverExternalPackages: ['@xenova/transformers', 'onnxruntime-node'],
    typescript: {
        ignoreBuildErrors: true,
    },
};

export default nextConfig;
