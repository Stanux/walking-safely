# Plano de Implementação - Walking Safely Mobile

## Visão Geral

Este plano implementa o aplicativo React Native Walking Safely Mobile, que consome as APIs do backend Laravel existente.

## Tarefas

- [x] 1. Configuração do Projeto
  - [x] 1.1 Criar projeto React Native com TypeScript
    - Executar `npx react-native init WalkingSafelyMobile --template react-native-template-typescript`
    - Configurar estrutura de diretórios (src/screens, src/components, src/services, src/store, src/hooks, src/i18n, src/types, src/utils, src/theme)
    - _Requisitos: 1.1, 1.6_
  - [x] 1.2 Instalar e configurar dependências principais
    - Instalar: @react-navigation/native, @react-navigation/bottom-tabs, @react-navigation/stack
    - Instalar: zustand, axios, react-native-maps
    - Instalar: react-i18next, i18next
    - Instalar: @react-native-async-storage/async-storage, react-native-keychain
    - Instalar: @react-native-community/geolocation, react-native-permissions
    - _Requisitos: 1.2, 1.3, 1.4, 1.5_
  - [x] 1.3 Configurar tema e estilos globais
    - Criar src/theme/colors.ts, typography.ts, spacing.ts
    - Definir paleta de cores (incluindo cores de risco: verde, amarelo, vermelho)
    - _Requisitos: 1.6_

- [x] 2. Internacionalização (i18n)
  - [x] 2.1 Configurar react-i18next
    - Criar src/i18n/index.ts com configuração do i18next
    - Configurar detector de idioma do dispositivo
    - Configurar fallback para pt-BR
    - _Requisitos: 12.1, 12.2, 12.7_
  - [x] 2.2 Criar arquivos de tradução
    - Criar src/i18n/locales/pt-BR.json com todas as strings
    - Criar src/i18n/locales/en.json
    - Criar src/i18n/locales/es.json
    - _Requisitos: 12.1, 12.7_
  - [ ]* 2.3 Escrever teste de propriedade para fallback de tradução
    - **Propriedade 14: Fallback de Tradução**
    - **Valida: Requisito 12.7**

- [x] 3. Checkpoint - Garantir que o projeto compila e executa
  - Ensure all tests pass, ask the user if questions arise.

- [x] 4. Types e Models
  - [x] 4.1 Criar tipos TypeScript
    - Criar src/types/models.ts (Coordinates, User, Occurrence, CrimeType, etc.)
    - Criar src/types/api.ts (ApiError, PaginatedResponse, etc.)
    - Criar src/types/navigation.ts (tipos de navegação)
    - _Requisitos: 1.1_

- [x] 5. API Service
  - [x] 5.1 Criar cliente HTTP base
    - Criar src/services/api/client.ts com Axios
    - Implementar interceptor para adicionar token de autenticação
    - Implementar interceptor para adicionar header Accept-Language
    - Implementar interceptor para tratamento de erros
    - _Requisitos: 2.4, 12.5, 14.3_
  - [ ]* 5.2 Escrever teste de propriedade para header Accept-Language
    - **Propriedade 2: Header Accept-Language Consistente**
    - **Valida: Requisito 12.5**
  - [x] 5.3 Implementar retry com backoff exponencial
    - Criar lógica de retry até 3 tentativas
    - Implementar backoff exponencial (1s, 2s, 4s)
    - _Requisitos: 14.4_
  - [ ]* 5.4 Escrever teste de propriedade para retry
    - **Propriedade 16: Retry de Requisições**
    - **Valida: Requisito 14.4**
  - [x] 5.5 Criar serviços de API específicos
    - Criar src/services/api/auth.ts (login, logout, register)
    - Criar src/services/api/routes.ts (calculateRoute, recalculateRoute)
    - Criar src/services/api/occurrences.ts (create, list, getById)
    - Criar src/services/api/geocoding.ts (search, reverseGeocode)
    - Criar src/services/api/heatmap.ts (getData)
    - Criar src/services/api/alerts.ts (getPreferences, updatePreferences)
    - _Requisitos: 2.2, 4.1, 5.1, 9.2, 10.4, 11.5_

