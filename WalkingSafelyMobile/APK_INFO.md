# 📱 APK Walking Safely - Informações

## ✅ APK Corrigido - Standalone Completo!

**Localização:** `android/app/build/outputs/apk/debug/app-debug.apk`
**Tamanho:** ~60MB
**Tipo:** Debug APK Standalone (com bundle JavaScript incluído)
**Data:** 30/12/2024

## 🔧 Problema Resolvido

O erro "Unable to load script" foi corrigido:
- ✅ Bundle JavaScript agora está incluído no APK
- ✅ App funciona independentemente do Metro bundler
- ✅ Não precisa de conexão com computador

## 🌐 Configurações

- **Backend URL:** http://50.21.181.92:8080/api
- **Timeout:** 15 segundos (otimizado para conexões remotas)
- **HTTP permitido:** Sim (configurado para servidor remoto)
- **Permissões:** Localização, Internet, Background Location

## 📲 Como Instalar

### Opção 1: Script Automático
```bash
npm run install-apk
```

### Opção 2: Manual via ADB
```bash
adb install -r android/app/build/outputs/apk/debug/app-debug.apk
```

### Opção 3: Transferir para Dispositivo
1. Copie o arquivo `app-debug.apk` para seu dispositivo
2. Ative "Fontes desconhecidas" nas configurações
3. Toque no arquivo APK para instalar

## 🔧 Scripts Disponíveis

```bash
# Gerar APK standalone (recomendado)
npm run build-standalone

# Gerar APK simples
npm run build-apk

# Limpar e gerar APK
npm run clean-build

# Instalar APK no dispositivo
npm run install-apk

# Testar conectividade com backend
npm run test-api

# Ver logs do app
npm run logs
```

## 🐛 Debug e Logs

### Ver logs em tempo real:
```bash
adb logcat | grep -i "WalkingSafely\|ReactNative"
```

### Logs específicos de rede:
```bash
adb logcat | grep -i "network\|http\|api"
```

### Reinstalar se houver problemas:
```bash
adb uninstall com.walkingsafelymobile
npm run install-apk
```

## 📋 Checklist de Teste

- [ ] APK instala sem erros
- [ ] App abre corretamente
- [ ] Conecta com backend remoto
- [ ] Localização funciona
- [ ] Mapas carregam
- [ ] Navegação entre telas funciona
- [ ] Dados de trânsito são recebidos

## 🔄 Regenerar APK

Se fizer mudanças no código:

```bash
# Gerar APK standalone completo (recomendado)
npm run build-standalone

# Ou apenas regenerar
npm run build-apk
```

## 📱 Informações do App

- **Nome:** WalkingSafelyMobile
- **Package:** com.walkingsafelymobile
- **Versão:** 0.0.1
- **Min SDK:** Android 6.0+ (API 23)
- **Target SDK:** Android 14 (API 34)

## 🌐 Testando sem Conexão USB

### 1. ADB via WiFi:
```bash
# Conectar via USB primeiro
adb tcpip 5555
adb connect <IP_DO_DISPOSITIVO>:5555
# Desconectar USB
```

### 2. Instalação manual:
- Transfira o APK via email, WhatsApp ou cabo USB
- Instale diretamente no dispositivo

## ⚠️ Notas Importantes

- Este é um APK de **debug**, não otimizado para produção
- Contém logs e ferramentas de desenvolvimento
- Para produção, use `assembleRelease` e assine o APK
- O app está configurado para o backend específico (50.21.181.92:8080)

## 🔐 Segurança

- APK não assinado (debug)
- Permite HTTP (necessário para o backend atual)
- Permissões de localização necessárias para funcionamento
- Dados transmitidos sem criptografia (HTTP)