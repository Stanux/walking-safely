# Plano de Implementação: WalkingSafelyApp - Autenticação

## Visão Geral

Este plano implementa a feature de autenticação do WalkingSafelyApp usando React Native com TypeScript, seguindo Clean Architecture com organização por features.

## Tarefas

- [x] 1. Configurar projeto React Native com TypeScript
  - Criar projeto com `npx react-native init WalkingSafelyApp --template react-native-template-typescript`
  - Configurar tsconfig.json com strict mode
  - Configurar path aliases (@/features, @/shared)
  - Instalar dependências: axios, zustand, @react-navigation/native, tamagui, expo-secure-store
  - Configurar ESLint e Prettier
  - _Requisitos: 1.1, 1.2, 11.1, 11.2_

- [x] 2. Configurar estrutura de pastas Clean Architecture
  - Criar estrutura: src/app, src/features, src/shared
  - Criar subpastas da feature auth: data, domain, presentation, store
  - Criar subpastas shared: components, services, theme, hooks, types, utils
  - _Requisitos: 1.1, 1.3, 1.4, 1.5_

- [x] 3. Implementar Design Tokens e Tema
  - [x] 3.1 Criar arquivo de tokens (cores, espaçamento, tipografia)
    - Implementar tokens.ts com todas as definições
    - _Requisitos: 5.2_
  - [x] 3.2 Configurar Tamagui
    - Criar tamagui.config.ts com temas light e dark
    - Configurar ThemeProvider
    - _Requisitos: 5.1, 5.3_
  - [x] 3.3 Escrever teste de propriedade para atualização de tema
    - **Property 7: Atualização de Tema**
    - **Valida: Requisito 5.4**

- [x] 4. Implementar componentes reutilizáveis
  - [x] 4.1 Criar componente Button
    - Implementar variantes: primary, secondary, outline, ghost
    - Suportar estados: loading, disabled
    - Usar design tokens
    - _Requisitos: 6.1, 6.2, 6.3_
  - [x] 4.2 Criar componente Input
    - Implementar tipos: text, email, password
    - Suportar estados: error, disabled, focused
    - Exibir mensagens de erro
    - _Requisitos: 6.1, 6.2, 6.3_
  - [x] 4.3 Criar componente Card
    - Implementar container com shadow e borderRadius
    - _Requisitos: 6.1, 6.2_
  - [x] 4.4 Criar componente Modal
    - Implementar overlay e conteúdo centralizado
    - _Requisitos: 6.1, 6.2_

- [x] 5. Checkpoint - Verificar componentes base
  - Garantir que todos os componentes renderizam corretamente
  - Verificar suporte a dark mode nos componentes
  - Perguntar ao usuário se há dúvidas

- [x] 6. Implementar Secure Storage Service
  - [x] 6.1 Criar secureStorage.ts
    - Implementar setToken, getToken, clearToken
    - Implementar setUser, getUser, clearUser, clearAll
    - _Requisitos: 10.1_
  - [x] 6.2 Escrever teste de propriedade para round-trip de token
    - **Property 5: Round-Trip de Token Storage**
    - **Valida: Requisitos 2.5, 10.1**

- [x] 7. Implementar API Client com Axios
  - [x] 7.1 Criar apiClient.ts
    - Configurar baseURL, timeout, headers
    - _Requisitos: 3.1_
  - [x] 7.2 Implementar interceptor de requisição
    - Adicionar Bearer Token ao header Authorization
    - _Requisitos: 3.4_
  - [x] 7.3 Implementar interceptor de resposta
    - Tratar erros 401, 422, 423, 503
    - _Requisitos: 3.5, 3.7, 3.8_
  - [x] 7.4 Escrever teste de propriedade para injeção de token
    - **Property 9: Injeção de Token de Autenticação**
    - **Valida: Requisito 3.4**
  - [x] 7.5 Escrever teste de propriedade para tratamento de erros
    - **Property 8: Tratamento de Erros de API**
    - **Valida: Requisitos 3.3, 3.5**

- [x] 8. Implementar Auth API Service
  - [x] 8.1 Criar authApi.ts
    - Implementar login, register, forgotPassword, logout, me
    - Definir interfaces: LoginRequest, RegisterRequest, ForgotPasswordRequest, User, AuthResponse
    - _Requisitos: 3.2, 3.6_

- [x] 9. Implementar Validators
  - [x] 9.1 Criar authValidators.ts
    - Implementar validateEmail, validatePassword, validateName, validatePasswordConfirmation
    - Implementar validateLoginForm, validateRegisterForm
    - _Requisitos: 7.2, 7.3, 8.2, 8.3, 8.4, 8.5_
  - [x] 9.2 Escrever teste de propriedade para validação de email
    - **Property 1: Validação de Email**
    - **Valida: Requisitos 7.2, 8.3, 9.2**
  - [x] 9.3 Escrever teste de propriedade para validação de senha
    - **Property 2: Validação de Senha**
    - **Valida: Requisitos 7.3, 8.4**
  - [x] 9.4 Escrever teste de propriedade para confirmação de senha
    - **Property 3: Confirmação de Senha**
    - **Valida: Requisito 8.5**
  - [x] 9.5 Escrever teste de propriedade para validação de nome
    - **Property 4: Validação de Nome**
    - **Valida: Requisito 8.2**

