/**
 * TikTok Pixel Events - Devotly
 * Implementa eventos de rastreamento para o TikTok Pixel conforme recomendações do TikTok
 * Inclui funis, eventos e parâmetros para melhorar o desempenho e os relatórios
 * 
 * Versão: 1.2.0
 * Última atualização: Inclui tratamento de erros e fallbacks para eventos
 */

// Fila local para eventos não enviados (armazenada em localStorage)
const TIKTOK_EVENT_QUEUE_KEY = 'devotly_tiktok_event_queue';
let eventQueueProcessing = false;

// Função para inicializar o sistema de eventos
function initTikTokEvents() {
  try {
    // Verificar se ttq está disponível
    if (typeof ttq === 'undefined') {
      console.warn('TikTok Pixel (ttq) não está disponível. Eventos serão enfileirados para tentativa posterior.');
    } else {
      console.log('TikTok Pixel inicializado com sucesso');
      
      // Iniciar processamento da fila
      processEventQueue();
    }
    
    // Adicionar listeners para eventos de visibilidade da página
    document.addEventListener('visibilitychange', function() {
      if (document.visibilityState === 'visible' && typeof ttq !== 'undefined') {
        processEventQueue();
      }
    });

    // Tenta processar a fila a cada minuto
    setInterval(processEventQueue, 60000);
    
    // Processa a fila no carregamento inicial da página
    setTimeout(processEventQueue, 3000);
  } catch (error) {
    console.error('Erro ao inicializar TikTok Events:', error);
  }
}

// Função para hash SHA-256 (necessária para dados PII)
async function sha256(str) {
  if (!str) return null;
  
  try {
    const buffer = new TextEncoder().encode(str);
    const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  } catch (error) {
    console.error('Erro ao gerar hash SHA-256:', error);
    return null;
  }
}

// Função para identificar usuário (para dados PII)
async function identifyUser(email, phone, userId) {
  try {
    const hashedData = {};
    
    if (email) {
      hashedData.email = await sha256(email.trim().toLowerCase());
    }
    
    if (phone) {
      // Remove não-dígitos do telefone antes do hash
      const cleanPhone = phone.replace(/\D/g, '');
      hashedData.phone_number = await sha256(cleanPhone);
    }
    
    if (userId) {
      hashedData.external_id = await sha256(userId);
    }
    
    if (Object.keys(hashedData).length > 0) {
      // Tenta enviar o evento, ou enfileira se não for possível
      if (typeof ttq !== 'undefined') {
        ttq.identify(hashedData);
        console.log('TikTok: Usuário identificado com', Object.keys(hashedData).join(', '));
        return true;
      } else {
        // Enfileira o evento para tentativa posterior
        enqueueEvent('identify', hashedData);
        return false;
      }
    }
    return false;
  } catch (error) {
    console.error('Erro ao identificar usuário para TikTok Pixel:', error);
    return false;
  }
}

// Gera ID único para eventos
function generateEventId() {
  return Date.now() + '_' + Math.floor(Math.random() * 1000);
}

// Enfileira um evento para tentativa posterior
function enqueueEvent(eventType, eventData, eventOptions = {}) {
  try {
    // Obter fila atual
    const queueJson = localStorage.getItem(TIKTOK_EVENT_QUEUE_KEY) || '[]';
    const queue = JSON.parse(queueJson);
    
    // Adicionar evento à fila
    queue.push({
      eventType,
      eventData,
      eventOptions: { ...eventOptions, event_id: eventOptions.event_id || generateEventId() },
      timestamp: Date.now(),
      attempts: 0
    });
    
    // Salvar fila atualizada
    localStorage.setItem(TIKTOK_EVENT_QUEUE_KEY, JSON.stringify(queue));
    console.log(`TikTok: Evento ${eventType} enfileirado para envio posterior`);
  } catch (error) {
    console.error('Erro ao enfileirar evento TikTok:', error);
  }
}

