/**
 * TikTok Events Manager - RESTRUTURAÇÃO COMPLETA v3.0
 * Sistema otimizado para máxima qualidade EMQ (Event Match Quality)
 * 
 * Características principais:
 * - EMQ Score Target: 70+ pontos
 * - Advanced Matching aprimorado
 * - Validação rigorosa de dados
 * - Sistema de retry inteligente
 * - Cache otimizado para performance
 * - Deduplicação avançada
 */

class TikTokEventsManager {
    constructor() {
        this.apiUrl = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
            ? 'http://localhost:3000'
            : 'https://devotly-full-production.up.railway.app';
        
        // Cache de dados do usuário com validação
        this.userCache = {
            email: null,
            phone: null,
            userId: null,
            hashedData: {},
            ttclid: null,
            ttp: null,
            fbp: null,
            fbc: null,
            validated: false
        };
        
        // Configurações EMQ
        this.emqConfig = {
            minEmailCoverage: 90,
            minPhoneCoverage: 90,
            requiredFields: ['email', 'phone_number', 'external_id', 'user_agent', 'url'],
            hashFormat: 'sha256_base64'
        };
        
        // Fila de eventos para retry
        this.eventQueue = [];
        this.isProcessingQueue = false;
        
        // Métricas de qualidade
        this.qualityMetrics = {
            emailHashSuccess: 0,
            phoneHashSuccess: 0,
            eventsSent: 0,
            eventsSuccess: 0,
            averageEMQ: 0
        };
        
        this.init();
    }
    
    /**
     * Inicialização do sistema
     */
    init() {
        this.loadStoredUserData();
        this.extractUrlParameters();
        this.setupEventListeners();
        this.startQueueProcessor();
        
        console.log('🎯 TikTok Events Manager v3.0 inicializado');
        console.log('📊 Target EMQ: 70+ pontos');
    }
    
    /**
     * Carrega dados armazenados do usuário
     */
    loadStoredUserData() {
        try {
            const storedEmail = localStorage.getItem('devotly_user_email');
            const storedPhone = localStorage.getItem('devotly_user_phone');
            const storedUserId = localStorage.getItem('devotly_user_id');
            
            if (storedEmail) {
                this.userCache.email = storedEmail;
            }
            if (storedPhone) {
                this.userCache.phone = storedPhone;
            }
            if (storedUserId) {
                this.userCache.userId = storedUserId;
            }
            
            // Auto-identificar se temos dados
            if (storedEmail || storedPhone) {
                this.identifyUser(storedEmail, storedPhone, storedUserId);
            }
        } catch (error) {
            console.warn('Erro ao carregar dados do usuário:', error);
        }
    }
    
    /**
     * Extrai parâmetros importantes da URL
     */
    extractUrlParameters() {
        const urlParams = new URLSearchParams(window.location.search);
        
        // Parâmetros do TikTok
        this.userCache.ttclid = urlParams.get('ttclid') || this.getCookie('ttclid');
        this.userCache.ttp = urlParams.get('ttp') || this.getCookie('ttp');
        
        // Parâmetros do Facebook (para cross-platform matching)
        this.userCache.fbp = this.getCookie('_fbp');
        this.userCache.fbc = this.getCookie('_fbc');
        
        // Armazenar parâmetros importantes
        if (this.userCache.ttclid) {
            this.setCookie('ttclid', this.userCache.ttclid, 30);
            localStorage.setItem('devotly_ttclid', this.userCache.ttclid);
        }
        if (this.userCache.ttp) {
            this.setCookie('ttp', this.userCache.ttp, 30);
            localStorage.setItem('devotly_ttp', this.userCache.ttp);
        }
    }
    
    /**
     * Hash SHA-256 + Base64 otimizado
     */
    async hashData(data) {
        if (!data || typeof data !== 'string' || data.trim() === '') {
            return '';
        }
        
        try {
            const normalized = data.trim().toLowerCase();
            const encoder = new TextEncoder();
            const dataBuffer = encoder.encode(normalized);
            const hashBuffer = await crypto.subtle.digest('SHA-256', dataBuffer);
            const hashArray = new Uint8Array(hashBuffer);
            
            // Converter para Base64
            let binary = '';
            for (let i = 0; i < hashArray.byteLength; i++) {
                binary += String.fromCharCode(hashArray[i]);
            }
            return btoa(binary);
        } catch (error) {
            console.error('Erro no hash:', error);
            return '';
        }
    }
    
    /**
     * Normaliza telefone para formato E.164 internacional - EMQ OTIMIZADO v2.0
     * Implementa validação rigorosa e formatação precisa para máxima qualidade
     */
    normalizePhone(phone) {
        if (!phone || typeof phone !== 'string') {
            return '';
        }
        
        // Remove tudo exceto números
        const digitsOnly = phone.replace(/\D/g, '');
        
        // Validação mínima de comprimento
        if (digitsOnly.length < 8) {
            console.warn('⚠️ Telefone muito curto:', phone);
            return '';
        }
        
        // BRASIL - Lógica otimizada para números brasileiros
        
        // Celular com 11 dígitos (formato padrão brasileiro)
        if (digitsOnly.length === 11) {
            // Verificar se é celular válido (9 no início do número)
            const ddd = digitsOnly.substring(0, 2);
            const nono = digitsOnly[2];
            
            // Lista de DDDs válidos do Brasil
            const validDDDs = [
                '11', '12', '13', '14', '15', '16', '17', '18', '19', // SP
                '21', '22', '24', // RJ
                '27', '28', // ES
                '31', '32', '33', '34', '35', '37', '38', // MG
                '41', '42', '43', '44', '45', '46', // PR
                '47', '48', '49', // SC
                '51', '53', '54', '55', // RS
                '61', // DF
                '62', '64', // GO
                '63', // TO
                '65', '66', // MT
                '67', // MS
                '68', // AC
                '69', // RO
                '71', '73', '74', '75', '77', // BA
                '79', // SE
                '81', '87', // PE
                '82', // AL
                '83', // PB
                '84', // RN
                '85', '88', // CE
                '86', '89', // PI
                '91', '93', '94', // PA
                '92', '97', // AM
                '95', // RR
                '96', // AP
                '98', '99'  // MA
            ];
            
            if (validDDDs.includes(ddd) && nono === '9') {
                const formatted = `+55${digitsOnly}`;
                console.log('✅ Celular brasileiro normalizado:', formatted);
                return formatted;
            }
        }
        
        // Fixo com 10 dígitos (Brasil)
        if (digitsOnly.length === 10) {
            const ddd = digitsOnly.substring(0, 2);
            const validDDDs = ['11', '12', '13', '14', '15', '16', '17', '18', '19', '21', '22', '24', '27', '28', '31', '32', '33', '34', '35', '37', '38', '41', '42', '43', '44', '45', '46', '47', '48', '49', '51', '53', '54', '55', '61', '62', '64', '63', '65', '66', '67', '68', '69', '71', '73', '74', '75', '77', '79', '81', '87', '82', '83', '84', '85', '88', '86', '89', '91', '93', '94', '92', '97', '95', '96', '98', '99'];
            
            if (validDDDs.includes(ddd)) {
                const formatted = `+55${digitsOnly}`;
                console.log('✅ Telefone fixo brasileiro normalizado:', formatted);
                return formatted;
            }
        }
        
        // Número com 9 dígitos (assumir SP e adicionar 11)
        if (digitsOnly.length === 9 && digitsOnly[0] === '9') {
            const formatted = `+5511${digitsOnly}`;
            console.log('✅ Celular SP (9 dígitos) normalizado:', formatted);
            return formatted;
        }
        
        // Número com 8 dígitos (assumir SP fixo)
        if (digitsOnly.length === 8) {
            const formatted = `+5511${digitsOnly}`;
            console.log('✅ Fixo SP (8 dígitos) normalizado:', formatted);
            return formatted;
        }
        
        // Número com 13 dígitos já com código do país (55)
        if (digitsOnly.length === 13 && digitsOnly.startsWith('55')) {
            const formatted = `+${digitsOnly}`;
            console.log('✅ Número com código país normalizado:', formatted);
            return formatted;
        }
        
        // Número com 12 dígitos (sem código do país)
        if (digitsOnly.length === 12) {
            const formatted = `+55${digitsOnly.substring(2)}`; // Remove possível código duplicado
            console.log('✅ Número 12 dígitos normalizado:', formatted);
            return formatted;
        }
        
        // Se já começa com +, validar formato
        if (phone.startsWith('+')) {
            // Verificar se tem pelo menos 10 dígitos após o +
            if (digitsOnly.length >= 10 && digitsOnly.length <= 15) {
                const formatted = `+${digitsOnly}`;
                console.log('✅ Número internacional validado:', formatted);
                return formatted;
            }
        }
        
        // INTERNACIONAIS - Formatos comuns
        
        // Estados Unidos/Canadá (10 dígitos)
        if (digitsOnly.length === 10 && (digitsOnly[0] >= '2' && digitsOnly[0] <= '9')) {
            const formatted = `+1${digitsOnly}`;
            console.log('✅ Número US/CA normalizado:', formatted);
            return formatted;
        }
        
        // Reino Unido (10-11 dígitos)
        if (digitsOnly.length >= 10 && digitsOnly.length <= 11) {
            const formatted = `+44${digitsOnly}`;
            console.log('✅ Número UK normalizado (tentativa):', formatted);
            return formatted;
        }
        
        console.warn('⚠️ Formato de telefone não reconhecido:', phone, '- Dígitos:', digitsOnly.length);
        return '';
    }
    
    /**
     * Identifica usuário com dados avançados
     */
    async identifyUser(email, phone, userId) {
        console.log('🔍 Identificando usuário...');
        
        try {
            // Validar e processar email
            if (email && email.includes('@')) {
                const normalizedEmail = email.trim().toLowerCase();
                this.userCache.email = normalizedEmail;
                this.userCache.hashedData.email = await this.hashData(normalizedEmail);
                localStorage.setItem('devotly_user_email', normalizedEmail);
                this.qualityMetrics.emailHashSuccess++;
            }
            
            // Validar e processar telefone
            if (phone) {
                const normalizedPhone = this.normalizePhone(phone);
                if (normalizedPhone) {
                    this.userCache.phone = normalizedPhone;
                    this.userCache.hashedData.phone_number = await this.hashData(normalizedPhone);
                    localStorage.setItem('devotly_user_phone', normalizedPhone);
                    this.qualityMetrics.phoneHashSuccess++;
                }
            }
            
            // Processar userId
            if (userId) {
                this.userCache.userId = userId;
                this.userCache.hashedData.external_id = await this.hashData(userId);
                localStorage.setItem('devotly_user_id', userId);
            } else {
                // Gerar userId único
                const generatedId = this.generateUserId();
                this.userCache.userId = generatedId;
                this.userCache.hashedData.external_id = await this.hashData(generatedId);
                localStorage.setItem('devotly_user_id', generatedId);
            }
            
            this.userCache.validated = true;
            
            console.log('✅ Usuário identificado com sucesso');
            console.log('📊 Dados validados:', {
                email: this.userCache.email ? '✓' : '✗',
                phone: this.userCache.phone ? '✓' : '✗',
                userId: this.userCache.userId ? '✓' : '✗',
                ttclid: this.userCache.ttclid ? '✓' : '✗'
            });
            
            return true;
        } catch (error) {
            console.error('Erro na identificação:', error);
            return false;
        }
    }
    