- [x] 6. Zustand Stores
  - [x] 6.1 Criar Auth Store
    - Criar src/store/authStore.ts
    - Implementar estado: token, user, isAuthenticated, isLoading
    - Implementar ações: login, logout, loadStoredAuth
    - Persistir token com AsyncStorage/Keychain
    - _Requisitos: 2.2, 2.5, 2.6_
  - [ ]* 6.2 Escrever teste de propriedade para persistência de token
    - **Propriedade 1: Token de Autenticação Persistido**
    - **Valida: Requisitos 2.2, 2.6**
  - [x] 6.3 Criar Map Store
    - Criar src/store/mapStore.ts
    - Implementar estado: currentPosition, destination, currentRoute, isNavigating, heatmapEnabled
    - Implementar ações: setDestination, calculateRoute, startNavigation, stopNavigation, toggleHeatmap
    - _Requisitos: 3.1, 5.1, 6.1, 9.1_
  - [x] 6.4 Criar Navigation Store
    - Criar src/store/navigationStore.ts
    - Implementar estado: sessionId, currentInstruction, remainingDistance, speed
    - Implementar ações: updatePosition, checkForRecalculation
    - _Requisitos: 6.2, 6.3, 6.4, 6.5_
  - [x] 6.5 Criar Preferences Store
    - Criar src/store/preferencesStore.ts
    - Implementar estado: locale, alertsEnabled, soundEnabled, alertTypes
    - Implementar ações: setLocale, updateAlertPreferences, loadPreferences
    - _Requisitos: 11.1, 11.2, 11.3, 11.4, 12.3_
  - [ ]* 6.6 Escrever teste de propriedade para troca de idioma
    - **Propriedade 13: Troca de Idioma Imediata**
    - **Valida: Requisito 12.4**

- [x] 7. Checkpoint - Garantir que stores funcionam corretamente
  - Ensure all tests pass, ask the user if questions arise.

- [x] 8. Location Service
  - [x] 8.1 Criar serviço de localização
    - Criar src/services/location.ts
    - Implementar getCurrentPosition
    - Implementar watchPosition
    - Implementar requestPermission e checkPermission
    - _Requisitos: 3.1, 3.2, 13.1, 13.2_
  - [ ]* 8.2 Escrever teste de propriedade para revogação de permissão
    - **Propriedade 15: Permissão de Localização Respeitada**
    - **Valida: Requisito 13.3**
  - [x] 8.3 Criar hook useLocation
    - Criar src/hooks/useLocation.ts
    - Encapsular lógica de permissão e tracking
    - _Requisitos: 3.1, 6.3_

- [x] 9. Alert Service
  - [x] 9.1 Criar serviço de alertas
    - Criar src/services/alerts.ts
    - Implementar checkAlertConditions
    - Implementar calculateAlertDistance (mínimo 500m para > 40km/h)
    - Implementar playAlertSound
    - _Requisitos: 7.1, 7.2, 7.4_
  - [ ]* 9.2 Escrever teste de propriedade para distância de alerta
    - **Propriedade 5: Alerta com Antecedência Correta**
    - **Valida: Requisito 7.4**
  - [x] 9.3 Criar hook useAlerts
    - Criar src/hooks/useAlerts.ts
    - Integrar com navigation store e location
    - _Requisitos: 7.1, 7.3, 7.5_

- [x] 10. Cache Service
  - [x] 10.1 Criar serviço de cache
    - Criar src/services/cache.ts
    - Implementar cache para taxonomia de crimes
    - Implementar cache para preferências
    - Implementar invalidação de cache
    - _Requisitos: 15.3_
  - [ ]* 10.2 Escrever teste de propriedade para cache
    - **Propriedade 17: Cache de Taxonomia**
    - **Valida: Requisito 15.3**

- [x] 11. Checkpoint - Garantir que serviços funcionam
  - Ensure all tests pass, ask the user if questions arise.

- [x] 12. Navegação
  - [x] 12.1 Configurar React Navigation
    - Criar src/navigation/types.ts com tipos de navegação
    - Criar src/navigation/RootNavigator.tsx
    - Criar src/navigation/AuthNavigator.tsx (Welcome, Login, Register)
    - Criar src/navigation/MainNavigator.tsx (Tabs: Map, Stats, Settings)
    - _Requisitos: 1.2, 16.1, 16.2_
  - [ ]* 12.2 Escrever teste de propriedade para preservação de estado
    - **Propriedade 19: Estado Preservado entre Tabs**
    - **Valida: Requisito 16.3**

- [x] 13. Componentes Comuns
  - [x] 13.1 Criar componentes de UI base
    - Criar src/components/common/Button.tsx
    - Criar src/components/common/Input.tsx
    - Criar src/components/common/LoadingIndicator.tsx
    - Criar src/components/common/ErrorMessage.tsx
    - Criar src/components/common/Modal.tsx
    - _Requisitos: 14.1, 14.2_
  - [ ]* 13.2 Escrever teste de propriedade para mensagens de erro localizadas
    - **Propriedade 20: Mensagem de Erro Localizada**
    - **Valida: Requisito 14.3**