// Processa a fila de eventos pendentes
async function processEventQueue() {
  if (eventQueueProcessing || typeof ttq === 'undefined') return;
  
  try {
    eventQueueProcessing = true;
    const queueJson = localStorage.getItem(TIKTOK_EVENT_QUEUE_KEY) || '[]';
    let queue = JSON.parse(queueJson);
    
    if (queue.length === 0) {
      eventQueueProcessing = false;
      return;
    }
    
    console.log(`TikTok: Processando fila com ${queue.length} eventos pendentes`);
    
    // Processa até 10 eventos por vez
    const eventsToProcess = queue.slice(0, 10);
    const remainingEvents = queue.slice(10);
    const failedEvents = [];
    
    for (const event of eventsToProcess) {
      try {
        // Incrementa contagem de tentativas
        event.attempts++;
        
        // Descarta eventos com mais de 5 tentativas ou mais antigos que 24h
        if (event.attempts > 5 || (Date.now() - event.timestamp > 24 * 60 * 60 * 1000)) {
          console.log(`TikTok: Descartando evento antigo ou com muitas tentativas: ${event.eventType}`);
          continue;
        }
        
        // Envia o evento
        if (event.eventType === 'identify') {
          ttq.identify(event.eventData);
        } else {
          ttq.track(event.eventType, event.eventData, event.eventOptions);
        }
        
        console.log(`TikTok: Evento ${event.eventType} processado da fila com sucesso`);
      } catch (error) {
        console.error(`TikTok: Erro ao processar evento ${event.eventType} da fila:`, error);
        failedEvents.push(event);
      }
    }
    
    // Atualiza a fila com os eventos que falharam + os que não foram processados
    const newQueue = [...failedEvents, ...remainingEvents];
    localStorage.setItem(TIKTOK_EVENT_QUEUE_KEY, JSON.stringify(newQueue));
    
    console.log(`TikTok: Fila processada. Restam ${newQueue.length} eventos pendentes`);
  } catch (error) {
    console.error('TikTok: Erro ao processar fila de eventos:', error);
  } finally {
    eventQueueProcessing = false;
  }
}

// Rastreamento de evento ViewContent - Visualização de página/produto
function trackViewContent(contentId, contentName, value = null, currency = 'BRL') {
  const eventData = {
    contents: [{
      content_id: contentId || 'unknown',
      content_type: contentId === 'home' ? 'product_group' : 'product',
      content_name: contentName || 'Página Devotly'
    }]
  };
  
  if (value) {
    eventData.value = value;
    eventData.currency = currency;
  }
  
  const eventOptions = { event_id: generateEventId() };
  
  try {
    if (typeof ttq !== 'undefined') {
      ttq.track('ViewContent', eventData, eventOptions);
      console.log('TikTok: Evento ViewContent rastreado', {contentId, contentName});
      return true;
    } else {
      enqueueEvent('ViewContent', eventData, eventOptions);
      return false;
    }
  } catch (error) {
    console.error('TikTok: Erro ao rastrear ViewContent:', error);
    enqueueEvent('ViewContent', eventData, eventOptions);
    return false;
  }
}

// Rastreamento de evento AddToCart - Adicionar ao carrinho
function trackAddToCart(contentId, contentName, value, currency = 'BRL') {
  if (typeof ttq === 'undefined') return;

  ttq.track('AddToCart', {
    contents: [{
      content_id: contentId || 'unknown',
      content_type: 'product',
      content_name: contentName || 'Produto Devotly'
    }],
    value: value || 0,
    currency: currency
  }, {
    event_id: generateEventId()
  });
  
  console.log('TikTok: Evento AddToCart rastreado', {contentId, contentName, value});
}

// Rastreamento de evento AddToWishlist - Adicionar à lista de desejos
function trackAddToWishlist(contentId, contentName, value, currency = 'BRL') {
  if (typeof ttq === 'undefined') return;

  ttq.track('AddToWishlist', {
    contents: [{
      content_id: contentId || 'unknown',
      content_type: 'product',
      content_name: contentName || 'Produto Devotly'
    }],
    value: value || 0,
    currency: currency
  }, {
    event_id: generateEventId()
  });
  
  console.log('TikTok: Evento AddToWishlist rastreado', {contentId, contentName});
}

