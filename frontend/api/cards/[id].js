// API Router for Vercel Serverless
import { getSupabaseClient, setCorsHeaders, handleCorsOptions } from '../../utils/supabaseClient';

export default async function handler(req, res) {
  // Handle CORS preflight
  if (handleCorsOptions(req, res)) return;
  
  // Set CORS headers
  setCorsHeaders(res);
  
  const { id } = req.query;
  
  try {
    // Initialize Supabase client
    const supabase = getSupabaseClient();
    
    if (req.method === 'GET') {
      // Buscar cartão pelo ID
      const { data, error } = await supabase
        .from('cards')
        .select('*')
        .eq('id', id)
        .single();
      
      if (error) {
        throw error;
      }
      
      if (!data) {
        return res.status(404).json({
          status: 'error',
          message: 'Cartão não encontrado'
        });
      }
      
      // Retornar dados do cartão
      return res.status(200).json({
        status: 'success',
        data
      });
    } 
    
    // Handle PUT request for editing cards
    if (req.method === 'PUT') {
      const updates = req.body;
      
      // Validate request body
      if (!updates || !updates.conteudo) {
        return res.status(400).json({
          status: 'error',
          message: 'Dados inválidos para atualização'
        });
      }
      
      // Update card content
      const { data, error } = await supabase
        .from('cards')
        .update({
          conteudo: updates.conteudo,
          updated_at: new Date().toISOString()
        })
        .eq('id', id)
        .select();
      
      if (error) {
        throw error;
      }
      
      return res.status(200).json({
        status: 'success',
        message: 'Cartão atualizado com sucesso',
        data
      });
    }
    
    // If the request method is not supported
    return res.status(405).json({
      status: 'error',
      message: 'Método não permitido'
    });
    
  } catch (error) {
    console.error('API Error:', error);
    return res.status(500).json({
      status: 'error',
      message: error.message || 'Erro interno no servidor'
    });
  }
}