- [x] 14. Telas de Autenticação
  - [x] 14.1 Criar tela de Welcome
    - Criar src/screens/auth/WelcomeScreen.tsx
    - Implementar botões de Login e Cadastro
    - _Requisitos: 2.1_
  - [x] 14.2 Criar tela de Login
    - Criar src/screens/auth/LoginScreen.tsx
    - Implementar formulário com email e senha
    - Integrar com authStore.login
    - Exibir erros localizados
    - _Requisitos: 2.2, 2.3_
  - [x] 14.3 Criar tela de Register
    - Criar src/screens/auth/RegisterScreen.tsx
    - Implementar formulário de cadastro
    - _Requisitos: 2.1_

- [x] 15. Checkpoint - Garantir que autenticação funciona
  - Ensure all tests pass, ask the user if questions arise.

- [x] 16. Componentes de Mapa
  - [x] 16.1 Criar componente de mapa base
    - Criar src/components/map/MapView.tsx
    - Configurar react-native-maps
    - Implementar marcador de posição atual
    - _Requisitos: 3.1, 3.3, 3.4_
  - [x] 16.2 Criar componente de polyline de rota
    - Criar src/components/map/RoutePolyline.tsx
    - Implementar decodificação de polyline
    - Implementar coloração por risco (verde/amarelo/vermelho)
    - _Requisitos: 5.2, 5.5_
  - [ ]* 16.3 Escrever teste de propriedade para polyline
    - **Propriedade 3: Polyline Renderizada Corretamente**
    - **Valida: Requisito 5.2**
  - [x] 16.4 Criar componente de heatmap
    - Criar src/components/map/HeatmapLayer.tsx
    - Implementar renderização de pontos de calor
    - _Requisitos: 9.2, 9.3_
  - [x] 16.5 Criar componente de barra de busca
    - Criar src/components/map/SearchBar.tsx
    - Implementar debounce de 500ms
    - Exibir lista de resultados (máximo 5)
    - _Requisitos: 4.1, 4.2, 4.3_
  - [ ]* 16.6 Escrever teste de propriedade para debounce
    - **Propriedade 6: Debounce de Busca**
    - **Valida: Requisito 4.1**
  - [ ]* 16.7 Escrever teste de propriedade para limite de resultados
    - **Propriedade 7: Limite de Resultados de Busca**
    - **Valida: Requisito 4.2**

- [x] 17. Tela Principal (Mapa)
  - [x] 17.1 Criar tela principal do mapa
    - Criar src/screens/main/MapScreen.tsx
    - Integrar MapView, SearchBar, botões flutuantes
    - Implementar botão de centralizar localização
    - Implementar toggle de heatmap
    - _Requisitos: 3.1, 3.5, 3.6, 9.1_
  - [x] 17.2 Criar tela de preview de rota
    - Criar src/screens/main/RoutePreviewScreen.tsx
    - Exibir rota no mapa com informações (tempo, distância, risco)
    - Implementar toggle rota rápida/segura
    - Exibir aviso de risco quando necessário
    - _Requisitos: 5.3, 5.4, 5.6, 5.7_
  - [ ]* 17.3 Escrever teste de propriedade para aviso de risco
    - **Propriedade 4: Aviso de Risco Exibido**
    - **Valida: Requisito 5.4**

- [x] 18. Checkpoint - Garantir que mapa e rotas funcionam
  - Ensure all tests pass, ask the user if questions arise.

- [x] 19. Navegação Ativa
  - [x] 19.1 Criar tela de navegação ativa
    - Criar src/screens/navigation/ActiveNavigationScreen.tsx
    - Implementar mapa rotacionado na direção do movimento
    - Exibir instrução atual, tempo restante, distância
    - Implementar wake lock
    - _Requisitos: 6.1, 6.2, 6.3, 6.4, 6.7_
  - [ ]* 19.2 Escrever teste de propriedade para wake lock
    - **Propriedade 18: Wake Lock Durante Navegação**
    - **Valida: Requisito 6.7**
  - [x] 19.3 Implementar recálculo automático de rota
    - Detectar desvio da rota
    - Solicitar recálculo ao backend
    - _Requisitos: 6.5_
  - [ ]* 19.4 Escrever teste de propriedade para recálculo
    - **Propriedade 8: Recálculo Automático de Rota**
    - **Valida: Requisito 6.5**
  - [x] 19.5 Implementar atualização de tráfego
    - Consultar backend a cada 60 segundos
    - Exibir modal de comparação de rotas
    - _Requisitos: 8.1, 8.2, 8.3, 8.4, 8.5_
  - [ ]* 19.6 Escrever teste de propriedade para atualização periódica
    - **Propriedade 9: Atualização de Tráfego Periódica**
    - **Valida: Requisito 8.1**
  - [x] 19.7 Implementar alertas de risco
    - Criar componente de alerta visual
    - Integrar com alert service
    - Reproduzir som quando habilitado
    - _Requisitos: 7.1, 7.2, 7.3, 7.5, 7.6_