// Rastreamento de evento InitiateCheckout - Iniciar checkout
function trackInitiateCheckout(contentId, contentName, value, currency = 'BRL') {
  if (typeof ttq === 'undefined') return;

  ttq.track('InitiateCheckout', {
    contents: [{
      content_id: contentId || 'unknown',
      content_type: 'product',
      content_name: contentName || 'Produto Devotly'
    }],
    value: value || 0,
    currency: currency
  }, {
    event_id: generateEventId()
  });
  
  console.log('TikTok: Evento InitiateCheckout rastreado', {contentId, contentName, value});
}

// Rastreamento de evento AddPaymentInfo - Adicionar informações de pagamento
function trackAddPaymentInfo(contentId, contentName, value, currency = 'BRL') {
  if (typeof ttq === 'undefined') return;

  ttq.track('AddPaymentInfo', {
    contents: [{
      content_id: contentId || 'unknown',
      content_type: 'product',
      content_name: contentName || 'Produto Devotly'
    }],
    value: value || 0,
    currency: currency
  }, {
    event_id: generateEventId()
  });
  
  console.log('TikTok: Evento AddPaymentInfo rastreado', {contentId, contentName, value});
}

// Rastreamento de evento PlaceAnOrder - Colocar um pedido
function trackPlaceAnOrder(contentId, contentName, value, currency = 'BRL') {
  if (typeof ttq === 'undefined') return;

  ttq.track('PlaceAnOrder', {
    contents: [{
      content_id: contentId || 'unknown',
      content_type: 'product',
      content_name: contentName || 'Produto Devotly'
    }],
    value: value || 0,
    currency: currency
  }, {
    event_id: generateEventId()
  });
  
  console.log('TikTok: Evento PlaceAnOrder rastreado', {contentId, contentName, value});
}

// Rastreamento de evento Purchase - Compra
function trackPurchase(contentId, contentName, value, currency = 'BRL') {
  if (typeof ttq === 'undefined') return;

  ttq.track('Purchase', {
    contents: [{
      content_id: contentId || 'unknown',
      content_type: 'product',
      content_name: contentName || 'Produto Devotly'
    }],
    value: value || 0,
    currency: currency
  }, {
    event_id: generateEventId()
  });
  
  console.log('TikTok: Evento Purchase rastreado', {contentId, contentName, value});
}

// Rastreamento de evento CompleteRegistration - Registro completo
function trackCompleteRegistration(contentId, contentName, value = null, currency = 'BRL') {
  if (typeof ttq === 'undefined') return;

  const eventData = {
    contents: [{
      content_id: contentId || 'registration',
      content_type: 'product',
      content_name: contentName || 'Registro Devotly'
    }]
  };
  
  if (value) {
    eventData.value = value;
    eventData.currency = currency;
  }
  
  ttq.track('CompleteRegistration', eventData, {
    event_id: generateEventId()
  });
  
  console.log('TikTok: Evento CompleteRegistration rastreado', {contentId, contentName});
}

// Rastreamento de evento Search - Pesquisa
function trackSearch(searchString, contentId = null, contentName = null, value = null, currency = 'BRL') {
  if (typeof ttq === 'undefined') return;

  const eventData = {
    search_string: searchString
  };
  
  if (contentId && contentName) {
    eventData.contents = [{
      content_id: contentId,
      content_type: 'product',
      content_name: contentName
    }];
  }
  
  if (value) {
    eventData.value = value;
    eventData.currency = currency;
  }
  
  ttq.track('Search', eventData, {
    event_id: generateEventId()
  });
  
  console.log('TikTok: Evento Search rastreado', {searchString});
}

// Evento de engajamento com botões ou elementos
function trackEngagement(elementType, elementName, value = null) {
  const eventData = {
    contents: [{
      content_id: elementType || 'engagement',
      content_type: 'interaction',
      content_name: elementName || 'Interação do usuário'
    }]
  };
  
  if (value) {
    eventData.value = value;
    eventData.currency = 'BRL';
  }
  
  const eventOptions = { event_id: generateEventId() };
  
  if (typeof ttq !== 'undefined') {
    ttq.track('ClickButton', eventData, eventOptions);
    console.log('TikTok: Evento ClickButton rastreado', {elementType, elementName});
  } else {
    enqueueEvent('ClickButton', eventData, eventOptions);
  }
}