    /**
     * Gera userId único baseado em características do dispositivo e dados disponíveis - EMQ OTIMIZADO
     */
    generateUserId() {
        // Tentar usar dados reais se disponíveis
        const email = this.userCache.email || localStorage.getItem('devotly_auto_email');
        const phone = this.userCache.phone || localStorage.getItem('devotly_auto_phone');
        const name = localStorage.getItem('devotly_auto_name');
        
        let baseComponents = [];
        
        // 1. Priorizar dados reais do usuário
        if (email) {
            baseComponents.push(`email_${btoa(email).replace(/[^a-zA-Z0-9]/g, '').substr(0, 8)}`);
        }
        if (phone) {
            baseComponents.push(`phone_${btoa(phone).replace(/[^a-zA-Z0-9]/g, '').substr(0, 8)}`);
        }
        if (name) {
            baseComponents.push(`name_${btoa(name).replace(/[^a-zA-Z0-9]/g, '').substr(0, 6)}`);
        }
        
        // 2. Adicionar características do dispositivo/sessão
        const deviceFingerprint = [
            navigator.userAgent.slice(0, 30),
            screen.width + 'x' + screen.height,
            navigator.language,
            new Date().getTimezoneOffset().toString(),
            navigator.platform?.slice(0, 10) || 'unknown'
        ];
        
        // 3. Dados de sessão persistentes
        const sessionData = [
            this.userCache.ttclid || 'no_ttclid',
            this.userCache.fbp || 'no_fbp',
            localStorage.getItem('devotly_session_id') || this.generateSessionId()
        ];
        
        // 4. Combinar todos os componentes
        const allComponents = [
            ...baseComponents,
            ...deviceFingerprint,
            ...sessionData,
            Math.random().toString(36).substr(2, 6) // Componente aleatório para unicidade
        ];
        
        const combined = allComponents.join('|');
        const hash = btoa(combined).replace(/[^a-zA-Z0-9]/g, '').substr(0, 20);
        
        const userId = `devotly_${Date.now()}_${hash}`;
        
        console.log('🆔 UserId gerado:', userId);
        console.log('📊 Componentes usados:', {
            hasEmail: !!email,
            hasPhone: !!phone, 
            hasName: !!name,
            hasttclid: !!this.userCache.ttclid,
            components: baseComponents.length
        });
        
        return userId;
    }
    
