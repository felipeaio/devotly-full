// Save card API endpoint
import { getSupabaseClient, setCorsHeaders, handleCorsOptions } from '../utils/supabaseClient';
import { v4 as uuidv4 } from 'uuid';

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
  
  try {
    const cardData = req.body;
    
    if (!cardData || !cardData.email || !cardData.conteudo) {
      return res.status(400).json({
        status: 'error',
        message: 'Dados incompletos para criar o cartão'
      });
    }
    
    // Initialize Supabase client
    const supabase = getSupabaseClient();
    
    // Generate slug from title or random string
    const title = cardData.conteudo.cardTitle || 'Devotly Card';
    const slug = title
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '') + '-' + (Math.floor(Math.random() * 10000));
    
    // Generate unique ID
    const id = uuidv4();
    
    // Create card record
    const { data, error } = await supabase
      .from('cards')
      .insert([{
        id,
        slug,
        email: cardData.email.toLowerCase(),
        conteudo: cardData.conteudo,
        status_pagamento: 'pendente', // Status inicial
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }])
      .select();
    
    if (error) {
      throw error;
    }
    
    return res.status(201).json({
      status: 'success',
      message: 'Cartão criado com sucesso',
      cardId: id,
      data: data[0]
    });
    
  } catch (error) {
    console.error('API Error:', error);
    return res.status(500).json({
      status: 'error',
      message: error.message || 'Erro interno no servidor'
    });
  }
}