// Evento de início de formulário
function trackFormStart(formType, formName) {
  const eventData = {
    contents: [{
      content_id: formType || 'form',
      content_type: 'form',
      content_name: formName || 'Formulário'
    }]
  };
  
  const eventOptions = { event_id: generateEventId() };
  
  if (typeof ttq !== 'undefined') {
    ttq.track('SubmitForm', eventData, eventOptions);
    console.log('TikTok: Evento SubmitForm (início) rastreado', {formType, formName});
  } else {
    enqueueEvent('SubmitForm', eventData, eventOptions);
  }
}

// Evento de submissão de formulário
function trackFormSubmit(formType, formName, success = true) {
  const eventData = {
    contents: [{
      content_id: formType || 'form',
      content_type: 'form',
      content_name: formName || 'Formulário'
    }],
    status: success ? 'success' : 'error'
  };
  
  const eventOptions = { event_id: generateEventId() };
  
  if (typeof ttq !== 'undefined') {
    ttq.track('Contact', eventData, eventOptions);
    console.log('TikTok: Evento Contact (submissão) rastreado', {formType, formName, success});
  } else {
    enqueueEvent('Contact', eventData, eventOptions);
  }
}

// Evento de rolagem da página
function trackPageScroll(percentage, section = null) {
  const eventData = {
    contents: [{
      content_id: 'page_scroll',
      content_type: 'scroll',
      content_name: section ? `Seção ${section}` : `${percentage}% da página`
    }],
    scroll_percentage: percentage
  };
  
  const eventOptions = { event_id: generateEventId() };
  
  if (typeof ttq !== 'undefined') {
    ttq.track('ViewContent', eventData, eventOptions);
    console.log('TikTok: Evento ViewContent (scroll) rastreado', {percentage, section});
  } else {
    enqueueEvent('ViewContent', eventData, eventOptions);
  }
}

// Evento de clique em botão específico
function trackButtonClick(buttonType, buttonText, value = null) {
  const eventData = {
    contents: [{
      content_id: buttonType || 'button',
      content_type: 'button',
      content_name: buttonText || 'Botão'
    }]
  };
  
  if (value) {
    eventData.value = value;
    eventData.currency = 'BRL';
  }
  
  const eventOptions = { event_id: generateEventId() };
  
  if (typeof ttq !== 'undefined') {
    ttq.track('ClickButton', eventData, eventOptions);
    console.log('TikTok: Evento ClickButton rastreado', {buttonType, buttonText});
  } else {
    enqueueEvent('ClickButton', eventData, eventOptions);
  }
}

// Evento de visualização de seção
function trackSectionView(sectionId, sectionName) {
  const eventData = {
    contents: [{
      content_id: sectionId || 'section',
      content_type: 'section',
      content_name: sectionName || 'Seção da página'
    }]
  };
  
  const eventOptions = { event_id: generateEventId() };
  
  if (typeof ttq !== 'undefined') {
    ttq.track('ViewContent', eventData, eventOptions);
    console.log('TikTok: Evento ViewContent (seção) rastreado', {sectionId, sectionName});
  } else {
    enqueueEvent('ViewContent', eventData, eventOptions);
  }
}

// Evento de interação com mídia
function trackMediaInteraction(mediaType, mediaName, action = 'play') {
  const eventData = {
    contents: [{
      content_id: `${mediaType}_${action}`,
      content_type: 'media',
      content_name: `${action} ${mediaName || mediaType}`
    }],
    media_type: mediaType,
    action: action
  };
  
  const eventOptions = { event_id: generateEventId() };
  
  if (typeof ttq !== 'undefined') {
    ttq.track('ClickButton', eventData, eventOptions);
    console.log('TikTok: Evento ClickButton (mídia) rastreado', {mediaType, mediaName, action});
  } else {
    enqueueEvent('ClickButton', eventData, eventOptions);
  }
}

