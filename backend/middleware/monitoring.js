/**
 * Sistema de Monitoramento de Rate Limiting em Tempo Real
 * Dashboard simples para acompanhar métricas e ajustar limites
 */

// Métricas globais
let rateLimitMetrics = {
    requests: {
        total: 0,
        blocked: 0,
        allowed: 0
    },
    endpoints: {},
    errors: [],
    lastReset: new Date().toISOString()
};

/**
 * Middleware para coletar métricas
 */
export const metricsCollector = (req, res, next) => {
    const endpoint = req.path;
    const method = req.method;
    const ip = req.ip;
    const timestamp = new Date().toISOString();
    
    // Inicializar métricas do endpoint se não existir
    if (!rateLimitMetrics.endpoints[endpoint]) {
        rateLimitMetrics.endpoints[endpoint] = {
            requests: 0,
            blocked: 0,
            allowed: 0,
            ips: new Set(),
            errors: []
        };
    }
    
    const endpointMetrics = rateLimitMetrics.endpoints[endpoint];
    
    // Incrementar contadores
    rateLimitMetrics.requests.total++;
    endpointMetrics.requests++;
    endpointMetrics.ips.add(ip);
    
    // Interceptar resposta para capturar status
    const originalSend = res.send;
    res.send = function(data) {
        const statusCode = res.statusCode;
        
        if (statusCode === 429) {
            rateLimitMetrics.requests.blocked++;
            endpointMetrics.blocked++;
            
            // Registrar erro de rate limiting
            const error = {
                timestamp,
                endpoint,
                method,
                ip,
                statusCode,
                userAgent: req.headers['user-agent']?.substring(0, 100)
            };
            
            rateLimitMetrics.errors.push(error);
            endpointMetrics.errors.push(error);
            
            // Manter apenas os últimos 50 erros
            if (rateLimitMetrics.errors.length > 50) {
                rateLimitMetrics.errors = rateLimitMetrics.errors.slice(-50);
            }
            if (endpointMetrics.errors.length > 20) {
                endpointMetrics.errors = endpointMetrics.errors.slice(-20);
            }
            
            console.log(`🚫 Rate limit hit: ${method} ${endpoint} from ${ip}`);
        } else {
            rateLimitMetrics.requests.allowed++;
            endpointMetrics.allowed++;
        }
        
        return originalSend.call(this, data);
    };
    
    next();
};

/**
 * Dashboard HTML para monitoramento
 */