    /**
     * Gera ID de sessão persistente
     */
    generateSessionId() {
        let sessionId = localStorage.getItem('devotly_session_id');
        if (!sessionId) {
            sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 12)}`;
            localStorage.setItem('devotly_session_id', sessionId);
        }
        return sessionId;
    }
    
    /**
     * Busca dados em formulários da página - EMQ OTIMIZADO
     */
    /**
     * Performar coleta dinâmica de dados - EMQ OTIMIZADO v2.0
     * Coleta ativa e inteligente de dados do usuário em tempo real
     */
    async performDynamicDataCollection() {
        console.log('🎯 Iniciando coleta dinâmica EMQ otimizada...');
        
        try {
            let dataCollected = false;
            
            // 1. COLETA DE EMAIL - Meta: 95%+ cobertura
            const emailData = await this.collectEmailData();
            if (emailData.found) {
                await this.identifyUser(emailData.email, this.userCache.phone, this.userCache.userId);
                dataCollected = true;
                console.log('✅ Email coletado dinamicamente:', emailData.email);
            }
            
            // 2. COLETA DE TELEFONE - Meta: 90%+ cobertura  
            const phoneData = await this.collectPhoneData();
            if (phoneData.found) {
                await this.identifyUser(this.userCache.email, phoneData.phone, this.userCache.userId);
                dataCollected = true;
                console.log('✅ Telefone coletado dinamicamente:', phoneData.phone);
            }
            
            // 3. COLETA DE DADOS PESSOAIS - Para external_id melhorado
            const personalData = await this.collectPersonalData();
            if (personalData.found) {
                // Criar external_id mais rico
                const enhancedUserId = this.generateEnhancedUserId(personalData);
                await this.identifyUser(this.userCache.email, this.userCache.phone, enhancedUserId);
                dataCollected = true;
                console.log('✅ Dados pessoais coletados:', personalData.fields);
            }
            
            // 4. FALLBACK - Garantir external_id sempre presente
            if (!this.userCache.userId) {
                const fallbackId = this.generateUserId();
                await this.identifyUser(this.userCache.email, this.userCache.phone, fallbackId);
                console.log('✅ External_id fallback gerado:', fallbackId);
            }
            
            // 5. VALIDAÇÃO FINAL
            this.userCache.validated = true;
            
            const finalCoverage = {
                email: this.userCache.email ? '✅' : '❌',
                phone: this.userCache.phone ? '✅' : '❌',
                external_id: this.userCache.userId ? '✅' : '❌',
                ttclid: this.userCache.ttclid ? '✅' : '⚪'
            };
            
            console.log('📊 Resultado da coleta dinâmica:', finalCoverage);
            return dataCollected;
            
        } catch (error) {
            console.error('❌ Erro na coleta dinâmica:', error);
            return false;
        }
    }
    
    /**
     * Coleta inteligente de dados de email
     */
    async collectEmailData() {
        const emailSelectors = [
            // Página Create específica
            '#userEmail',
            'input[name="userEmail"]',
            // Seletores genéricos otimizados
            'input[type="email"]:not([value=""])',
            'input[name*="email"]:not([value=""])',
            'input[id*="email"]:not([value=""])',
            'input[placeholder*="email"]:not([value=""])',
            'input[placeholder*="@"]:not([value=""])',
            // Campos preenchidos recentemente
            'input[type="email"]:focus',
            'input[name*="email"]:focus'
        ];
        
        for (const selector of emailSelectors) {
            try {
                const input = document.querySelector(selector);
                if (input && input.value && input.value.includes('@')) {
                    const email = input.value.trim().toLowerCase();
                    if (this.validateEmail(email)) {
                        // Armazenar para uso futuro
                        localStorage.setItem('devotly_auto_email', email);
                        return { found: true, email: email, source: selector };
                    }
                }
            } catch (e) {
                continue;
            }
        }
        
        // Verificar localStorage como fallback
        const storedEmail = localStorage.getItem('devotly_auto_email');
        if (storedEmail && this.validateEmail(storedEmail)) {
            return { found: true, email: storedEmail, source: 'localStorage' };
        }
        
        return { found: false };
    }
    
    /**
     * Coleta inteligente de dados de telefone
     */
    async collectPhoneData() {
        const phoneSelectors = [
            // Página Create específica
            '#userPhone',
            'input[name="userPhone"]',
            // Seletores genéricos otimizados
            'input[type="tel"]:not([value=""])',
            'input[name*="phone"]:not([value=""])',
            'input[name*="Phone"]:not([value=""])',
            'input[id*="phone"]:not([value=""])',
            'input[id*="Phone"]:not([value=""])',
            'input[name*="telefone"]:not([value=""])',
            'input[id*="telefone"]:not([value=""])',
            'input[placeholder*="telefone"]:not([value=""])',
            'input[placeholder*="WhatsApp"]:not([value=""])',
            'input[placeholder*="(99)"]:not([value=""])',
            // Campos preenchidos recentemente
            'input[type="tel"]:focus',
            'input[name*="phone"]:focus'
        ];
        
        for (const selector of phoneSelectors) {
            try {
                const input = document.querySelector(selector);
                if (input && input.value) {
                    const rawPhone = input.value.trim();
                    const normalizedPhone = this.normalizePhone(rawPhone);
                    if (normalizedPhone) {
                        // Armazenar para uso futuro
                        localStorage.setItem('devotly_auto_phone', normalizedPhone);
                        return { found: true, phone: normalizedPhone, source: selector };
                    }
                }
            } catch (e) {
                continue;
            }
        }
        
        // Verificar localStorage como fallback
        const storedPhone = localStorage.getItem('devotly_auto_phone');
        if (storedPhone && this.normalizePhone(storedPhone)) {
            return { found: true, phone: storedPhone, source: 'localStorage' };
        }
        
        return { found: false };
    }
    
    /**
     * Coleta dados pessoais adicionais para external_id aprimorado
     */
    async collectPersonalData() {
        const personalSelectors = {
            name: [
                '#cardTitle', '#userName', 'input[name*="name"]', 'input[id*="name"]',
                'input[name*="Name"]', 'input[id*="Name"]', 'input[placeholder*="nome"]'
            ],
            title: ['#cardTitle', 'input[name*="title"]', 'input[id*="title"]'],
            message: ['#cardMessage', 'textarea[name*="message"]', 'textarea[id*="message"]']
        };
        
        const collectedData = { found: false, fields: {} };
        
        for (const [fieldType, selectors] of Object.entries(personalSelectors)) {
            for (const selector of selectors) {
                try {
                    const input = document.querySelector(selector);
                    if (input && input.value && input.value.trim().length > 2) {
                        collectedData.fields[fieldType] = input.value.trim();
                        collectedData.found = true;
                        
                        // Armazenar para uso futuro
                        localStorage.setItem(`devotly_auto_${fieldType}`, input.value.trim());
                        break;
                    }
                } catch (e) {
                    continue;
                }
            }
        }
        
        // Verificar localStorage para dados persistidos
        const storedFields = ['name', 'title', 'message'];
        for (const field of storedFields) {
            const stored = localStorage.getItem(`devotly_auto_${field}`);
            if (stored && !collectedData.fields[field]) {
                collectedData.fields[field] = stored;
                collectedData.found = true;
            }
        }
        
        return collectedData;
    }
    
    /**
     * Gera external_id enriquecido com dados pessoais
     */
    generateEnhancedUserId(personalData = {}) {
        const timestamp = Date.now();
        const components = [`timestamp_${timestamp}`];
        
        // 1. Dados pessoais se disponíveis
        if (personalData.fields) {
            Object.entries(personalData.fields).forEach(([key, value]) => {
                if (value && value.length > 2) {
                    const encoded = btoa(value.slice(0, 10)).replace(/[^a-zA-Z0-9]/g, '').substr(0, 6);
                    components.push(`${key}_${encoded}`);
                }
            });
        }
        
        // 2. Dados de contato se disponíveis
        if (this.userCache.email) {
            const emailHash = btoa(this.userCache.email.split('@')[0]).replace(/[^a-zA-Z0-9]/g, '').substr(0, 8);
            components.push(`email_${emailHash}`);
        }
        
        if (this.userCache.phone) {
            const phoneHash = btoa(this.userCache.phone.slice(-4)).replace(/[^a-zA-Z0-9]/g, '').substr(0, 6);
            components.push(`phone_${phoneHash}`);
        }
        
        // 3. Fingerprint do dispositivo
        const deviceComponents = [
            navigator.userAgent.slice(0, 20),
            screen.width + 'x' + screen.height,
            navigator.language,
            new Date().getTimezoneOffset().toString()
        ];
        
        const deviceHash = btoa(deviceComponents.join('|')).replace(/[^a-zA-Z0-9]/g, '').substr(0, 10);
        components.push(`device_${deviceHash}`);
        
        // 4. Parâmetros de tracking se disponíveis
        if (this.userCache.ttclid) {
            components.push(`ttclid_${this.userCache.ttclid.substr(0, 8)}`);
        }
        
        // 5. Componente aleatório para unicidade
        const randomComponent = Math.random().toString(36).substr(2, 6);
        components.push(`rnd_${randomComponent}`);
        
        const finalId = `devotly_enhanced_${components.join('_')}`;
        console.log('🆔 External_id enriquecido gerado:', finalId.length, 'caracteres');
        
        return finalId;
    }
    
    /**
     * Executa ttq.identify() no TikTok Pixel com dados atuais
     */
    async executePixelIdentify() {
        if (typeof ttq === 'undefined') {
            console.warn('⚠️ TikTok Pixel não disponível para identify()');
            return false;
        }
        
        try {
            // Preparar dados para identify
            const identifyData = {};
            
            // Email SHA256 (obrigatório para EMQ)
            if (this.userCache.email) {
                identifyData.sha256_email = await this.hashData(this.userCache.email);
                console.log('✅ SHA256 email preparado para identify');
            } else {
                identifyData.sha256_email = ''; // String vazia em vez de undefined
                console.log('⚠️ Email não disponível - enviando string vazia');
            }
            
            // Telefone SHA256 (crítico para EMQ)
            if (this.userCache.phone) {
                identifyData.sha256_phone_number = await this.hashData(this.userCache.phone);
                console.log('✅ SHA256 telefone preparado para identify');
            } else {
                identifyData.sha256_phone_number = ''; // String vazia em vez de undefined
                console.log('⚠️ Telefone não disponível - enviando string vazia');
            }
            
            // External ID (sempre presente)
            if (this.userCache.userId) {
                identifyData.external_id = this.userCache.userId;
                console.log('✅ External_id preparado para identify');
            }
            
            // Parâmetros de tracking adicionais
            if (this.userCache.ttclid) {
                identifyData.ttclid = this.userCache.ttclid;
            }
            if (this.userCache.ttp) {
                identifyData.ttp = this.userCache.ttp;
            }
            if (this.userCache.fbp) {
                identifyData.fbp = this.userCache.fbp;
            }
            if (this.userCache.fbc) {
                identifyData.fbc = this.userCache.fbc;
            }
            
            // Executar ttq.identify
            ttq.identify(identifyData);
            
            console.log('✅ ttq.identify() executado com sucesso');
            console.log('📊 Dados enviados:', {
                sha256_email: identifyData.sha256_email ? '✓ Hash' : '✗ Vazio',
                sha256_phone_number: identifyData.sha256_phone_number ? '✓ Hash' : '✗ Vazio',
                external_id: identifyData.external_id ? '✓ Presente' : '✗ Ausente',
                ttclid: identifyData.ttclid ? '✓ Presente' : '✗ Ausente'
            });
            
            return true;
            
        } catch (error) {
            console.error('❌ Erro ao executar ttq.identify():', error);
            return false;
        }
    }
    
    /**
     * Calcula métricas de cobertura EMQ em tempo real
     */
    calculateCoverageMetrics() {
        const metrics = {
            email_coverage: this.userCache.email ? 100 : 0,
            phone_coverage: this.userCache.phone ? 100 : 0,
            external_id_coverage: this.userCache.userId ? 100 : 0,
            ttclid_coverage: this.userCache.ttclid ? 100 : 0,
            overall_score: 0
        };
        
        // Cálculo do score geral EMQ
        let totalScore = 0;
        let maxScore = 0;
        
        // Email: 40% do score EMQ
        if (metrics.email_coverage > 0) totalScore += 40;
        maxScore += 40;
        
        // Telefone: 35% do score EMQ
        if (metrics.phone_coverage > 0) totalScore += 35;
        maxScore += 35;
        
        // External ID: 15% do score EMQ
        if (metrics.external_id_coverage > 0) totalScore += 15;
        maxScore += 15;
        
        // TTCLID: 10% do score EMQ (bonus)
        if (metrics.ttclid_coverage > 0) totalScore += 10;
        maxScore += 10;
        
        metrics.overall_score = Math.round((totalScore / maxScore) * 100);
        
        return metrics;
    }
    
    autoDetectUserData() {
        const detectedData = {
            email: null,
            phone: null,
            name: null
        };
        
        try {
            // 1. DETECÇÃO DE EMAIL (Meta: 90%+ cobertura)
            const emailSelectors = [
                'input[type="email"]',
                'input[name*="email"]', 
                'input[id*="email"]',
                'input[name*="Email"]',
                'input[id*="userEmail"]',
                'input[placeholder*="email"]',
                'input[placeholder*="@"]'
            ];
            
            for (const selector of emailSelectors) {
                const inputs = document.querySelectorAll(selector);
                for (const input of inputs) {
                    if (input.value && input.value.includes('@') && input.value.includes('.')) {
                        const email = input.value.trim().toLowerCase();
                        if (this.validateEmail(email)) {
                            detectedData.email = email;
                            console.log('📧 Email detectado automaticamente:', email);
                            break;
                        }
                    }
                }
                if (detectedData.email) break;
            }
            
            // 2. DETECÇÃO DE TELEFONE (Meta: 90%+ cobertura)
            const phoneSelectors = [
                'input[type="tel"]',
                'input[name*="phone"]',
                'input[name*="Phone"]', 
                'input[id*="phone"]',
                'input[id*="Phone"]',
                'input[name*="telefone"]',
                'input[id*="telefone"]',
                'input[id*="userPhone"]',
                'input[placeholder*="telefone"]',
                'input[placeholder*="WhatsApp"]',
                'input[placeholder*="(99)"]'
            ];
            
            for (const selector of phoneSelectors) {
                const inputs = document.querySelectorAll(selector);
                for (const input of inputs) {
                    if (input.value && input.value.replace(/\D/g, '').length >= 8) {
                        const phone = input.value.trim();
                        const normalizedPhone = this.normalizePhone(phone);
                        if (normalizedPhone) {
                            detectedData.phone = normalizedPhone;
                            console.log('📱 Telefone detectado automaticamente:', normalizedPhone);
                            break;
                        }
                    }
                }
                if (detectedData.phone) break;
            }
            
            // 3. DETECÇÃO DE NOME (para external_id)
            const nameSelectors = [
                'input[name*="name"]',
                'input[name*="Name"]',
                'input[id*="name"]',
                'input[id*="Name"]',
                'input[id*="userName"]',
                'input[placeholder*="nome"]'
            ];
            
            for (const selector of nameSelectors) {
                const inputs = document.querySelectorAll(selector);
                for (const input of inputs) {
                    if (input.value && input.value.trim().length > 2) {
                        detectedData.name = input.value.trim();
                        console.log('👤 Nome detectado automaticamente:', detectedData.name);
                        break;
                    }
                }
                if (detectedData.name) break;
            }
            
            // 4. AUTO-IDENTIFICAR SE DADOS VÁLIDOS ENCONTRADOS
            if (detectedData.email || detectedData.phone) {
                this.autoIdentifyFromDetection(detectedData);
            }
            
        } catch (error) {
            console.warn('⚠️ Erro na detecção automática:', error);
        }
        
        return detectedData;
    }
    
    /**
     * Valida formato de email
     */
    validateEmail(email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    }
    
    /**
     * Auto-identifica usuário com dados detectados
     */
    async autoIdentifyFromDetection(detectedData) {
        try {
            // Só identifica se temos novos dados válidos
            const hasNewEmail = detectedData.email && detectedData.email !== this.userCache.email;
            const hasNewPhone = detectedData.phone && detectedData.phone !== this.userCache.phone;
            
            if (hasNewEmail || hasNewPhone) {
                console.log('🔍 Auto-identificando usuário com dados detectados...');
                
                // Gerar userId baseado nos dados detectados
                let userId = this.userCache.userId;
                if (!userId && (detectedData.email || detectedData.name)) {
                    const baseData = detectedData.email || detectedData.name || 'anonymous';
                    userId = `devotly_auto_${btoa(baseData).replace(/[^a-zA-Z0-9]/g, '').substr(0, 12)}_${Date.now()}`;
                }
                
                await this.identifyUser(detectedData.email, detectedData.phone, userId);
                
                // Salvar dados detectados
                if (detectedData.email) {
                    localStorage.setItem('devotly_auto_email', detectedData.email);
                }
                if (detectedData.phone) {
                    localStorage.setItem('devotly_auto_phone', detectedData.phone);
                }
                if (detectedData.name) {
                    localStorage.setItem('devotly_auto_name', detectedData.name);
                }
            }
        } catch (error) {
            console.warn('⚠️ Erro na auto-identificação:', error);
        }
    }
    
    /**
     * Prepara dados de Advanced Matching com máxima qualidade - EMQ OTIMIZADO
     */
    async prepareAdvancedMatching() {
        // Tentar detectar dados automaticamente se não temos
        if (!this.userCache.validated || !this.userCache.email || !this.userCache.phone) {
            this.autoDetectUserData();
        }
        
        const baseData = {
            user_agent: navigator.userAgent,
            url: window.location.href,
            referrer: document.referrer || '',
            ip: '', // Será capturado pelo servidor
        };
        
        // EMAIL - Meta: 90%+ cobertura
        if (this.userCache.hashedData.email) {
            baseData.email = this.userCache.hashedData.email;
        } else if (this.userCache.email) {
            baseData.email = await this.hashData(this.userCache.email);
            this.userCache.hashedData.email = baseData.email;
        } else {
            // Tentar detecção last-minute
            const autoData = this.autoDetectUserData();
            if (autoData.email) {
                baseData.email = await this.hashData(autoData.email);
                this.userCache.hashedData.email = baseData.email;
            } else {
                baseData.email = ''; // String vazia em vez de null/undefined
            }
        }
        
        // TELEFONE - Meta: 90%+ cobertura
        if (this.userCache.hashedData.phone_number) {
            baseData.phone_number = this.userCache.hashedData.phone_number;
        } else if (this.userCache.phone) {
            const normalizedPhone = this.normalizePhone(this.userCache.phone);
            if (normalizedPhone) {
                baseData.phone_number = await this.hashData(normalizedPhone);
                this.userCache.hashedData.phone_number = baseData.phone_number;
            } else {
                baseData.phone_number = '';
            }
        } else {
            // Tentar detecção last-minute
            const autoData = this.autoDetectUserData();
            if (autoData.phone) {
                const normalizedPhone = this.normalizePhone(autoData.phone);
                if (normalizedPhone) {
                    baseData.phone_number = await this.hashData(normalizedPhone);
                    this.userCache.hashedData.phone_number = baseData.phone_number;
                } else {
                    baseData.phone_number = '';
                }
            } else {
                baseData.phone_number = '';
            }
        }
        
        // EXTERNAL_ID - Meta: 100% cobertura (sempre garantido)
        if (this.userCache.hashedData.external_id) {
            baseData.external_id = this.userCache.hashedData.external_id;
        } else {
            // Garantir external_id sempre presente
            const userId = this.userCache.userId || this.generateUserId();
            this.userCache.userId = userId;
            baseData.external_id = await this.hashData(userId);
            this.userCache.hashedData.external_id = baseData.external_id;
            localStorage.setItem('devotly_user_id', userId);
        }
        
        // Parâmetros do TikTok - Bonus EMQ
        if (this.userCache.ttclid) {
            baseData.ttclid = this.userCache.ttclid;
        }
        if (this.userCache.ttp) {
            baseData.ttp = this.userCache.ttp;
        }
        
        // Parâmetros do Facebook para cross-platform matching
        if (this.userCache.fbp) {
            baseData.fbp = this.userCache.fbp;
        }
        if (this.userCache.fbc) {
            baseData.fbc = this.userCache.fbc;
        }
        
        // Validação final - Garantir que nunca enviamos null/undefined
        Object.keys(baseData).forEach(key => {
            if (baseData[key] === null || baseData[key] === undefined) {
                baseData[key] = '';
            }
        });
        
        // Log de cobertura EMQ
        const coverage = {
            email: baseData.email !== '' ? '✅' : '❌',
            phone: baseData.phone_number !== '' ? '✅' : '❌', 
            external_id: baseData.external_id !== '' ? '✅' : '❌',
            ttclid: baseData.ttclid ? '✅' : '⚪',
            fbp: baseData.fbp ? '✅' : '⚪'
        };
        
        console.log('📊 Cobertura EMQ:', coverage);
        
        return baseData;
    }
    
    /**
     * Valida valor monetário
     */
    validateValue(value) {
        if (value === null || value === undefined || value === '') {
            return 0.00;
        }
        
        const numValue = parseFloat(value);
        if (isNaN(numValue) || numValue < 0) {
            return 0.00;
        }
        
        return Number(numValue.toFixed(2));
    }
    
    /**
     * CORREÇÃO HTTP 500: Validação rigorosa de content_id
     * Garante que sempre retorna um valor válido, nunca undefined/null
     */
    validateAndGenerateContentId(contentId) {
        try {
            // 1. Se contentId é válido, usar ele
            if (contentId && typeof contentId === 'string' && contentId.trim() !== '') {
                return String(contentId).trim();
            }
            
            // 2. Se contentId é um número válido, converter para string
            if (typeof contentId === 'number' && !isNaN(contentId)) {
                return String(contentId);
            }
            
            // 3. Gerar contentId baseado no contexto da página
            return this.generateContentIdWithContext();
            
        } catch (error) {
            console.error('Erro na validação de content_id:', error);
            return this.generateFallbackContentId();
        }
    }
    
    /**
     * CORREÇÃO HTTP 500: Validação rigorosa de content_name
     * Garante que sempre retorna um valor válido e descritivo
     */
    validateAndGenerateContentName(contentName) {
        try {
            // 1. Se contentName é válido, usar ele
            if (contentName && typeof contentName === 'string' && contentName.trim() !== '') {
                return String(contentName).trim();
            }
            
            // 2. Gerar nome baseado no contexto da página
            return this.generateContentNameWithContext();
            
        } catch (error) {
            console.error('Erro na validação de content_name:', error);
            return 'Conteúdo Devotly';
        }
    }
    
    /**
     * CORREÇÃO HTTP 500: Validação rigorosa de content_type
     * Garante que sempre retorna um valor aceito pelo TikTok Events API
     */
    validateAndGenerateContentType(category) {
        try {
            // Lista de content_type válidos aceitos pelo TikTok
            const validTypes = ['product', 'website'];
            
            // 1. Se category é válido e aceito, usar ele
            if (category && typeof category === 'string') {
                const normalizedCategory = category.toLowerCase().trim();
                if (validTypes.includes(normalizedCategory)) {
                    return normalizedCategory;
                }
            }
            
            // 2. Determinar baseado no contexto da página
            const pageContext = this.detectPageContext();
            if (pageContext.page === 'create' || pageContext.page === 'view') {
                return 'product'; // Ferramentas e cartões como produtos digitais
            }
            
            return 'website'; // Default seguro
            
        } catch (error) {
            console.error('Erro na validação de content_type:', error);
            return 'website'; // Fallback seguro sempre aceito
        }
    }
    
    /**
     * CORREÇÃO HTTP 500: Validação rigorosa de currency
     * Garante que sempre retorna um código de moeda válido
     */
    validateCurrency(currency) {
        try {
            // Lista de moedas válidas comuns
            const validCurrencies = ['BRL', 'USD', 'EUR', 'GBP'];
            
            if (currency && typeof currency === 'string') {
                const normalizedCurrency = currency.toUpperCase().trim();
                if (validCurrencies.includes(normalizedCurrency)) {
                    return normalizedCurrency;
                }
            }
            
            return 'BRL'; // Default para o Brasil
            
        } catch (error) {
            console.error('Erro na validação de currency:', error);
            return 'BRL';
        }
    }
    
    /**
     * Gera content_id baseado no contexto da página atual
     */
    generateContentIdWithContext() {
        const url = window.location.pathname;
        const timestamp = Date.now();
        
        if (url.includes('/create')) {
            return `create_tool_${timestamp}`;
        } else if (url.includes('/view')) {
            const urlParams = new URLSearchParams(window.location.search);
            const cardId = urlParams.get('id') || urlParams.get('cardId');
            return cardId ? `card_${cardId}` : `card_view_${timestamp}`;
        } else if (url === '/' || url.includes('home')) {
            return `home_page_${timestamp}`;
        }
        
        return `content_${timestamp}`;
    }
    
    /**
     * Gera content_name baseado no contexto da página atual
     */
    generateContentNameWithContext() {
        const url = window.location.pathname;
        const title = document.title || 'Devotly';
        
        if (url.includes('/create')) {
            return 'Ferramenta de Criação - Devotly';
        } else if (url.includes('/view')) {
            return title.includes('Devotly') ? title : `${title} - Devotly`;
        } else if (url === '/' || url.includes('home')) {
            return 'Página Inicial - Devotly';
        }
        
        return title.includes('Devotly') ? title : `${title} - Devotly`;
    }
    
    /**
     * Fallback seguro para content_id em caso de erro crítico
     */
    generateFallbackContentId() {
        return `fallback_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }
    
    /**
     * Gera content_group_id baseado no content_id
     */
    generateContentGroupId(contentId) {
        if (!contentId || typeof contentId !== 'string') {
            return 'general';
        }
        
        if (contentId.includes('create')) {
            return 'card_creation';
        } else if (contentId.includes('view') || contentId.includes('card')) {
            return 'card_viewing';
        } else if (contentId.includes('home')) {
            return 'landing';
        }
        
        return 'general';
    }
    
    /**
     * Gera descrição do conteúdo baseada no nome e contexto
     */
    generateContentDescription(contentName, contextOrContentId) {
        if (!contentName || typeof contentName !== 'string') {
            return 'Conteúdo Devotly';
        }
        
        const name = contentName.trim();
        
        // Se já tem uma descrição completa, usar ela
        if (name.includes('Devotly') || name.length > 30) {
            return name;
        }
        
        // Adicionar contexto baseado no tipo de conteúdo
        if (typeof contextOrContentId === 'string') {
            if (contextOrContentId.includes('create')) {
                return `${name} - Ferramenta de Criação Devotly`;
            } else if (contextOrContentId.includes('view') || contextOrContentId.includes('card')) {
                return `${name} - Cartão Digital Devotly`;
            } else if (contextOrContentId.includes('home')) {
                return `${name} - Página Inicial Devotly`;
            }
        } else if (typeof contextOrContentId === 'object' && contextOrContentId.page) {
            if (contextOrContentId.page === 'create') {
                return `${name} - Ferramenta de Criação Devotly`;
            } else if (contextOrContentId.page === 'view') {
                return `${name} - Cartão Digital Devotly`;
            } else if (contextOrContentId.page === 'home') {
                return `${name} - Página Inicial Devotly`;
            }
        }
        
        return `${name} - Devotly`;
    }
    
    /**
     * Calcula qualidade EMQ estimada
     */
    calculateEMQScore(eventData) {
        let score = 0;
        
        // Base score
        score += 20;
        
        // Email (25 pontos)
        if (eventData.email && eventData.email !== '') {
            score += 25;
        }
        
        // Telefone (25 pontos)
        if (eventData.phone_number && eventData.phone_number !== '') {
            score += 25;
        }
        
        // External ID (15 pontos)
        if (eventData.external_id && eventData.external_id !== '') {
            score += 15;
        }
        
        // User Agent (5 pontos)
        if (eventData.user_agent) {
            score += 5;
        }
        
        // TTCLID (10 pontos bonus)
        if (eventData.ttclid) {
            score += 10;
        }
        
        return Math.min(score, 100);
    }
    
    /**
     * Gera ID único para evento
     */
    generateEventId() {
        return `devotly_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }
    
    /**
     * Envia evento para TikTok Pixel e API
     */
    async sendEvent(eventName, eventData = {}, options = {}) {
        try {
            const eventId = this.generateEventId();
            const advancedMatching = await this.prepareAdvancedMatching();
            
            // Preparar dados do evento
            const finalEventData = {
                event_id: eventId,
                ...eventData,
                ...advancedMatching
            };
            
            // Validar valor se presente
            if (finalEventData.value !== undefined) {
                finalEventData.value = this.validateValue(finalEventData.value);
            }
            
            // Garantir currency
            if (finalEventData.currency === undefined) {
                finalEventData.currency = 'BRL';
            }
            
            // Calcular EMQ
            const emqScore = this.calculateEMQScore(finalEventData);
            
            console.log(`🎯 Enviando ${eventName} (EMQ: ${emqScore})`);
            console.log('📊 Qualidade dos dados:', {
                email: finalEventData.email ? '✓ Hash' : '✗ Ausente',
                phone: finalEventData.phone_number ? '✓ Hash' : '✗ Ausente',
                external_id: finalEventData.external_id ? '✓ Hash' : '✗ Ausente',
                ttclid: finalEventData.ttclid ? '✓ Presente' : '✗ Ausente',
                value: finalEventData.value !== undefined ? `✓ ${finalEventData.value}` : 'N/A',
                emq_score: `${emqScore}/100`
            });
            
            // Enviar para TikTok Pixel
            if (typeof ttq !== 'undefined') {
                ttq.track(eventName, finalEventData);
                console.log(`✅ ${eventName} enviado para TikTok Pixel`);
            } else {
                console.warn('⚠️ TikTok Pixel não disponível, adicionando à fila');
                this.addToQueue(eventName, finalEventData);
            }
            
            // Enviar para API Events (server-side)
            await this.sendToServer(eventName, finalEventData, eventId);
            
            // Atualizar métricas
            this.qualityMetrics.eventsSent++;
            this.qualityMetrics.eventsSuccess++;
            this.qualityMetrics.averageEMQ = 
                (this.qualityMetrics.averageEMQ * (this.qualityMetrics.eventsSent - 1) + emqScore) / 
                this.qualityMetrics.eventsSent;
            
            return { success: true, eventId, emqScore };
            
        } catch (error) {
            console.error(`❌ Erro ao enviar ${eventName}:`, error);
            return { success: false, error: error.message };
        }
    }
    
    /**
     * Envia evento para servidor (API Events)
     */
    async sendToServer(eventName, eventData, eventId) {
        try {
            const payload = {
                eventName,
                eventData,
                userData: {
                    email: this.userCache.email || '',
                    phone: this.userCache.phone || '',
                    userId: this.userCache.userId || ''
                },
                eventId,
                timestamp: Date.now(),
                userAgent: navigator.userAgent,
                url: window.location.href,
                referrer: document.referrer
            };
            
            const response = await fetch(`${this.apiUrl}/api/tiktok-v3/track-event`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(payload)
            });
            
            if (response.ok) {
                console.log(`✅ ${eventName} enviado para API Events`);
            } else {
                console.error(`❌ Erro na API Events: ${response.status}`);
            }
        } catch (error) {
            console.error('❌ Erro ao enviar para servidor:', error);
        }
    }
    
    /**
     * Adiciona evento à fila para retry
     */
    addToQueue(eventName, eventData) {
        this.eventQueue.push({
            eventName,
            eventData,
            timestamp: Date.now(),
            attempts: 0
        });
        
        // Salvar fila no localStorage
        try {
            localStorage.setItem('devotly_tiktok_queue', JSON.stringify(this.eventQueue));
        } catch (error) {
            console.warn('Erro ao salvar fila:', error);
        }
    }
    
    /**
     * Processa fila de eventos
     */
    async processQueue() {
        if (this.isProcessingQueue || this.eventQueue.length === 0) {
            return;
        }
        
        this.isProcessingQueue = true;
        
        try {
            const eventsToProcess = [...this.eventQueue];
            this.eventQueue = [];
            
            for (const event of eventsToProcess) {
                if (typeof ttq !== 'undefined' && event.attempts < 3) {
                    ttq.track(event.eventName, event.eventData);
                    console.log(`🔄 Evento da fila enviado: ${event.eventName}`);
                } else if (event.attempts < 3) {
                    event.attempts++;
                    this.eventQueue.push(event);
                }
            }
            
            // Atualizar localStorage
            localStorage.setItem('devotly_tiktok_queue', JSON.stringify(this.eventQueue));
            
        } catch (error) {
            console.error('Erro ao processar fila:', error);
        } finally {
            this.isProcessingQueue = false;
        }
    }
    
    /**
     * Inicia processador da fila
     */
    startQueueProcessor() {
        // Carregar fila do localStorage
        try {
            const savedQueue = localStorage.getItem('devotly_tiktok_queue');
            if (savedQueue) {
                this.eventQueue = JSON.parse(savedQueue);
            }
        } catch (error) {
            console.warn('Erro ao carregar fila:', error);
        }
        
        // Processar fila periodicamente
        setInterval(() => {
            this.processQueue();
        }, 5000);
        
        // Processar quando TikTok Pixel carregar
        if (typeof ttq !== 'undefined') {
            this.processQueue();
        }
    }
    
    /**
     * Configura listeners de eventos - EMQ OTIMIZADO
     */
    setupEventListeners() {
        // Auto-detect quando TikTok carregar
        document.addEventListener('DOMContentLoaded', () => {
            if (typeof ttq !== 'undefined') {
                this.processQueue();
            }
            // Detectar dados automaticamente no carregamento
            setTimeout(() => this.autoDetectUserData(), 500);
            
            // Configurar listeners específicos da página Create
            this.setupCreatePageListeners();
        });
        
        // Processar quando página ficar visível
        document.addEventListener('visibilitychange', () => {
            if (!document.hidden) {
                this.processQueue();
                this.autoDetectUserData();
            }
        });
        
        // LISTENERS PARA DETECÇÃO EM TEMPO REAL
        this.setupFormListeners();
        this.setupInputListeners();
        
        // ⚠️ REMOÇÃO DO AUTO-TRACK PAGEVIEW
        // Cada página deve controlar seu próprio PageView com valor específico
        // para garantir ROAS correto no TikTok Ads
        console.log('🎯 TikTok Events v3.0: PageView manual para controle de ROAS');
    }
    
    /**
     * Configurar listeners específicos para página Create - EMQ OTIMIZADO
     */
    setupCreatePageListeners() {
        // Verificar se estamos na página create
        if (!window.location.pathname.includes('/create')) {
            return;
        }
        
        console.log('🎯 Configurando listeners específicos da página Create...');
        
        // 1. LISTENER PARA EMAIL (CAMPO CRÍTICO EMQ)
        const setupEmailListener = () => {
            const emailInput = document.querySelector('#userEmail');
            if (emailInput) {
                // Listener para coleta em tempo real
                emailInput.addEventListener('input', async (event) => {
                    const email = event.target.value.trim().toLowerCase();
                    if (email.includes('@') && this.validateEmail(email)) {
                        console.log('✅ Email válido detectado em tempo real:', email);
                        await this.identifyUser(email, this.userCache.phone, this.userCache.userId);
                        
                        // Executar ttq.identify imediatamente
                        await this.executePixelIdentify();
                    }
                });
                
                // Listener para quando campo perde foco
                emailInput.addEventListener('blur', async (event) => {
                    const email = event.target.value.trim().toLowerCase();
                    if (email.includes('@') && this.validateEmail(email)) {
                        console.log('✅ Email confirmado no blur:', email);
                        await this.identifyUser(email, this.userCache.phone, this.userCache.userId);
                        await this.executePixelIdentify();
                        
                        // Calcular e mostrar cobertura EMQ
                        const coverage = this.calculateCoverageMetrics();
                        console.log('📊 EMQ Score atualizado:', coverage.overall_score + '/100');
                    }
                });
                
                console.log('✅ Listener de email configurado');
            }
        };
        
        // 2. LISTENER PARA TELEFONE (CAMPO CRÍTICO EMQ)
        const setupPhoneListener = () => {
            const phoneInput = document.querySelector('#userPhone');
            if (phoneInput) {
                // Listener para coleta em tempo real
                phoneInput.addEventListener('input', async (event) => {
                    const phone = event.target.value.trim();
                    const normalizedPhone = this.normalizePhone(phone);
                    if (normalizedPhone) {
                        console.log('✅ Telefone válido detectado em tempo real:', normalizedPhone);
                        await this.identifyUser(this.userCache.email, normalizedPhone, this.userCache.userId);
                        
                        // Executar ttq.identify imediatamente
                        await this.executePixelIdentify();
                    }
                });
                
                // Listener para quando campo perde foco
                phoneInput.addEventListener('blur', async (event) => {
                    const phone = event.target.value.trim();
                    const normalizedPhone = this.normalizePhone(phone);
                    if (normalizedPhone) {
                        console.log('✅ Telefone confirmado no blur:', normalizedPhone);
                        await this.identifyUser(this.userCache.email, normalizedPhone, this.userCache.userId);
                        await this.executePixelIdentify();
                        
                        // Calcular e mostrar cobertura EMQ
                        const coverage = this.calculateCoverageMetrics();
                        console.log('📊 EMQ Score atualizado:', coverage.overall_score + '/100');
                    }
                });
                
                console.log('✅ Listener de telefone configurado');
            }
        };
        
        // 3. LISTENER PARA DADOS PESSOAIS (EXTERNAL_ID ENRIQUECIDO)
        const setupPersonalDataListeners = () => {
            const personalFields = ['#cardTitle', '#cardMessage', '#cardName'];
            
            personalFields.forEach(selector => {
                const input = document.querySelector(selector);
                if (input) {
                    input.addEventListener('blur', async (event) => {
                        if (event.target.value && event.target.value.trim().length > 2) {
                            console.log('✅ Dados pessoais detectados:', selector);
                            
                            // Gerar external_id enriquecido
                            const personalData = await this.collectPersonalData();
                            if (personalData.found) {
                                const enhancedId = this.generateEnhancedUserId(personalData);
                                await this.identifyUser(this.userCache.email, this.userCache.phone, enhancedId);
                                await this.executePixelIdentify();
                            }
                        }
                    });
                }
            });
            
            console.log('✅ Listeners de dados pessoais configurados');
        };
        
        // 4. LISTENER PARA BOTÕES (TRACKING EMQ OTIMIZADO COM VALUE)
        const setupButtonListeners = () => {
            // Interceptar todos os cliques em botões na página create
            document.addEventListener('click', async (event) => {
                const button = event.target.closest('button, .btn, .cta-button, [role="button"]');
                if (button && button.offsetParent !== null) { // Elemento visível
                    const buttonText = button.textContent?.trim() || button.getAttribute('aria-label') || 'Botão';
                    
                    // Classificar tipo de botão e definir valor baseado na importância para ROAS
                    let buttonType = 'general';
                    let buttonValue = 1; // Valor mínimo padrão
                    
                    if (button.classList.contains('btn-next') || buttonText.includes('Próximo') || buttonText.includes('Continuar')) {
                        buttonType = 'navigation_next';
                        buttonValue = 3; // Progressão no funil
                    } else if (button.classList.contains('btn-prev') || buttonText.includes('Anterior') || buttonText.includes('Voltar')) {
                        buttonType = 'navigation_prev';
                        buttonValue = 1; // Menor valor para voltar
                    } else if (buttonText.includes('Finalizar') || buttonText.includes('Criar') || buttonText.includes('Concluir')) {
                        buttonType = 'completion';
                        buttonValue = 20; // Alto valor para completar criação
                    } else if (buttonText.includes('Plano') || buttonText.includes('Escolher')) {
                        buttonType = 'plan_selection';
                        buttonValue = 15; // Alto valor para seleção de plano
                    } else if (buttonText.includes('Upload') || buttonText.includes('Enviar')) {
                        buttonType = 'content_upload';
                        buttonValue = 8; // Valor médio para upload de conteúdo
                    } else if (buttonText.includes('Preview') || buttonText.includes('Visualizar')) {
                        buttonType = 'preview';
                        buttonValue = 5; // Valor médio para preview
                    } else if (buttonText.includes('Versículo') || buttonText.includes('Música')) {
                        buttonType = 'content_selection';
                        buttonValue = 6; // Valor médio para seleção de conteúdo
                    } else if (buttonText.includes('Copiar') || buttonText.includes('Compartilhar')) {
                        buttonType = 'sharing';
                        buttonValue = 10; // Valor alto para compartilhamento
                    } else {
                        buttonType = 'general';
                        buttonValue = 2; // Valor baixo para ações gerais
                    }
                    
                    // Executar coleta dinâmica e tracking COM VALUE OBRIGATÓRIO
                    console.log(`🎯 Botão clicado: "${buttonText}" (${buttonType}) - Valor: R$ ${buttonValue}`);
                    
                    // Aguardar um pouco para não bloquear o clique
                    setTimeout(async () => {
                        try {
                            await this.performDynamicDataCollection();
                            await this.executePixelIdentify();
                            await this.trackClickButton(buttonText, buttonType, buttonValue); // VALUE SEMPRE INCLUÍDO
                        } catch (error) {
                            console.error('❌ Erro no tracking do botão:', error);
                        }
                    }, 50);
                }
            }, { passive: true }); // Não bloquear o evento
            
            console.log('✅ Listeners de botões configurados');
        };
        
        // Executar configurações com retry para elementos que podem não estar prontos
        const executeWithRetry = (fn, maxRetries = 5) => {
            let retries = 0;
            const tryExecute = () => {
                try {
                    fn();
                } catch (error) {
                    if (retries < maxRetries) {
                        retries++;
                        setTimeout(tryExecute, 500 * retries);
                    } else {
                        console.warn('⚠️ Falha ao configurar listener após', maxRetries, 'tentativas');
                    }
                }
            };
            tryExecute();
        };
        
        // Configurar todos os listeners
        executeWithRetry(setupEmailListener);
        executeWithRetry(setupPhoneListener);
        executeWithRetry(setupPersonalDataListeners);
        executeWithRetry(setupButtonListeners);
        
        console.log('🎯 Listeners da página Create configurados com sucesso!');
    }
    
    /**
     * Configura listeners para formulários
     */
    setupFormListeners() {
        // Listener para submissão de formulários (sem captura para não interferir)
        document.addEventListener('submit', (event) => {
            // Não interferir com botões de navegação
            if (event.target.closest('.btn-next, .btn-prev, .navigation-button')) {
                return;
            }
            console.log('📋 Formulário submetido, detectando dados...');
            // Usar setTimeout para não interferir com o processamento normal
            setTimeout(() => this.autoDetectUserData(), 10);
        }, false); // Mudado para false para não capturar
        
        // Listener para mudanças em formulários (sem captura)
        document.addEventListener('change', (event) => {
            // Não interferir com elementos de navegação
            if (event.target.closest('.btn-next, .btn-prev, .navigation-button')) {
                return;
            }
            if (event.target.matches('input[type="email"], input[name*="email"], input[id*="email"]')) {
                console.log('📧 Campo de email alterado');
                setTimeout(() => this.autoDetectUserData(), 100);
            }
            if (event.target.matches('input[type="tel"], input[name*="phone"], input[id*="phone"]')) {
                console.log('📱 Campo de telefone alterado');
                setTimeout(() => this.autoDetectUserData(), 100);
            }
        }, false); // Mudado para false para não capturar
    }
    
    /**
     * Configura listeners para campos de input
     */
    setupInputListeners() {
        // Listener para blur (quando usuário sai do campo) - sem captura
        document.addEventListener('blur', (event) => {
            if (event.target.matches('input[type="email"], input[name*="email"], input[id*="email"]')) {
                if (event.target.value && event.target.value.includes('@')) {
                    console.log('📧 Email preenchido:', event.target.value);
                    setTimeout(() => this.autoDetectUserData(), 100);
                }
            }
            if (event.target.matches('input[type="tel"], input[name*="phone"], input[id*="phone"]')) {
                if (event.target.value && event.target.value.replace(/\D/g, '').length >= 8) {
                    console.log('📱 Telefone preenchido:', event.target.value);
                    setTimeout(() => this.autoDetectUserData(), 100);
                }
            }
        }, false); // Mudado para false para não capturar
        
        // Detectar dados a cada 3 segundos (para capturar preenchimento automático)
        setInterval(() => {
            if (!this.userCache.validated || (!this.userCache.email || !this.userCache.phone)) {
                this.autoDetectUserData();
            }
        }, 3000);
    }
    
    // ============================================================================
    // MÉTODOS DE EVENTOS ESPECÍFICOS
    // ============================================================================
    
    /**
     * PageView - Visualização de página com valor para ROAS
     * @param {number} value - Valor estimado da página (opcional, será calculado automaticamente se não fornecido)
     * @param {string} currency - Moeda (padrão: BRL)
     */
    async trackPageView(value = null, currency = 'BRL') {
        // Auto-detectar dados se não temos
        if (!this.userCache.validated) {
            const autoData = this.autoDetectUserData();
            if (autoData.email || autoData.phone) {
                await this.identifyUser(autoData.email, autoData.phone);
            }
        }
        
        // Calcular valor automaticamente se não fornecido
        if (value === null) {
            value = this.calculatePageValue();
            console.log(`🤖 PageView valor auto-calculado: R$ ${value}`);
        } else {
            console.log(`🎯 PageView valor específico: R$ ${value}`);
        }
        
        console.log(`📄 PageView disparado - Valor: R$ ${value}, Moeda: ${currency}`);
        
        return this.sendEvent('PageView', {
            content_name: document.title,
            content_category: 'page_view',
            value: value,
            currency: currency
        });
    }
    
    /**
     * Calcula o valor estimado da página atual para ROAS
     */
    calculatePageValue() {
        const path = window.location.pathname.toLowerCase();
        const hostname = window.location.hostname;
        
        // Valores baseados no funil de conversão e potencial de negócio
        if (path.includes('success') || path.includes('pagamento-confirmado')) {
            return 50; // Página de sucesso - alta conversão
        } else if (path.includes('checkout') || path.includes('pagamento')) {
            return 30; // Página de checkout - intenção de compra alta
        } else if (path.includes('create') || path.includes('criar')) {
            return 25; // Página de criação - engajamento alto
        } else if (path.includes('view') || path.includes('cartao') || path.includes('card')) {
            return 15; // Visualização de cartão - engajamento médio
        } else if (path.includes('pricing') || path.includes('planos') || path.includes('precos')) {
            return 20; // Página de preços - interesse comercial
        } else if (path === '/' || path.includes('home') || path.includes('index')) {
            return 10; // Página inicial - entrada no funil
        } else if (path.includes('about') || path.includes('sobre')) {
            return 8; // Página sobre - interesse na marca
        } else if (path.includes('contact') || path.includes('contato')) {
            return 12; // Página de contato - lead potential
        } else if (path.includes('blog') || path.includes('artigo')) {
            return 5; // Conteúdo - SEO e engajamento
        } else if (path.includes('termos') || path.includes('privacidade') || path.includes('legal')) {
            return 2; // Páginas legais - baixo valor comercial
        } else if (path.includes('pending') || path.includes('aguardando')) {
            return 25; // Página de pagamento pendente - meio do funil
        } else if (path.includes('test') || hostname.includes('localhost')) {
            return 1; // Páginas de teste - valor mínimo
        } else {
            return 5; // Valor padrão para outras páginas
        }
    }
    
    /**
     * ViewContent - Visualização de conteúdo OTIMIZADO para EMQ v2.2
     * CORREÇÃO: Validação rigorosa para prevenir HTTP 500 e content_id undefined
     */
    async trackViewContent(contentId, contentName, value = null, currency = 'BRL', category = 'product') {
        try {
            console.log('👁️ Iniciando ViewContent com validação rigorosa...');
            
            // 1. COLETA DINÂMICA OBRIGATÓRIA
            if (!this.userCache.validated) {
                console.log('🔍 Detectando dados antes do evento ViewContent...');
                this.autoDetectUserData();
            }
            
            // 2. VALIDAÇÃO RIGOROSA DE DADOS CRÍTICOS - PREVINE HTTP 500
            const validContentId = this.validateAndGenerateContentId(contentId);
            const validContentName = this.validateAndGenerateContentName(contentName);
            const validCategory = this.validateAndGenerateContentType(category);
            const validCurrency = this.validateCurrency(currency);
            const validValue = this.validateValue(value);
            
            console.log('� Validação completa:', {
                original: { contentId, contentName, category, value, currency },
                validated: { 
                    content_id: validContentId, 
                    content_name: validContentName,
                    content_type: validCategory,
                    value: validValue,
                    currency: validCurrency
                }
            });
            
            // 3. GARANTIR QUE CAMPOS CRÍTICOS NÃO SEJAM UNDEFINED/NULL
            if (!validContentId || !validContentName || !validCategory) {
                throw new Error('Campos críticos inválidos para ViewContent');
            }
            
            // 4. DETECTAR CONTEXTO DA PÁGINA
            const pageContext = this.detectPageContext();
            
            // 5. CONSTRUIR PAYLOAD SEGURO E VALIDADO
            const eventData = {
                content_id: String(validContentId),
                content_name: String(validContentName),
                content_type: String(validCategory),
                currency: String(validCurrency),
                // Dados enriquecidos para EMQ
                content_category: String(validCategory),
                content_group_id: String(pageContext.group || 'general'),
                description: String(this.generateContentDescription(validContentName, pageContext)),
                brand: 'Devotly',
                contents: [{
                    id: String(validContentId),
                    name: String(validContentName),
                    category: String(validCategory),
                    quantity: 1,
                    price: validValue || 0,
                    brand: 'Devotly',
                    item_group_id: String(pageContext.group || 'general')
                }]
            };
            
            // 6. ADICIONAR VALUE APENAS SE VÁLIDO E POSITIVO
            if (validValue !== null && validValue > 0) {
                eventData.value = validValue;
            }
            
            console.log(`✅ ViewContent validado: ${validContentName} - EMQ Score estimado:`, this.calculateEMQScore(eventData));
            
            return this.sendEvent('ViewContent', eventData);
            
        } catch (error) {
            console.error('❌ Erro em trackViewContent:', error);
            return { success: false, error: error.message };
        }
    }
    
    /**
     * Detecta contexto da página atual para melhorar categorização
     * Atualizado para usar content_type válidos no TikTok
     */
    detectPageContext() {
        const url = window.location.pathname;
        const hostname = window.location.hostname;
        
        if (url.includes('/create')) {
            return {
                page: 'create',
                group: 'card_creation',
                funnel_stage: 'consideration',
                content_type: 'product' // Ferramenta de criação como produto
            };
        } else if (url.includes('/view')) {
            return {
                page: 'view',
                group: 'card_viewing',
                funnel_stage: 'engagement',
                content_type: 'product' // Cartão como produto digital
            };
        } else if (url === '/' || url.includes('home')) {
            return {
                page: 'home',
                group: 'landing',
                funnel_stage: 'awareness',
                content_type: 'website' // Página inicial como website
            };
        }
        
        return {
            page: 'other',
            group: 'general',
            funnel_stage: 'awareness',
            content_type: 'website' // Default como website
        };
    }
    
    /**
     * Melhora a categoria do conteúdo baseado no contexto
     * Usa apenas valores válidos aceitos pelo TikTok Events API
     */
    enhanceContentCategory(originalCategory, pageContext) {
        if (pageContext.page === 'create') {
            // Página de criação = ferramenta/produto
            return 'product';
        } else if (pageContext.page === 'view') {
            // Visualização de cartão = produto digital
            return 'product';
        } else if (pageContext.page === 'home') {
            // Página inicial = landing page
            return 'website';
        }
        
        // Default para conteúdo geral
        return 'website';
    }
    
    /**
     * Gera descrição rica do conteúdo
     */
    generateContentDescription(contentName, pageContext) {
        const baseDescription = contentName || 'Conteúdo';
        
        if (pageContext.page === 'create') {
            return `Ferramenta de criação: ${baseDescription} - Devotly`;
        } else if (pageContext.page === 'view') {
            return `Cartão digital: ${baseDescription} - Devotly`;
        } else if (pageContext.page === 'home') {
            return `Página inicial: ${baseDescription} - Devotly`;
        }
        
        return `${baseDescription} - Devotly`;
    }
    
    /**
     * Gera ID único para conteúdo quando não fornecido
     */
    generateContentId() {
        const timestamp = Date.now();
        const random = Math.random().toString(36).substr(2, 5);
        const pageContext = this.detectPageContext();
        return `${pageContext.page}_${timestamp}_${random}`;
    }
    
    /**
     * Purchase - Compra finalizada
     */
    async trackPurchase(contentId, contentName, value, currency = 'BRL', category = 'product') {
        // Purchase DEVE ter valor > 0
        const validValue = this.validateValue(value);
        if (validValue <= 0) {
            console.error('❌ Purchase requer value > 0');
            return { success: false, error: 'Value must be > 0' };
        }
        
        // Validar content_id e content_name
        const validContentId = contentId && contentId.trim() ? String(contentId).trim() : this.generateContentId();
        const validContentName = contentName && contentName.trim() ? String(contentName).trim() : 'Produto';
        
        return this.sendEvent('Purchase', {
            content_id: validContentId,
            content_name: validContentName,
            content_type: String(category),
            value: validValue,
            currency: String(currency),
            contents: [{
                id: validContentId,
                name: validContentName,
                category: String(category),
                quantity: 1,
                price: validValue
            }]
        });
    }
    
    /**
     * InitiateCheckout - Início de checkout
     */
    async trackInitiateCheckout(contentId, contentName, value, currency = 'BRL', category = 'product') {
        console.log(`🎯 [TikTok] INITIATE CHECKOUT DISPARADO:`, {
            contentId,
            contentName,
            value,
            currency,
            category
        });
        
        const validValue = this.validateValue(value);
        
        // Validar content_id e content_name
        const validContentId = contentId && contentId.trim() ? String(contentId).trim() : this.generateContentId();
        const validContentName = contentName && contentName.trim() ? String(contentName).trim() : 'Produto';
        
        console.log(`📊 [TikTok] DADOS VALIDADOS:`, {
            validContentId,
            validContentName,
            validValue,
            currency: String(currency)
        });
        
        return this.sendEvent('InitiateCheckout', {
            content_id: validContentId,
            content_name: validContentName,
            content_type: String(category),
            value: validValue,
            currency: String(currency),
            contents: [{
                id: validContentId,
                name: validContentName,
                category: String(category),
                quantity: 1,
                price: validValue
            }]
        });
    }
    
    /**
     * ClickButton - Clique em botão - EMQ OTIMIZADO v2.0
     * Implementa coleta dinâmica e ttq.identify() antes do envio
     */
    async trackClickButton(buttonText, buttonType = 'cta', value = null) {
        // 1. COLETA DINÂMICA OBRIGATÓRIA - Sempre antes de eventos de botão
        console.log('🔍 Iniciando coleta dinâmica para evento ClickButton...');
        await this.performDynamicDataCollection();
        
        // 2. TTQ.IDENTIFY OBRIGATÓRIO - Enviar dados para TikTok Pixel antes do evento
        await this.executePixelIdentify();
        
        // 3. VALIDAÇÃO DE COBERTURA EMQ
        const coverage = this.calculateCoverageMetrics();
        console.log('� Cobertura EMQ antes do evento ClickButton:', coverage);
        
        // 4. ENVIAR EVENTO COM DADOS VALIDADOS RIGOROSAMENTE
        const validButtonText = buttonText && typeof buttonText === 'string' && buttonText.trim() !== '' 
            ? String(buttonText).trim() 
            : 'Botão';
        
        const validButtonType = buttonType && typeof buttonType === 'string' && buttonType.trim() !== '' 
            ? String(buttonType).trim() 
            : 'cta';
        
        const validValue = value !== null ? this.validateValue(value) : null;
        
        console.log('✅ ClickButton validado:', {
            button_text: validButtonText,
            button_type: validButtonType,
            value: validValue
        });
        
        // 5. CONSTRUIR PAYLOAD SEGURO
        const eventData = {
            button_text: validButtonText,
            button_type: validButtonType
        };
        
        // Adicionar value apenas se válido e positivo
        if (validValue !== null && validValue > 0) {
            eventData.value = validValue;
        }
        
        return this.sendEvent('ClickButton', eventData);
    }
    
    /**
     * Contact - Formulário de contato - EMQ OTIMIZADO
     */
    async trackContact(contactType = 'form', value = 5) {
        // Detectar dados automaticamente antes do evento
        if (!this.userCache.validated) {
            console.log('🔍 Detectando dados antes do evento Contact...');
            this.autoDetectUserData();
        }
        
        return this.sendEvent('Contact', {
            contact_type: String(contactType),
            value: this.validateValue(value),
            currency: 'BRL'
        });
    }
    
    /**
     * Lead - Geração de lead - EMQ OTIMIZADO
     */
    async trackLead(leadType = 'lead', value = 10) {
        // Detectar dados automaticamente antes do evento
        if (!this.userCache.validated) {
            console.log('🔍 Detectando dados antes do evento Lead...');
            this.autoDetectUserData();
        }
        
        return this.sendEvent('Lead', {
            lead_type: String(leadType),
            value: this.validateValue(value),
            currency: 'BRL'
        });
    }
    
    /**
     * AddToCart - Adicionar ao carrinho - EMQ OTIMIZADO
     */
    async trackAddToCart(contentId, contentName, value, currency = 'BRL', category = 'product') {
        // Detectar dados automaticamente antes do evento
        if (!this.userCache.validated) {
            console.log('🔍 Detectando dados antes do evento AddToCart...');
            this.autoDetectUserData();
        }
        
        const validValue = this.validateValue(value);
        
        return this.sendEvent('AddToCart', {
            content_id: String(contentId || 'unknown'),
            content_name: String(contentName || 'Produto'),
            content_type: String(category),
            value: validValue,
            currency: String(currency),
            contents: [{
                id: String(contentId || 'unknown'),
                name: String(contentName || 'Produto'),
                category: String(category),
                quantity: 1,
                price: validValue
            }]
        });
    }
    
    /**
     * AddPaymentInfo - Adicionar informações de pagamento - EMQ OTIMIZADO
     */
    async trackAddPaymentInfo(contentId, contentName, value, currency = 'BRL', category = 'subscription') {
        // Detectar dados automaticamente antes do evento
        if (!this.userCache.validated) {
            console.log('🔍 Detectando dados antes do evento AddPaymentInfo...');
            this.autoDetectUserData();
        }
        
        const validValue = this.validateValue(value);
        
        console.log(`💳 AddPaymentInfo: ${contentName} - R$ ${validValue}`);
        
        return this.sendEvent('AddPaymentInfo', {
            content_id: String(contentId || 'payment_info'),
            content_name: String(contentName || 'Informações de Pagamento'),
            content_type: String(category),
            value: validValue,
            currency: String(currency),
            payment_method: 'mercadopago',
            contents: [{
                id: String(contentId || 'payment_info'),
                name: String(contentName || 'Informações de Pagamento'),
                category: String(category),
                quantity: 1,
                price: validValue
            }]
        });
    }

    // ============================================================================
    // MÉTODOS UTILITÁRIOS
    // ============================================================================
    
    getCookie(name) {
        const value = `; ${document.cookie}`;
        const parts = value.split(`; ${name}=`);
        if (parts.length === 2) return parts.pop().split(';').shift();
        return null;
    }
    
    setCookie(name, value, days) {
        const expires = new Date();
        expires.setTime(expires.getTime() + (days * 24 * 60 * 60 * 1000));
        document.cookie = `${name}=${value};expires=${expires.toUTCString()};path=/;SameSite=Lax`;
    }
    
    /**
     * Obtém métricas de qualidade EMQ
     */
    getQualityMetrics() {
        const emailCoverage = this.userCache.hashedData.email !== '' ? 100 : 0;
        const phoneCoverage = this.userCache.hashedData.phone_number !== '' ? 100 : 0;
        const externalIdCoverage = this.userCache.hashedData.external_id !== '' ? 100 : 0;
        
        const averageCoverage = (emailCoverage + phoneCoverage + externalIdCoverage) / 3;
        
        return {
            ...this.qualityMetrics,
            userDataQuality: {
                email: !!this.userCache.email,
                phone: !!this.userCache.phone,
                userId: !!this.userCache.userId,
                ttclid: !!this.userCache.ttclid,
                validated: this.userCache.validated
            },
            emqCoverage: {
                email: emailCoverage,
                phone: phoneCoverage,
                external_id: externalIdCoverage,
                average: averageCoverage,
                target: 90 // Meta de cobertura
            },
            emqScore: {
                current: this.qualityMetrics.averageEMQ,
                target: 70,
                status: this.qualityMetrics.averageEMQ >= 70 ? '✅ Meta atingida' : '🎯 Em progresso'
            },
            recommendations: this.getEMQRecommendations()
        };
    }
    
    /**
     * Gera recomendações para melhorar EMQ
     */
    getEMQRecommendations() {
        const recommendations = [];
        
        if (!this.userCache.email) {
            recommendations.push('📧 Implementar captura de email nos formulários');
        }
        if (!this.userCache.phone) {
            recommendations.push('📱 Adicionar campo de telefone opcional');
        }
        if (!this.userCache.ttclid) {
            recommendations.push('🔗 Implementar parâmetros de tracking nas URLs');
        }
        if (this.qualityMetrics.averageEMQ < 70) {
            recommendations.push('🎯 Melhorar identificação do usuário antes dos eventos');
        }
        
        return recommendations;
    }
    
    /**
     * Monitora e reporta EMQ score em tempo real - DASHBOARD EMQ
     */
    startEMQMonitoring() {
        if (this.emqMonitoringActive) {
            return; // Já está ativo
        }
        
        this.emqMonitoringActive = true;
        console.log('📊 EMQ Monitoring iniciado...');
        
        // Monitor de cobertura a cada 10 segundos
        this.emqMonitorInterval = setInterval(() => {
            const coverage = this.calculateCoverageMetrics();
            const quality = this.getQualityMetrics();
            
            // Log apenas se houve mudança significativa
            if (Math.abs(coverage.overall_score - (this.lastEMQScore || 0)) >= 5) {
                console.log('📊 EMQ Status Update:', {
                    score: `${coverage.overall_score}/100`,
                    email: coverage.email_coverage > 0 ? '✅' : '❌',
                    phone: coverage.phone_coverage > 0 ? '✅' : '❌',
                    external_id: coverage.external_id_coverage > 0 ? '✅' : '❌',
                    ttclid: coverage.ttclid_coverage > 0 ? '✅' : '⚪',
                    events_sent: quality.eventsSent,
                    avg_emq: Math.round(quality.averageEMQ)
                });
                
                this.lastEMQScore = coverage.overall_score;
                
                // Alert se EMQ estiver abaixo do target
                if (coverage.overall_score < 70 && quality.eventsSent > 0) {
                    console.warn('⚠️ EMQ Score abaixo do target de 70 pontos!');
                    this.suggestEMQImprovements(coverage);
                }
            }
        }, 10000);
        
        // Monitor de página Create específico
        if (window.location.pathname.includes('/create')) {
            this.startCreatePageEMQMonitoring();
        }
    }
    
    /**
     * Monitor específico para página Create
     */
    startCreatePageEMQMonitoring() {
        console.log('🎯 EMQ Monitor da página Create ativo');
        
        // Verificar campos críticos a cada 5 segundos
        this.createEMQInterval = setInterval(() => {
            const emailField = document.querySelector('#userEmail');
            const phoneField = document.querySelector('#userPhone');
            
            let alerts = [];
            
            // Verificar se email está preenchido
            if (emailField && emailField.value && !this.userCache.email) {
                alerts.push('Email detectado no campo mas não processado');
                this.performDynamicDataCollection();
            }
            
            // Verificar se telefone está preenchido
            if (phoneField && phoneField.value && !this.userCache.phone) {
                alerts.push('Telefone detectado no campo mas não processado');
                this.performDynamicDataCollection();
            }
            
            // Log alertas se houver
            if (alerts.length > 0) {
                console.log('🔄 EMQ Auto-correção:', alerts);
            }
        }, 5000);
    }
    
    /**
     * Sugestões para melhorar EMQ
     */
    suggestEMQImprovements(coverage) {
        const suggestions = [];
        
        if (coverage.email_coverage === 0) {
            suggestions.push('• Adicionar coleta de email obrigatória');
        }
        
        if (coverage.phone_coverage === 0) {
            suggestions.push('• Implementar coleta de telefone (meta: 90%+)');
        }
        
        if (coverage.external_id_coverage === 0) {
            suggestions.push('• Garantir external_id sempre presente');
        }
        
        if (coverage.ttclid_coverage === 0) {
            suggestions.push('• Verificar parâmetros de tracking TikTok na URL');
        }
        
        if (suggestions.length > 0) {
            console.group('💡 Sugestões para melhorar EMQ:');
            suggestions.forEach(suggestion => console.log(suggestion));
            console.groupEnd();
        }
    }
    
    /**
     * Parar monitoramento EMQ
     */
    stopEMQMonitoring() {
        if (this.emqMonitorInterval) {
            clearInterval(this.emqMonitorInterval);
            this.emqMonitorInterval = null;
        }
        
        if (this.createEMQInterval) {
            clearInterval(this.createEMQInterval);
            this.createEMQInterval = null;
        }
        
        this.emqMonitoringActive = false;
        console.log('📊 EMQ Monitoring pausado');
    }
    
    /**
     * Relatório EMQ detalhado
     */
    generateEMQReport() {
        const coverage = this.calculateCoverageMetrics();
        const quality = this.getQualityMetrics();
        
        const report = {
            timestamp: new Date().toISOString(),
            overall_score: coverage.overall_score,
            target_score: 70,
            performance: coverage.overall_score >= 70 ? 'EXCELENTE' : coverage.overall_score >= 50 ? 'BOM' : 'PRECISA MELHORAR',
            coverage_details: {
                email: {
                    present: coverage.email_coverage > 0,
                    value: this.userCache.email ? 'Hash SHA256' : 'Ausente',
                    impact: '40% do EMQ Score'
                },
                phone: {
                    present: coverage.phone_coverage > 0,
                    value: this.userCache.phone ? `E.164: ${this.userCache.phone}` : 'Ausente',
                    impact: '35% do EMQ Score'
                },
                external_id: {
                    present: coverage.external_id_coverage > 0,
                    value: this.userCache.userId ? 'Presente' : 'Ausente',
                    impact: '15% do EMQ Score'
                },
                ttclid: {
                    present: coverage.ttclid_coverage > 0,
                    value: this.userCache.ttclid ? 'Presente' : 'Ausente',
                    impact: '10% do EMQ Score (bonus)'
                }
            },
            events_statistics: {
                total_sent: quality.eventsSent,
                success_rate: quality.eventsSuccess / Math.max(quality.eventsSent, 1) * 100,
                average_emq: quality.averageEMQ,
                email_hash_success: quality.emailHashSuccess,
                phone_hash_success: quality.phoneHashSuccess
            },
            recommendations: []
        };
        
        // Adicionar recomendações
        if (coverage.email_coverage === 0) {
            report.recommendations.push('Implementar coleta obrigatória de email');
        }
        if (coverage.phone_coverage === 0) {
            report.recommendations.push('Adicionar campo de telefone obrigatório');
        }
        if (coverage.overall_score < 70) {
            report.recommendations.push('Melhorar coleta de dados para atingir target EMQ 70+');
        }
        
        return report;
    }
}

// ============================================================================
// INTERFACE GLOBAL COMPATÍVEL
// ============================================================================

// Instanciar manager global
window.TikTokManager = new TikTokEventsManager();

// Interface compatível com código existente
window.TikTokEvents = {
    // Métodos principais
    identifyUser: (email, phone, userId) => window.TikTokManager.identifyUser(email, phone, userId),
    trackPageView: (value = null, currency = 'BRL') => window.TikTokManager.trackPageView(value, currency),
    trackViewContent: (id, name, value, currency) => window.TikTokManager.trackViewContent(id, name, value, currency),
    trackPurchase: (id, name, value, currency) => window.TikTokManager.trackPurchase(id, name, value, currency),
    trackInitiateCheckout: (id, name, value, currency) => window.TikTokManager.trackInitiateCheckout(id, name, value, currency),
    trackAddToCart: (id, name, value, currency) => window.TikTokManager.trackAddToCart(id, name, value, currency),
    trackAddPaymentInfo: (id, name, value, currency) => window.TikTokManager.trackAddPaymentInfo(id, name, value, currency),
    trackClickButton: (text, type, value) => window.TikTokManager.trackClickButton(text, type, value),
    trackContact: (type, value) => window.TikTokManager.trackContact(type, value),
    trackLead: (type, value) => window.TikTokManager.trackLead(type, value),
    
    // Alias para compatibilidade com versão anterior
    trackEngagement: (type, description, value = 1) => window.TikTokManager.trackClickButton(description, type, value),
    
    // Métodos específicos do Devotly com valores otimizados para ROAS
    viewHomePage: () => window.TikTokManager.trackPageView(10, 'BRL'), // Página inicial - entrada no funil
    viewCreatePage: () => {
        console.log('🎨 CREATE PAGE: Disparando PageView com valor R$ 25,00 para ROAS');
        return window.TikTokManager.trackPageView(25, 'BRL'); // Página de criação - alta intenção
    },
    viewCard: (cardId) => window.TikTokManager.trackViewContent(cardId, 'Visualizar Cartão', 15, 'BRL'),
    
    // ✨ MÉTODOS ESPECÍFICOS DA PÁGINA HOME
    home: {
        viewHero: () => {
            console.log('🏠 HOME HERO: Visualizando seção principal');
            return window.TikTokManager.trackViewContent('home_hero', 'Seção Principal', 8, 'BRL', 'website');
        },
        viewHowItWorks: () => {
            console.log('❓ HOME HOW IT WORKS: Visualizando seção Como Funciona');
            return window.TikTokManager.trackViewContent('home_how_it_works', 'Como Funciona', 5, 'BRL', 'website');
        },
        viewPricing: () => {
            console.log('💰 HOME PRICING: Visualizando seção de Preços');
            return window.TikTokManager.trackViewContent('home_pricing', 'Seção de Preços', 12, 'BRL', 'website');
        },
        viewTestimonials: () => {
            console.log('💬 HOME TESTIMONIALS: Visualizando depoimentos');
            return window.TikTokManager.trackViewContent('home_testimonials', 'Depoimentos', 6, 'BRL', 'website');
        },
        viewFeatures: () => {
            console.log('⭐ HOME FEATURES: Visualizando recursos');
            return window.TikTokManager.trackViewContent('home_features', 'Recursos', 7, 'BRL', 'website');
        }
    },
    
    // Método para tracking de seções gerais
    trackSectionView: (sectionId, sectionName, value = 5) => {
        console.log(`📊 SECTION VIEW: ${sectionName} (${sectionId})`);
        return window.TikTokManager.trackViewContent(`section_${sectionId}`, sectionName, value, 'BRL', 'website');
    },
    
    // ✨ NOVOS MÉTODOS VIEWCONTENT OTIMIZADOS PARA PÁGINA CREATE
    viewCreateStep: (stepNumber, stepName) => {
        const stepValue = stepNumber * 3; // Valor progressivo por etapa
        console.log(`📝 CREATE STEP: Visualizando etapa ${stepNumber} - ${stepName} (Valor: R$ ${stepValue})`);
        return window.TikTokManager.trackViewContent(
            `create_step_${stepNumber}`, 
            `Etapa ${stepNumber}: ${stepName}`, 
            stepValue, 
            'BRL', 
            'product' // Ferramenta de criação como produto
        );
    },
    
    viewCreatePreview: (cardId) => {
        console.log(`👀 CREATE PREVIEW: Visualizando preview do cartão ${cardId} (Valor: R$ 20)`);
        return window.TikTokManager.trackViewContent(
            `preview_${cardId}`, 
            'Preview do Cartão', 
            20, 
            'BRL', 
            'product' // Preview como produto digital
        );
    },
    
    viewCreateTemplate: (templateId, templateName) => {
        console.log(`🎨 CREATE TEMPLATE: Visualizando template ${templateName} (Valor: R$ 8)`);
        return window.TikTokManager.trackViewContent(
            `template_${templateId}`, 
            `Template: ${templateName}`, 
            8, 
            'BRL', 
            'product' // Template como produto
        );
    },
    
    viewCreateContent: (contentType, contentDetail) => {
        const contentValues = {
            'verse_selection': 12,
            'image_upload': 10,
            'music_selection': 8,
            'text_editing': 6,
            'color_customization': 5
        };
        const value = contentValues[contentType] || 5;
        
        console.log(`🎯 CREATE CONTENT: ${contentType} - ${contentDetail} (Valor: R$ ${value})`);
        return window.TikTokManager.trackViewContent(
            `create_${contentType}_${Date.now()}`, 
            `Criação: ${contentDetail}`, 
            value, 
            'BRL', 
            'product' // Conteúdo de criação como produto
        );
    },
    
    selectPlan: (planType, value) => window.TikTokManager.trackAddToCart('plan', `Plano ${planType}`, value),
    startCheckout: (cardId, planType, value) => {
        console.log(`🚀 [TikTok] START CHECKOUT CHAMADO:`, { cardId, planType, value });
        return window.TikTokManager.trackInitiateCheckout(cardId, `Plano ${planType}`, value);
    },
    completePurchase: (cardId, planType, value) => window.TikTokManager.trackPurchase(cardId, `Plano ${planType}`, value),
    
    // Novos métodos EMQ otimizados
    startCardCreation: () => window.TikTokManager.trackLead('start_creation', 15),
    addPaymentInfo: (planType, value) => {
        console.log(`💳 PAYMENT INFO: Disparando AddPaymentInfo para ${planType} - R$ ${value}`);
        return window.TikTokManager.trackAddPaymentInfo(`plan_${planType}`, `Plano ${planType}`, value, 'BRL', 'subscription');
    },
    
    // Métodos de criação OTIMIZADOS
    create: {
        startCreation: () => window.TikTokManager.trackLead('start_creation', 15),
        fillStep: (step, name) => {
            // Usar o novo método otimizado de ViewContent para etapas
            console.log(`📋 FILL STEP: Preenchendo etapa ${step} - ${name}`);
            return window.TikTokEvents.viewCreateStep(step, name);
        },
        navigateSteps: (fromStep, toStep) => {
            console.log(`🚀 NAVEGAÇÃO: Etapa ${fromStep} → ${toStep}`);
            const contentId = `navigation_${fromStep}_to_${toStep}_${Date.now()}`;
            return window.TikTokManager.trackViewContent(contentId, `Navegação Etapa ${toStep}`, 3, 'BRL', 'product');
        },
        uploadImage: () => {
            console.log(`📷 UPLOAD IMAGE: Fazendo upload de imagem`);
            return window.TikTokEvents.viewCreateContent('image_upload', 'Upload de Imagem');
        },
        selectVerse: () => {
            console.log(`📖 SELECT VERSE: Selecionando versículo`);
            return window.TikTokEvents.viewCreateContent('verse_selection', 'Seleção de Versículo');
        },
        addMusic: () => {
            console.log(`🎵 ADD MUSIC: Adicionando música`);
            return window.TikTokEvents.viewCreateContent('music_selection', 'Seleção de Música');
        },
        previewCard: () => {
            console.log(`👁️ PREVIEW CARD: Visualizando preview`);
            const cardId = window.location.hash?.replace('#', '') || 'current_card';
            return window.TikTokEvents.viewCreatePreview(cardId);
        },
        completeCreation: (cardId) => window.TikTokManager.trackLead('complete_creation', 25)
    },
    
    // Utilitários EMQ
    getMetrics: () => window.TikTokManager.getQualityMetrics(),
    forceDataDetection: () => window.TikTokManager.performDynamicDataCollection(),
    forcePageView: (value = null) => window.TikTokManager.trackPageView(value), // Força disparo do PageView
    getCoverage: () => {
        const coverage = window.TikTokManager.calculateCoverageMetrics();
        return {
            email: coverage.email_coverage > 0,
            phone: coverage.phone_coverage > 0,
            external_id: coverage.external_id_coverage > 0,
            overall_score: coverage.overall_score
        };
    },
    
    // NOVOS: Funções EMQ Avançadas v2.0
    startEMQMonitoring: () => window.TikTokManager.startEMQMonitoring(),
    stopEMQMonitoring: () => window.TikTokManager.stopEMQMonitoring(),
    generateEMQReport: () => window.TikTokManager.generateEMQReport(),
    executePixelIdentify: () => window.TikTokManager.executePixelIdentify(),
    getEMQScore: () => {
        const coverage = window.TikTokManager.calculateCoverageMetrics();
        return coverage.overall_score;
    },
    
    // Funções específicas para debug EMQ
    debugEMQ: () => {
        const report = window.TikTokManager.generateEMQReport();
        console.group('🎯 EMQ Debug Report');
        console.log('Score Geral:', report.overall_score + '/100');
        console.log('Performance:', report.performance);
        console.table(report.coverage_details);
        console.log('Estatísticas:', report.events_statistics);
        console.log('Recomendações:', report.recommendations);
        console.groupEnd();
        return report;
    }
};

// Função de inicialização compatível
window.initTikTokEvents = function() {
    console.log('🎯 TikTok Events reestruturado e inicializado');
    console.log('📊 Sistema v3.0 com target EMQ 70+');
    
    // Auto-processar fila se TikTok já carregou
    if (typeof ttq !== 'undefined') {
        window.TikTokManager.processQueue();
    }
    
    // Ativar monitoramento EMQ automaticamente na página Create
    if (window.location.pathname.includes('/create')) {
        setTimeout(() => {
            window.TikTokManager.startEMQMonitoring();
            console.log('🎯 EMQ Monitoring ativado para página Create');
            
            // Log inicial do status EMQ
            setTimeout(() => {
                const coverage = window.TikTokManager.calculateCoverageMetrics();
                console.log('📊 EMQ Score inicial:', coverage.overall_score + '/100');
                if (coverage.overall_score < 70) {
                    console.log('💡 Dica: Preencha email e telefone para melhorar o EMQ Score');
                }
            }, 2000);
        }, 1000);
    }
};

// Auto-inicializar com delay para permitir que outros scripts configurem primeiro
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        setTimeout(window.initTikTokEvents, 100); // Pequeno delay
    });
} else {
    setTimeout(window.initTikTokEvents, 100); // Pequeno delay
}

console.log('🚀 TikTok Events Manager v3.0 carregado');
console.log('🎯 Target: EMQ 70+ pontos');