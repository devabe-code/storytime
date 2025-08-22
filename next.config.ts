const isDev = process.env.NODE_ENV !== 'production';

const nextConfig = {
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          {
            key: "Content-Security-Policy",
            value: [
              "default-src 'self' blob:",
              // Keep unsafe-inline only in dev if you must
              `script-src 'self'${isDev ? " 'unsafe-inline' 'unsafe-eval'" : ""}`,
              // ✅ allow blob: stylesheets for foliate
              "style-src 'self' 'unsafe-inline' blob:",
              // (Optional but clearer with modern CSPs)
              "style-src-elem 'self' 'unsafe-inline' blob:",
              "img-src 'self' data: blob:",
              "font-src 'self' data: blob:",
              "media-src 'self' data: blob:",
              "connect-src 'self' blob: data: *",
              "frame-src blob: data:",
              "object-src blob: data:",
              "base-uri 'self'",
              "form-action 'none'",
            ].join("; "),
          },
        ],
      },
    ];
  },
};

export default nextConfig;
