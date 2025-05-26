// Search cards by email API endpoint
import { getSupabaseClient, setCorsHeaders, handleCorsOptions } from '../../utils/supabaseClient';

export default async function handler(req, res) {
  // Handle CORS preflight
  if (handleCorsOptions(req, res)) return;
  
  // Set CORS headers
  setCorsHeaders(res);
  
  if (req.method !== 'GET') {
    return res.status(405).json({
      status: 'error',
      message: 'Método não permitido'
    });
  }
  
  const { email } = req.query;
  
  if (!email) {
    return res.status(400).json({
      status: 'error',
      message: 'E-mail é obrigatório'
    });
  }
  
  try {
    // Initialize Supabase client
    const supabase = getSupabaseClient();
    
    // Buscar cartões pelo email
    const { data, error } = await supabase
      .from('cards')
      .select('*')
      .eq('email', email.toLowerCase());
    
    if (error) {
      throw error;
    }
    
    return res.status(200).json({
      status: 'success',
      cards: data || []
    });
    
  } catch (error) {
    console.error('API Error:', error);
    return res.status(500).json({
      status: 'error',
      message: error.message || 'Erro interno no servidor'
    });
  }
}
