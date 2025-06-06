import express from 'express';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { createClient } from '@supabase/supabase-js';

// Configuração para ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Carregue o .env
dotenv.config({ path: path.resolve(__dirname, '../.env') });

console.log('=== TESTE DE WEBHOOK SIMULADO ===');
console.log('SUPABASE_URL:', !!process.env.SUPABASE_URL);
console.log('RESEND_API_KEY:', !!process.env.RESEND_API_KEY);
console.log('FRONTEND_URL:', process.env.FRONTEND_URL);

async function testWebhookFlow() {
  try {
    // Initialize Supabase
    const supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_ANON_KEY
    );

    // Buscar um cartão que não tenha email enviado ainda
    console.log('\n1. Buscando cartões sem email enviado...');
    const { data: cards, error: fetchError } = await supabase
      .from('cards')
      .select('*')
      .eq('status_pagamento', 'aprovado')
      .eq('email_sent', false)
      .limit(1);

    if (fetchError) {
      console.error('Erro ao buscar cartões:', fetchError);
      return;
    }

    if (!cards || cards.length === 0) {
      console.log('Nenhum cartão encontrado para teste. Criando um cartão de teste...');
      
      // Criar um cartão de teste
      const testCard = {
        id: 'test-' + Date.now(),
        email: 'felipe@devotly.shop', // Use seu email real para teste
        plano: 'para_sempre',
        status_pagamento: 'aprovado',
        payment_id: 'test-payment-' + Date.now(),
        email_sent: false,
        email_sending: false,
        conteudo: {
          cardTitle: 'Cartão de Teste - Webhook',
          cardMessage: 'Esta é uma mensagem de teste para verificar o envio de emails.',
          finalMessage: 'Que Deus abençoe você!',
          bibleVerse: {
            book: 'João',
            chapter: '3',
            verse: '16',
            text: 'Porque Deus amou o mundo de tal maneira que deu o seu Filho unigênito...',
            reference: 'João 3:16'
          },
          images: []
        },
        url: 'https://www.devotly.shop/view?id=test-' + Date.now(),
        created_at: new Date().toISOString()
      };

      const { data: insertedCard, error: insertError } = await supabase
        .from('cards')
        .insert([testCard])
        .select()
        .single();

      if (insertError) {
        console.error('Erro ao criar cartão de teste:', insertError);
        return;
      }

      console.log('Cartão de teste criado:', insertedCard.id);
      cards[0] = insertedCard;
    }

    const card = cards[0];
    console.log('\n2. Cartão selecionado para teste:');
    console.log('ID:', card.id);
    console.log('Email:', card.email);
    console.log('Status:', card.status_pagamento);
    console.log('Email enviado:', card.email_sent);

    // Simular o processamento do webhook
    console.log('\n3. Simulando processamento do webhook...');
    
    // Importar dinamicamente o serviço de email
    const { sendPaymentConfirmationEmail } = await import('./services/emailService.js');
    
    // Preparar dados do email
    const frontendUrl = process.env.FRONTEND_URL || 'https://www.devotly.shop';
    const cardUrl = `${frontendUrl}/view?id=${card.id}`;
    const name = card.email.split('@')[0];
    const title = card.conteudo?.cardTitle || 'Seu Cartão Cristão';

    console.log('\n4. Enviando email...');
    console.log('Para:', card.email);
    console.log('URL do cartão:', cardUrl);
    console.log('Título:', title);

    const emailResult = await sendPaymentConfirmationEmail({
      email: card.email,
      cardId: card.id,
      name,
      title,
      cardUrl
    });

    console.log('\n5. Resultado do envio:', emailResult);

    if (emailResult.data && emailResult.data.id) {
      console.log('\n✅ Email enviado com sucesso!');
      
      // Atualizar o cartão para marcar como enviado
      const { error: updateError } = await supabase
        .from('cards')
        .update({
          email_sent: true,
          email_sent_at: new Date().toISOString(),
          email_sending: false
        })
        .eq('id', card.id);

      if (updateError) {
        console.error('Erro ao atualizar status:', updateError);
      } else {
        console.log('✅ Status do cartão atualizado com sucesso');
      }
    } else {
      console.log('\n❌ Falha no envio do email');
    }

  } catch (error) {
    console.error('\n❌ Erro durante o teste:', error);
  }
}

testWebhookFlow();