// Eventos específicos da Devotly - Interface para facilitar o uso
const TikTokEvents = {
  // Identificação de usuário
  identifyUser,
  
  // Visualização de página inicial
  viewHomePage() {
    trackViewContent('home', 'Página Inicial Devotly');
  },

  // Visualização da página de criação
  viewCreatePage() {
    trackViewContent('create', 'Criar Cartão Devocional');
  },

  // Visualização de cartão específico
  viewCard(cardId, cardName) {
    trackViewContent(cardId || 'unknown-card', cardName || 'Cartão Devocional');
  },

  // Início da criação de cartão
  startCardCreation() {
    trackAddToCart('new-card', 'Novo Cartão Devocional');
  },

  // Seleção de plano (equivalente ao checkout)
  selectPlan(planType, planValue) {
    const planName = planType === 'para_sempre' ? 'Plano Para Sempre' : 'Plano Anual';
    trackInitiateCheckout(planType, planName, planValue);
  },

  // Adição de informações de pagamento
  addPaymentInfo(planType, planValue) {
    const planName = planType === 'para_sempre' ? 'Plano Para Sempre' : 'Plano Anual';
    trackAddPaymentInfo(planType, planName, planValue);
  },

  // Pedido colocado
  placeOrder(cardId, planType, planValue) {
    const planName = planType === 'para_sempre' ? 'Plano Para Sempre' : 'Plano Anual';
    trackPlaceAnOrder(cardId || planType, planName, planValue);
  },

  // Compra finalizada
  completePurchase(cardId, planType, planValue) {
    const planName = planType === 'para_sempre' ? 'Plano Para Sempre' : 'Plano Anual';
    trackPurchase(cardId || planType, planName, planValue);
  },

  // Registro completo de usuário
  completeRegistration(email, cardId) {
    trackCompleteRegistration(cardId || 'new-user', 'Registro de Usuário');
    // Também identifica o usuário se o email foi fornecido
    if (email) {
      identifyUser(email, null, cardId);
    }
  },
  
  // Pesquisa (se implementada no futuro)
  search(searchTerm) {
    trackSearch(searchTerm);
  },

  // Rastreamento de engajamento
  trackEngagement,
  trackFormStart,
  trackFormSubmit,
  trackPageScroll,
  trackButtonClick,
  trackSectionView,
  trackMediaInteraction,

  // Eventos específicos para página Home
  home: {
    viewHero() {
      trackSectionView('hero', 'Seção Hero - Página Inicial');
    },
    
    viewHowItWorks() {
      trackSectionView('how-it-works', 'Como Funciona');
    },
    
    viewPricing() {
      trackSectionView('pricing', 'Seção de Preços');
    },
    
    clickCreateCard() {
      trackButtonClick('cta-create', 'Criar Meu Cartão', 0);
    },
    
    clickPlan(planType, planValue) {
      const planName = planType === 'para_sempre' ? 'Plano Para Sempre' : 'Plano Anual';
      trackButtonClick(`plan-${planType}`, `Escolher ${planName}`, planValue);
    },
    
    scrollProgress(percentage) {
      // Rastrear apenas marcos importantes de scroll
      if ([25, 50, 75, 100].includes(percentage)) {
        trackPageScroll(percentage, 'home');
      }
    }
  },

  // Eventos específicos para página Create
  create: {
    startCreation() {
      trackFormStart('card-creation', 'Criação de Cartão');
    },
    
    fillStep(stepNumber, stepName) {
      trackSectionView(`step-${stepNumber}`, `Etapa ${stepNumber}: ${stepName}`);
    },
    
    uploadImage() {
      trackEngagement('upload', 'Upload de Imagem');
    },
    
    selectVerse() {
      trackEngagement('verse-selection', 'Seleção de Versículo');
    },
    
    addMusic() {
      trackEngagement('music', 'Adicionar Música');
    },
    
    previewCard() {
      trackButtonClick('preview', 'Visualizar Cartão');
    },
    
    editCard() {
      trackButtonClick('edit', 'Editar Cartão');
    },
    
    completeCreation(cardId) {
      trackFormSubmit('card-creation', 'Criação de Cartão Completa', true);
      if (cardId) {
        trackAddToCart(cardId, 'Cartão Criado');
      }
    },
    
    navigateSteps(from, to) {
      trackEngagement('navigation', `Navegar da Etapa ${from} para ${to}`);
    }
  }
};

