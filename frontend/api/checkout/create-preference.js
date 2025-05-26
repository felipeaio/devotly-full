// Checkout API endpoint
import { getSupabaseClient, setCorsHeaders, handleCorsOptions } from '../../utils/supabaseClient';
import { MercadoPagoConfig, Preference } from 'mercadopago';

export default async function handler(req, res) {
  // Handle CORS preflight
  if (handleCorsOptions(req, res)) return;
  
  // Set CORS headers
  setCorsHeaders(res);
  
  if (req.method !== 'POST') {
    return res.status(405).json({
      status: 'error',
      message: 'Método não permitido'
    });
  }
  
  const { cardId, email, title, plan } = req.body;
  
  if (!cardId || !email || !plan) {
    return res.status(400).json({
      status: 'error',
      message: 'Dados incompletos'
    });
  }
  
  try {
    // Initialize Supabase client
    const supabase = getSupabaseClient();
    
    // Verify card exists
    const { data: card, error: cardError } = await supabase
      .from('cards')
      .select('*')
      .eq('id', cardId)
      .single();
    
    if (cardError || !card) {
      return res.status(404).json({
        status: 'error',
        message: 'Cartão não encontrado'
      });
    }
    
    // Determine price based on plan
    let price = 0;
    let planDescription = '';
    
    switch (plan) {
      case 'basic':
        price = 1900;
        planDescription = 'Plano Básico';
        break;
      case 'premium':
        price = 2900;
        planDescription = 'Plano Premium';
        break;
      case 'pro':
        price = 3900;
        planDescription = 'Plano Profissional';
        break;
      default:
        return res.status(400).json({
          status: 'error',
          message: 'Plano inválido'
        });
    }
    
    // Get frontend URL for redirection
    const frontendBaseUrl = process.env.FRONTEND_URL || req.headers.origin || 'https://devotly.com';
    
    // Create MercadoPago preference
    const accessToken = process.env.MERCADO_PAGO_ACCESS_TOKEN;
    if (!accessToken) {
      throw new Error('Token de acesso do MercadoPago não configurado');
    }
    
    const client = new MercadoPagoConfig({
      accessToken,
      options: { timeout: 5000 }
    });
    
    const preference = new Preference(client);
    
    // Create preference
    const response = await preference.create({
      items: [
        {
          id: cardId,
          title: title || 'Cartão Devotly',
          description: `${planDescription} para cartão Devotly`,
          quantity: 1,
          currency_id: 'BRL',
          unit_price: price / 100,
        },
      ],
      payer: {
        email,
      },
      back_urls: {
        success: `${frontendBaseUrl}/success.html?id=${cardId}`,
        failure: `${frontendBaseUrl}/create/create.html?error=payment`,
        pending: `${frontendBaseUrl}/create/create.html?status=pending`,
      },
      external_reference: `${cardId}|${email}|${plan}`,
      auto_return: 'approved',
      notification_url: `${process.env.API_URL || frontendBaseUrl}/api/webhook/mercadopago`,
    });
    
    return res.status(200).json({
      status: 'success',
      data: response,
      preferenceId: response.id
    });
    
  } catch (error) {
    console.error('Checkout API Error:', error);
    return res.status(500).json({
      status: 'error',
      message: error.message || 'Erro interno no servidor'
    });
  }
}