- [x] 20. Registro de Ocorrências
  - [x] 20.1 Criar tela de registro de ocorrência
    - Criar src/screens/occurrence/ReportOccurrenceScreen.tsx
    - Capturar GPS e timestamp automaticamente
    - Implementar seleção de tipo de crime (taxonomia)
    - Implementar seleção de severidade
    - _Requisitos: 10.1, 10.2, 10.3_
  - [ ]* 20.2 Escrever teste de propriedade para campos obrigatórios
    - **Propriedade 11: Campos Obrigatórios de Ocorrência**
    - **Valida: Requisitos 10.2, 10.3**
  - [x] 20.3 Implementar submissão e feedback
    - Enviar dados ao backend
    - Exibir confirmação de sucesso
    - Exibir erros localizados (localização inválida, rate limit)
    - _Requisitos: 10.4, 10.5, 10.6_
  - [x] 20.4 Implementar contador de rate limit
    - Exibir relatos restantes na hora atual
    - Bloquear envio quando limite atingido
    - _Requisitos: 10.7_
  - [ ]* 20.5 Escrever teste de propriedade para rate limiting
    - **Propriedade 12: Rate Limiting Visual**
    - **Valida: Requisito 10.7**

- [x] 21. Checkpoint - Garantir que navegação e ocorrências funcionam
  - Ensure all tests pass, ask the user if questions arise.

- [x] 22. Mapa de Calor
  - [x] 22.1 Implementar filtros de mapa de calor
    - Criar componente de filtros (tipo de crime, período)
    - Integrar com heatmap service
    - _Requisitos: 9.4, 9.5_
  - [ ]* 22.2 Escrever teste de propriedade para filtros
    - **Propriedade 10: Filtro de Mapa de Calor**
    - **Valida: Requisitos 9.4, 9.5**
  - [x] 22.3 Implementar atualização por zoom
    - Requisitar dados atualizados ao mudar zoom
    - Implementar debounce e cancelamento
    - _Requisitos: 9.6, 15.4_

- [x] 23. Telas de Configurações
  - [x] 23.1 Criar tela principal de configurações
    - Criar src/screens/settings/SettingsScreen.tsx
    - Listar opções: Alertas, Idioma, Privacidade, Sobre
    - _Requisitos: 16.1_
  - [x] 23.2 Criar tela de preferências de alerta
    - Criar src/screens/settings/AlertPreferencesScreen.tsx
    - Toggle de alertas sonoros
    - Seleção de tipos de ocorrência
    - Configuração de horários
    - _Requisitos: 11.1, 11.2, 11.3, 11.4, 11.5_
  - [x] 23.3 Criar tela de idioma
    - Criar src/screens/settings/LanguageScreen.tsx
    - Lista de idiomas disponíveis
    - Atualizar interface ao selecionar
    - _Requisitos: 12.3, 12.4_
  - [x] 23.4 Criar tela de privacidade
    - Criar src/screens/settings/PrivacyScreen.tsx
    - Opção de solicitar exclusão de dados (LGPD)
    - Link para política de privacidade
    - _Requisitos: 13.4, 13.5_

- [x] 24. Tratamento de Estados Offline
  - [x] 24.1 Implementar detecção de conectividade
    - Usar @react-native-community/netinfo
    - Exibir banner quando offline
    - Desabilitar funcionalidades que requerem conexão
    - _Requisitos: 14.5_

- [x] 25. Checkpoint - Garantir que configurações funcionam
  - Ensure all tests pass, ask the user if questions arise.

- [x] 26. Otimizações de Performance
  - [x] 26.1 Implementar otimizações
    - Memoização de componentes pesados
    - Lazy loading de telas
    - Otimização de re-renders
    - _Requisitos: 15.1, 15.2_
  - [x] 26.2 Implementar liberação de recursos em background
    - Parar GPS quando em background (exceto navegação ativa)
    - Liberar wake lock quando apropriado
    - _Requisitos: 15.5_

- [x] 27. Testes E2E
  - [x] 27.1 Configurar Detox
    - Instalar e configurar Detox
    - Criar configuração para iOS e Android
  - [x] 27.2 Escrever testes E2E principais
    - Teste de fluxo de login
    - Teste de cálculo de rota
    - Teste de registro de ocorrência
    - Teste de navegação entre telas

- [x] 28. Checkpoint Final - Garantir que todos os testes passam
  - Ensure all tests pass, ask the user if questions arise.

## Notas

- Tarefas marcadas com `*` são opcionais (testes de propriedade)
- Cada tarefa referencia requisitos específicos para rastreabilidade
- Checkpoints garantem validação incremental
- O app consome exclusivamente APIs do backend Laravel existente

