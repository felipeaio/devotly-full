import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { createClient } from '@supabase/supabase-js';

// Configuração para ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Carregue o .env
dotenv.config({ path: path.resolve(__dirname, '../.env') });

async function checkEmailStatus() {
  try {
    console.log('=== VERIFICAÇÃO DE STATUS DE EMAILS ===\n');
    
    // Initialize Supabase
    const supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_ANON_KEY
    );

    // Verificar se as colunas necessárias existem
    console.log('1. Verificando estrutura da tabela...');
    
    try {
      const { data: testColumns, error: testError } = await supabase
        .from('cards')
        .select('id, email_sent, email_sending, email_sent_at')
        .limit(1);

      if (testError) {
        console.error('❌ Erro: As colunas necessárias não existem ainda.');
        console.error('Execute o script SQL fornecido no Supabase primeiro.');
        console.error('Detalhes:', testError.message);
        return;
      }
      
      console.log('✅ Estrutura da tabela está correta');
    } catch (error) {
      console.error('❌ Erro ao verificar colunas:', error.message);
      return;
    }

    // Buscar estatísticas de emails
    console.log('\n2. Estatísticas de emails...');
    
    const { data: approvedCards, error: approvedError } = await supabase
      .from('cards')
      .select('id, email, email_sent, email_sent_at, status_pagamento')
      .eq('status_pagamento', 'aprovado');

    if (approvedError) {
      console.error('Erro ao buscar cartões aprovados:', approvedError);
      return;
    }

    const totalApproved = approvedCards.length;
    const emailsSent = approvedCards.filter(card => card.email_sent).length;
    const emailsPending = totalApproved - emailsSent;

    console.log(`📊 Total de cartões aprovados: ${totalApproved}`);
    console.log(`✅ Emails enviados: ${emailsSent}`);
    console.log(`⏳ Emails pendentes: ${emailsPending}`);

    if (emailsPending > 0) {
      console.log('\n3. Cartões com emails pendentes:');
      const pendingCards = approvedCards.filter(card => !card.email_sent);
      pendingCards.forEach((card, index) => {
        console.log(`   ${index + 1}. ID: ${card.id} | Email: ${card.email}`);
      });
    }

    // Verificar cartões enviados recentemente
    const recentSent = approvedCards
      .filter(card => card.email_sent && card.email_sent_at)
      .sort((a, b) => new Date(b.email_sent_at) - new Date(a.email_sent_at))
      .slice(0, 5);

    if (recentSent.length > 0) {
      console.log('\n4. Emails enviados recentemente:');
      recentSent.forEach((card, index) => {
        const sentDate = new Date(card.email_sent_at).toLocaleString('pt-BR');
        console.log(`   ${index + 1}. ${card.email} - ${sentDate}`);
      });
    }

    console.log('\n=== VERIFICAÇÃO CONCLUÍDA ===');

  } catch (error) {
    console.error('❌ Erro durante a verificação:', error);
  }
}

checkEmailStatus();
