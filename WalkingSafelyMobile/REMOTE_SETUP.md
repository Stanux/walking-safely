# 🌐 Configuração para Backend Remoto

Este guia explica como configurar o app para usar o backend na nuvem.

## ✅ Configurações Aplicadas

### 1. **URL da API Atualizada**
- **Antes**: `http://192.168.15.3:8000/api` (local)
- **Agora**: `http://50.21.181.92:8080/api` (remoto)

### 2. **Configurações de Rede Android**
- Adicionado `android:usesCleartextTraffic="true"` no AndroidManifest.xml
- Criado `network_security_config.xml` para permitir HTTP
- Timeout aumentado para 15s (conexões remotas)

### 3. **Arquivos Modificados**
```
WalkingSafelyMobile/
├── src/utils/constants.ts          # URL da API
├── android/app/src/main/
│   ├── AndroidManifest.xml         # Configurações de rede
│   └── res/xml/network_security_config.xml  # Segurança HTTP
├── .env                            # Variáveis de ambiente
└── scripts/test-remote.sh          # Script de teste
```

## 🚀 Como Testar

### Opção 1: Script Automático
```bash
cd WalkingSafelyMobile
npm run test-remote
```

### Opção 2: Manual
```bash
# 1. Limpar cache e instalar
npm run android-remote

# 2. Para debug
npm run logs
```

## 🔧 Verificações

### 1. **Teste de Conectividade**
```bash
curl http://50.21.181.92:8080/api/
# ou usar o script npm
npm run test-api
```

### 2. **Verificar Logs**
```bash
# Android
npx react-native log-android

# Filtrar apenas erros de rede
adb logcat | grep -i "network\|http\|api"
```

## 🐛 Troubleshooting

### Problema: "Network request failed"
**Soluções:**
1. Verificar se o backend está rodando
2. Testar conectividade: `ping 50.21.181.92`
3. Verificar firewall/proxy
4. Reinstalar o app após mudanças

### Problema: "Cleartext HTTP traffic not permitted"
**Solução:** Já configurado no `network_security_config.xml`

### Problema: Timeout nas requisições
**Solução:** Timeout aumentado para 15s, mas pode ajustar em `constants.ts`

## 📱 Testando sem USB

### 1. **Via WiFi (ADB Wireless)**
```bash
# Conectar via USB primeiro
adb tcpip 5555
adb connect <IP_DO_DISPOSITIVO>:5555
# Desconectar USB e usar WiFi
```

### 2. **Build Release**
```bash
cd android
./gradlew assembleRelease
# Instalar APK manualmente no dispositivo
```

## 🌐 URLs Importantes

- **API Base**: http://50.21.181.92:8080/api
- **API Status**: http://50.21.181.92:8080/api/
- **Routes**: http://50.21.181.92:8080/api/routes
- **Auth**: http://50.21.181.92:8080/api/auth

## 📋 Checklist de Teste

- [ ] Backend acessível via curl
- [ ] App compila sem erros
- [ ] Requisições HTTP funcionando
- [ ] Geolocalização funcionando
- [ ] Mapas carregando
- [ ] Dados de trânsito sendo recebidos

## 🔄 Voltar para Local

Para voltar a usar o backend local, edite `src/utils/constants.ts`:

```typescript
export const API_BASE_URL = 'http://192.168.15.3:8000/api';
```