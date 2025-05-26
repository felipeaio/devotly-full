/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,
  experimental: {
    appDir: false,
  },
  // Configura o Next.js para servir nossos arquivos estáticos
  async rewrites() {
    return [
      {
        source: '/',
        destination: '/frontend/home.html',
      },
      {
        source: '/create',
        destination: '/frontend/create/create.html',
      },
      {
        source: '/edit/:path*',
        destination: '/frontend/edit/edit.html',
      },
      {
        source: '/edit',
        destination: '/frontend/edit/edit.html',
      },
      {
        source: '/view/:path*',
        destination: '/frontend/view/view.html',
      },
      {
        source: '/view',
        destination: '/frontend/view/view.html',
      },
      {
        source: '/success',
        destination: '/frontend/success.html',
      },
      {
        source: '/failure',
        destination: '/frontend/error.html',
      },
      {
        source: '/pending',
        destination: '/frontend/pending.html',
      },
      {
        source: '/api/:path*',
        destination: '/api/:path*',
      },
      // Redirecionamentos para assets estáticos
      {
        source: '/js/:path*',
        destination: '/frontend/js/:path*',
      },
      {
        source: '/css/:path*',
        destination: '/frontend/css/:path*',
      },
      {
        source: '/assets/:path*',
        destination: '/frontend/assets/:path*',
      },
      {
        source: '/fonts/:path*',
        destination: '/frontend/fonts/:path*',
      },
    ];
  },
  // Ajusta as configurações de construção para considerarmos os arquivos estáticos
  webpack: (config) => {
    config.module.rules.push({
      test: /\.(html)$/,
      use: {
        loader: 'html-loader',
      },
    });

    return config;
  },
};

module.exports = nextConfig;
