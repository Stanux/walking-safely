# Solução para Problemas de Rede

## Problema Identificado

O app está apresentando erro `NETWORK_ERROR` ao tentar:
- Calcular rotas
- Carregar ocorrências do mapa

**Logs do erro:**
```
ERROR [RoutePreview] Route calculation error: {"code": "NETWORK_ERROR", "message": "Network error. Please check your connection.", "translationKey": "errors.network"}
WARN [MapScreen] Failed to load occurrences for region: {"code": "NETWORK_ERROR", "message": "Network error. Please check your connection.", "translationKey": "errors.network"}
```

## Diagnóstico Realizado

✅ **Backend funcionando:** API responde corretamente em `http://192.168.15.3:8000/api/`
✅ **Rotas configuradas:** Endpoints `/api/routes` e `/api/occurrences` existem
✅ **Dados disponíveis:** API retorna ocorrências quando testada via curl

## Possíveis Causas

### 1. Configuração de Rede do Emulador/Dispositivo
- Emulador Android pode ter problemas para acessar `192.168.15.3`
- Firewall bloqueando conexões
- Proxy ou VPN interferindo

### 2. Timeout da API
- Timeout atual: 10 segundos (`API_TIMEOUT = 10000`)
- Pode ser insuficiente para conexões lentas

### 3. Configuração do React Native
- Metro bundler pode estar interferindo
- Cache corrompido

## Soluções Implementadas

### 1. Melhor Tratamento de Erros
- Adicionado diagnóstico de rede detalhado
- Botão "Diagnóstico" na tela de erro
- Mensagens mais informativas para o usuário

### 2. Utilitário de Diagnóstico
Criado `networkDiagnostics.ts` que verifica:
- Conectividade básica
- Acesso à API
- Latência da conexão
- Sugestões de solução

### 3. Interface Melhorada
- Botões de retry mais visíveis
- Mensagens de erro contextuais
- Sugestões automáticas de solução

## Soluções Adicionais Recomendadas

### 1. Configuração do Emulador Android
```bash
# Se usando emulador, tente usar 10.0.2.2 em vez de 192.168.15.3
# Edite src/utils/constants.ts:
export const API_BASE_URL = __DEV__
  ? 'http://10.0.2.2:8000/api'  // Para emulador Android
  : 'https://api.walkingsafely.com/api';
```

### 2. Configuração do Servidor Laravel
```bash
# Certifique-se que o servidor aceita conexões externas
cd walking-safely
php artisan serve --host=0.0.0.0 --port=8000
```

### 3. Teste em Dispositivo Real
```bash
# Para testar em dispositivo real, use o IP da máquina
# Descubra o IP com:
ip addr show  # Linux
ipconfig      # Windows
ifconfig      # macOS

# Depois atualize constants.ts com o IP correto
```

### 4. Configuração de Timeout
```typescript
// Em src/utils/constants.ts, aumente o timeout se necessário:
export const API_TIMEOUT = 15000; // 15 segundos
```

### 5. Configuração de CORS (se necessário)
```php
// No Laravel, em config/cors.php
'allowed_origins' => ['*'], // Para desenvolvimento
```

## Como Testar as Melhorias

### 1. Teste o Diagnóstico
1. Abra o app e tente calcular uma rota
2. Se der erro, toque em "Diagnóstico"
3. Veja o relatório detalhado de conectividade

### 2. Teste Diferentes Configurações
```bash
# Limpe o cache do React Native
cd WalkingSafelyMobile
npx react-native start --reset-cache

# Teste em emulador
npx react-native run-android

# Teste em dispositivo real
npx react-native run-android --device
```

### 3. Monitore os Logs
```bash
# Veja logs detalhados
npx react-native log-android

# Procure por:
# - [NetworkDiagnostics] 
# - [RoutePreview]
# - [MapScreen]
```

## Próximos Passos

1. **Teste em dispositivo real** para confirmar se é problema do emulador
2. **Ajuste o IP da API** conforme o ambiente de teste
3. **Configure CORS** no backend se necessário
4. **Aumente timeout** se a rede for lenta
5. **Implemente cache offline** para melhor experiência

## Comandos Úteis

```bash
# Verificar conectividade
curl http://192.168.15.3:8000/api/

# Testar endpoint específico
curl "http://192.168.15.3:8000/api/occurrences?north_east_lat=-30.02&north_east_lng=-51.22&south_west_lat=-30.04&south_west_lng=-51.24"

# Reiniciar servidor Laravel
cd walking-safely
php artisan serve --host=0.0.0.0 --port=8000

# Limpar cache React Native
cd WalkingSafelyMobile
npx react-native start --reset-cache
```