- [x] 10. Checkpoint - Verificar camada de dados
  - Garantir que todos os testes passam
  - Verificar tipagem TypeScript
  - Perguntar ao usuário se há dúvidas

- [x] 11. Implementar Auth Store (Zustand)
  - [x] 11.1 Criar authStore.ts
    - Implementar estado: user, token, isAuthenticated, isLoading, error, attemptsRemaining, lockedUntil
    - Implementar actions: setUser, setToken, setLoading, setError, setLockInfo, login, logout, clearError
    - Configurar persistência com AsyncStorage
    - _Requisitos: 2.1, 2.2, 2.5_
  - [x] 11.2 Escrever teste de propriedade para notificação de estado
    - **Property 10: Notificação de Mudança de Estado**
    - **Valida: Requisito 2.3**

- [x] 12. Implementar Use Cases de Autenticação
  - [x] 12.1 Criar loginUseCase.ts
    - Validar dados, chamar API, armazenar token, atualizar store
    - _Requisitos: 7.4, 7.5, 7.6, 7.7, 7.8_
  - [x] 12.2 Criar registerUseCase.ts
    - Validar dados, chamar API, armazenar token, atualizar store
    - _Requisitos: 8.7, 8.8, 8.9, 8.10_
  - [x] 12.3 Criar forgotPasswordUseCase.ts
    - Validar email, chamar API, retornar resultado
    - _Requisitos: 9.3, 9.4, 9.5_
  - [x] 12.4 Criar logoutUseCase.ts
    - Chamar API, limpar storage, atualizar store
    - _Requisitos: 10.5, 10.6_

- [x] 13. Implementar Sistema de Navegação
  - [x] 13.1 Criar RootNavigator.tsx
    - Verificar token ao iniciar
    - Decidir entre AuthNavigator e AppNavigator
    - _Requisitos: 4.1, 10.2, 10.3, 10.4_
  - [x] 13.2 Criar AuthNavigator.tsx
    - Configurar stack: Login, Register, ForgotPassword
    - _Requisitos: 4.2_
  - [x] 13.3 Criar AppNavigator.tsx
    - Configurar stack: Home (placeholder)
    - _Requisitos: 4.2_
  - [x] 13.4 Escrever teste de propriedade para navegação por estado
    - **Property 6: Navegação por Estado de Autenticação**
    - **Valida: Requisitos 4.3, 4.4**

- [x] 14. Checkpoint - Verificar navegação
  - Garantir que navegação funciona corretamente
  - Testar fluxo auth → app e app → auth
  - Perguntar ao usuário se há dúvidas

- [x] 15. Implementar Tela de Login
  - [x] 15.1 Criar LoginScreen.tsx
    - Implementar campos email e senha
    - Implementar validação local
    - Chamar loginUseCase ao submeter
    - Exibir erros de autenticação
    - Exibir tempo de bloqueio se aplicável
    - Adicionar links para registro e recuperação de senha
    - _Requisitos: 7.1, 7.2, 7.3, 7.4, 7.5, 7.6, 7.7, 7.8, 7.9, 7.10_

- [x] 16. Implementar Tela de Registro
  - [x] 16.1 Criar RegisterScreen.tsx
    - Implementar campos nome, email, senha, confirmação
    - Implementar seletor de idioma
    - Implementar validação local
    - Chamar registerUseCase ao submeter
    - Exibir erros de validação por campo
    - Adicionar link para login
    - _Requisitos: 8.1, 8.2, 8.3, 8.4, 8.5, 8.6, 8.7, 8.8, 8.9, 8.10, 8.11_

- [x] 17. Implementar Tela de Recuperação de Senha
  - [x] 17.1 Criar ForgotPasswordScreen.tsx
    - Implementar campo de email
    - Implementar validação local
    - Chamar forgotPasswordUseCase ao submeter
    - Exibir mensagem de confirmação
    - Exibir instruções do processo
    - Adicionar link para voltar ao login
    - _Requisitos: 9.1, 9.2, 9.3, 9.4, 9.5, 9.6, 9.7_

- [x] 18. Implementar Tela Home (Placeholder)
  - [x] 18.1 Criar HomeScreen.tsx
    - Exibir mensagem de boas-vindas com nome do usuário
    - Implementar botão de logout
    - _Requisitos: 10.5, 10.7_

- [x] 19. Integrar App.tsx com Sistema de Navegação
  - [x] 19.1 Atualizar App.tsx
    - Envolver app com ThemeProvider
    - Envolver app com NavigationContainer
    - Usar RootNavigator como componente principal
    - _Requisitos: 4.1, 5.1_

- [x] 20. Checkpoint Final - Verificar fluxo completo
  - Testar fluxo de login completo
  - Testar fluxo de registro completo
  - Testar fluxo de recuperação de senha
  - Testar logout
  - Testar persistência de sessão
  - Testar dark mode em todas as telas
  - Garantir que todos os testes passam
  - Perguntar ao usuário se há dúvidas

## Notas

- Tarefas marcadas com `*` são opcionais e podem ser puladas para um MVP mais rápido
- Cada tarefa referencia requisitos específicos para rastreabilidade
- Checkpoints garantem validação incremental
- Testes de propriedade validam propriedades universais de corretude
- Testes unitários validam exemplos específicos e casos de borda
