import { NextResponse } from 'next/server';

/**
 * Adiciona os cabeçalhos CORS apropriados tanto para requisições OPTIONS quanto regulares
 * 
 * @param {Request} req - A requisição recebida
 * @param {Object} options - Opções de configuração CORS
 * @returns {Response|null} - Retorna uma resposta para requisições OPTIONS ou null para outros métodos
 */
export function handleCORS(req, options = {}) {
  const {
    allowMethods = 'GET, POST, PUT, DELETE, OPTIONS',
    allowHeaders = 'Content-Type, X-User-Email, X-Token-Edit, X-Requested-With',
    allowOrigin = '*',
    allowCredentials = false,
    maxAge = 86400, // 24 horas em segundos
  } = options;
  
  const corsHeaders = {
    'Access-Control-Allow-Origin': allowOrigin,
    'Access-Control-Allow-Methods': allowMethods,
    'Access-Control-Allow-Headers': allowHeaders,
    'Access-Control-Max-Age': maxAge.toString(),
  };
  
  if (allowCredentials) {
    corsHeaders['Access-Control-Allow-Credentials'] = 'true';
  }
  
  // Para requisições OPTIONS, retorna imediatamente com os cabeçalhos CORS
  if (req.method === 'OPTIONS') {
    return new NextResponse(null, {
      status: 200,
      headers: corsHeaders,
    });
  }
  
  // Para outros métodos, apenas retorna os cabeçalhos para serem adicionados à resposta final
  return { corsHeaders };
}

/**
 * Adiciona cabeçalhos CORS a uma resposta existente
 * 
 * @param {Response} response - A resposta à qual adicionar os cabeçalhos CORS
 * @param {Object} corsHeaders - Os cabeçalhos CORS a adicionar
 * @returns {Response} - A resposta com cabeçalhos CORS adicionados
 */
export function addCORSHeaders(response, corsHeaders) {
  const newResponse = new NextResponse(response.body, response);
  
  Object.entries(corsHeaders).forEach(([key, value]) => {
    newResponse.headers.set(key, value);
  });
  
  return newResponse;
}