// Auto-detecção de página atual e dispara ViewContent
function autoTrackPageView() {
  const path = window.location.pathname;
  
  if (path === '/' || path.includes('home.html') || path === '/index.html') {
    TikTokEvents.viewHomePage();
  } else if (path.includes('/create/') || path.includes('/create.html')) {
    TikTokEvents.viewCreatePage();
  } else if (path.includes('/view/') || path.includes('/view.html')) {
    // Extrai ID do cartão da URL se disponível
    const urlParams = new URLSearchParams(window.location.search);
    const cardId = urlParams.get('id');
    TikTokEvents.viewCard(cardId);
  } else if (path.includes('/success')) {
    handleSuccessPage();
  }
  
  // Tenta extrair informações do usuário do localStorage
  try {
    const userData = JSON.parse(localStorage.getItem('devotlyUserData'));
    if (userData && userData.email) {
      identifyUser(userData.email, userData.phone, userData.userId);
    }
  } catch (error) {
    console.log('Nenhum dado de usuário encontrado para identificação');
  }
}

// Lógica para página de sucesso
function handleSuccessPage() {
  if (!window.location.pathname.includes('/success')) return;
  
  // Extrai informações do URL
  const urlParams = new URLSearchParams(window.location.search);
  const paymentId = urlParams.get('payment_id');
  const externalReference = urlParams.get('external_reference');
  const status = urlParams.get('status');
  
  // Tenta recuperar dados do cartão/produto e usuário do localStorage
  try {
    const cardData = JSON.parse(localStorage.getItem('devotlyCardData')) || {};
    const userData = JSON.parse(localStorage.getItem('devotlyUserData')) || {};
    const paymentData = JSON.parse(localStorage.getItem('devotlyPaymentData')) || {};
    
    // Identifica usuário se dados disponíveis
    if (userData.email) {
      identifyUser(userData.email, userData.phone, userData.userId || externalReference);
    }
    
    // Dispara evento de compra se o status for aprovado
    if (status === 'approved' || status === 'success') {
      trackPurchase(
        externalReference || cardData.cardId || 'unknown',
        cardData.planName || 'Plano Devotly',
        paymentData.value || cardData.price || 0
      );
    }
  } catch (error) {
    console.error('Erro ao processar eventos da página de sucesso', error);
  }
}

// Auto-inicialização quando o script é carregado
document.addEventListener('DOMContentLoaded', function() {
    console.log('TikTok Events: Inicializando automaticamente...');
    initTikTokEvents();
    
    // Detectar tipo de página e acionar ViewContent automaticamente
    setTimeout(() => {
        try {
            const pageType = detectPageType();
            if (pageType) {
                console.log('TikTok Events: Página detectada como', pageType);
                trackViewContent(pageType, getPageTitle());
            }
        } catch (err) {
            console.error('TikTok Events: Erro ao rastrear ViewContent automático', err);
        }
    }, 1000);
});

// Detecta automaticamente o tipo de página
function detectPageType() {
    const path = window.location.pathname.toLowerCase();
    
    if (path === '/' || path.includes('home')) return 'home';
    if (path.includes('create')) return 'create';
    if (path.includes('view')) return 'card';
    if (path.includes('edit')) return 'edit';
    if (path.includes('success')) return 'success';
    if (path.includes('checkout')) return 'checkout';
    if (path.includes('termos')) return 'termos';
    if (path.includes('privacidade')) return 'privacidade';
    
    return 'other';
}

// Obtém o título da página
function getPageTitle() {
    return document.title || 'Devotly';
}

// Inicializa os eventos do TikTok quando o DOM estiver pronto
document.addEventListener('DOMContentLoaded', function() {
  if (typeof ttq === 'undefined') {
    console.error('TikTok Pixel não encontrado. Verifique se o script está carregado corretamente.');
    return;
  }
  
  // Rastreia automaticamente a página atual
  autoTrackPageView();
  
  console.log('TikTok Pixel Events inicializado');
});

// Exporta o objeto para uso global
window.TikTokEvents = TikTokEvents;