const dashboardHTML = `
<!DOCTYPE html>
<html>
<head>
    <title>Rate Limiting Dashboard - Devotly</title>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; background: #f5f5f5; }
        .container { max-width: 1200px; margin: 0 auto; }
        .card { background: white; padding: 20px; margin: 10px 0; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
        .metrics { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 15px; }
        .metric { text-align: center; padding: 15px; background: #f8f9fa; border-radius: 6px; }
        .metric-value { font-size: 2em; font-weight: bold; margin-bottom: 5px; }
        .metric-label { color: #666; font-size: 0.9em; }
        .good { color: #28a745; }
        .warning { color: #ffc107; }
        .danger { color: #dc3545; }
        .endpoint { margin: 10px 0; padding: 15px; background: #f8f9fa; border-radius: 6px; }
        .endpoint-header { font-weight: bold; margin-bottom: 10px; }
        .endpoint-stats { display: flex; gap: 20px; flex-wrap: wrap; }
        .stat { text-align: center; }
        .error-log { max-height: 300px; overflow-y: auto; background: #f8f9fa; padding: 10px; border-radius: 6px; font-family: monospace; font-size: 0.8em; }
        .refresh-btn { background: #007bff; color: white; border: none; padding: 10px 20px; border-radius: 6px; cursor: pointer; margin: 10px 0; }
        .refresh-btn:hover { background: #0056b3; }
        .status-indicator { display: inline-block; width: 12px; height: 12px; border-radius: 50%; margin-right: 8px; }
        .status-healthy { background: #28a745; }
        .status-warning { background: #ffc107; }
        .status-critical { background: #dc3545; }
    </style>
</head>
<body>
    <div class="container">
        <h1>🛡️ Rate Limiting Dashboard - Devotly</h1>
        <button class="refresh-btn" onclick="refreshData()">🔄 Refresh Data</button>
        
        <div class="card">
            <h2>📊 Global Metrics</h2>
            <div class="metrics" id="globalMetrics">
                <!-- Será preenchido via JavaScript -->
            </div>
        </div>
        
        <div class="card">
            <h2>🔌 Circuit Breakers Status</h2>
            <div id="circuitBreakers">
                <!-- Será preenchido via JavaScript -->
            </div>
        </div>
        
        <div class="card">
            <h2>🎯 Endpoints Statistics</h2>
            <div id="endpointStats">
                <!-- Será preenchido via JavaScript -->
            </div>
        </div>
        
        <div class="card">
            <h2>⚠️ Recent Rate Limit Violations</h2>
            <div class="error-log" id="errorLog">
                <!-- Será preenchido via JavaScript -->
            </div>
        </div>
    </div>
    
    <script>
        async function refreshData() {
            try {
                // Buscar métricas
                const metricsResponse = await fetch('/api/monitoring/metrics');
                const metrics = await metricsResponse.json();
                
                // Buscar status dos circuit breakers
                const cbResponse = await fetch('/api/health/circuit-breakers');
                const circuitBreakers = await cbResponse.json();
                
                updateGlobalMetrics(metrics);
                updateCircuitBreakers(circuitBreakers);
                updateEndpointStats(metrics.endpoints);
                updateErrorLog(metrics.errors);
                
                document.title = \`Rate Limiting Dashboard - \${metrics.requests.blocked > 0 ? '⚠️' : '✅'} Devotly\`;
            } catch (error) {
                console.error('Erro ao buscar dados:', error);
            }
        }
        
        function updateGlobalMetrics(metrics) {
            const container = document.getElementById('globalMetrics');
            const blockRate = metrics.requests.total > 0 ? (metrics.requests.blocked / metrics.requests.total * 100).toFixed(1) : 0;
            
            container.innerHTML = \`
                <div class="metric">
                    <div class="metric-value \${metrics.requests.total > 0 ? 'good' : ''}">\${metrics.requests.total}</div>
                    <div class="metric-label">Total Requests</div>
                </div>
                <div class="metric">
                    <div class="metric-value \${metrics.requests.allowed > 0 ? 'good' : ''}">\${metrics.requests.allowed}</div>
                    <div class="metric-label">Allowed</div>
                </div>
                <div class="metric">
                    <div class="metric-value \${metrics.requests.blocked > 0 ? 'danger' : 'good'}">\${metrics.requests.blocked}</div>
                    <div class="metric-label">Blocked (429)</div>
                </div>
                <div class="metric">
                    <div class="metric-value \${blockRate > 10 ? 'danger' : blockRate > 5 ? 'warning' : 'good'}">\${blockRate}%</div>
                    <div class="metric-label">Block Rate</div>
                </div>
            \`;
        }
        
        function updateCircuitBreakers(cb) {
            const container = document.getElementById('circuitBreakers');
            let html = '';
            
            for (const [name, status] of Object.entries(cb.circuitBreakers)) {
                const statusClass = status.state === 'CLOSED' ? 'status-healthy' : 
                                  status.state === 'HALF_OPEN' ? 'status-warning' : 'status-critical';
                
                html += \`
                    <div class="endpoint">
                        <div class="endpoint-header">
                            <span class="status-indicator \${statusClass}"></span>
                            \${name} - \${status.state}
                        </div>
                        <div class="endpoint-stats">
                            <div class="stat">
                                <div><strong>\${status.failures}</strong></div>
                                <div>Failures</div>
                            </div>
                            <div class="stat">
                                <div><strong>\${status.lastFailure ? new Date(status.lastFailure).toLocaleTimeString() : 'None'}</strong></div>
                                <div>Last Failure</div>
                            </div>
                        </div>
                    </div>
                \`;
            }
            
            container.innerHTML = html || '<p>Nenhum circuit breaker configurado</p>';
        }
        
        function updateEndpointStats(endpoints) {
            const container = document.getElementById('endpointStats');
            let html = '';
            
            for (const [endpoint, stats] of Object.entries(endpoints)) {
                const blockRate = stats.requests > 0 ? (stats.blocked / stats.requests * 100).toFixed(1) : 0;
                
                html += \`
                    <div class="endpoint">
                        <div class="endpoint-header">\${endpoint}</div>
                        <div class="endpoint-stats">
                            <div class="stat">
                                <div><strong>\${stats.requests}</strong></div>
                                <div>Total</div>
                            </div>
                            <div class="stat">
                                <div><strong>\${stats.allowed}</strong></div>
                                <div>Allowed</div>
                            </div>
                            <div class="stat">
                                <div><strong class="\${stats.blocked > 0 ? 'danger' : 'good'}">\${stats.blocked}</strong></div>
                                <div>Blocked</div>
                            </div>
                            <div class="stat">
                                <div><strong class="\${blockRate > 10 ? 'danger' : blockRate > 5 ? 'warning' : 'good'}">\${blockRate}%</strong></div>
                                <div>Block Rate</div>
                            </div>
                            <div class="stat">
                                <div><strong>\${stats.ips ? stats.ips.size : 0}</strong></div>
                                <div>Unique IPs</div>
                            </div>
                        </div>
                    </div>
                \`;
            }
            
            container.innerHTML = html || '<p>Nenhum endpoint acessado ainda</p>';
        }
        
        function updateErrorLog(errors) {
            const container = document.getElementById('errorLog');
            
            if (!errors || errors.length === 0) {
                container.innerHTML = '<p>✅ Nenhuma violação de rate limit recente</p>';
                return;
            }
            
            const html = errors.slice(-20).reverse().map(error => \`
                <div style="margin-bottom: 5px; padding: 5px; background: rgba(220, 53, 69, 0.1); border-left: 3px solid #dc3545;">
                    <strong>\${new Date(error.timestamp).toLocaleString()}</strong> - 
                    \${error.method} \${error.endpoint} from \${error.ip}
                    \${error.userAgent ? \`<br><small>UA: \${error.userAgent}</small>\` : ''}
                </div>
            \`).join('');
            
            container.innerHTML = html;
        }
        
        // Refresh automático a cada 30 segundos
        setInterval(refreshData, 30000);
        
        // Carregar dados iniciais
        refreshData();
    </script>
</body>
</html>
`;

/**
 * Endpoint para servir o dashboard
 */
export const serveDashboard = (req, res) => {
    res.setHeader('Content-Type', 'text/html');
    res.send(dashboardHTML);
};

/**
 * Endpoint para API de métricas
 */
export const getMetrics = (req, res) => {
    // Converter Sets para arrays para JSON
    const formattedMetrics = {
        ...rateLimitMetrics,
        endpoints: {}
    };
    
    for (const [endpoint, stats] of Object.entries(rateLimitMetrics.endpoints)) {
        formattedMetrics.endpoints[endpoint] = {
            ...stats,
            ips: { size: stats.ips.size } // Apenas o tamanho, não os IPs
        };
    }
    
    res.json(formattedMetrics);
};

/**
 * Reset das métricas
 */
export const resetMetrics = (req, res) => {
    rateLimitMetrics = {
        requests: {
            total: 0,
            blocked: 0,
            allowed: 0
        },
        endpoints: {},
        errors: [],
        lastReset: new Date().toISOString()
    };
    
    res.json({ message: 'Métricas resetadas com sucesso' });
};

export { rateLimitMetrics };
