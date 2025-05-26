// API endpoint for editing cards
import { getSupabaseClient, setCorsHeaders, handleCorsOptions } from '../../../utils/supabaseClient';

export default async function handler(req, res) {
  // Handle CORS preflight
  if (handleCorsOptions(req, res)) return;
  
  // Set CORS headers
  setCorsHeaders(res);
  
  const { id } = req.query;
  
  try {
    // Initialize Supabase client
    const supabase = getSupabaseClient();
    
    // Only allow PUT requests for editing
    if (req.method === 'PUT') {
      const updates = req.body;
      
      // Validate request body
      if (!updates || !updates.conteudo) {
        return res.status(400).json({
          status: 'error',
          message: 'Dados inválidos para atualização'
        });
      }
      
      // Check if card exists and is approved
      const { data: card, error: fetchError } = await supabase
        .from('cards')
        .select('status_pagamento')
        .eq('id', id)
        .single();
      
      if (fetchError || !card) {
        return res.status(404).json({
          status: 'error',
          message: 'Cartão não encontrado'
        });
      }
      
      if (card.status_pagamento !== 'aprovado') {
        return res.status(403).json({
          status: 'error',
          message: 'Cartão não está aprovado para edição'
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
