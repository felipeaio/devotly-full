import { NextResponse } from 'next/server';

// Define que rotas usar o middleware
export const config = {
  matcher: ['/api/:path*'],
};

// Middleware para adicionar cabeçalhos CORS a todas as respostas
export default function middleware(req) {
  const origin = req.headers.get('origin') || '*';
  
  // Response para preflight requests (OPTIONS)
  if (req.method === 'OPTIONS') {
    return new NextResponse(null, {
      status: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, X-Requested-With, X-User-Email, X-Token-Edit',
        'Access-Control-Max-Age': '86400',
      },
    });
  }
  
  // Clonar a requisição para continuar o processamento
  const response = NextResponse.next();
  
  // Adicionar cabeçalhos CORS à resposta
  response.headers.set('Access-Control-Allow-Origin', '*');
  response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  response.headers.set('Access-Control-Allow-Headers', 'Content-Type, X-Requested-With, X-User-Email, X-Token-Edit');
  
  return response;
}
