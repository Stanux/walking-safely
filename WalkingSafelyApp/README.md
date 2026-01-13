# WalkingSafelyApp

Aplicativo móvel React Native para navegação segura, desenvolvido com TypeScript e Clean Architecture.

## Tecnologias

- **React Native** 0.73.4
- **TypeScript** 5.0.4 (strict mode)
- **Zustand** - Gerenciamento de estado
- **Tamagui** - Framework visual com suporte a Dark Mode
- **React Navigation** - Navegação entre telas
- **Axios** - Cliente HTTP
- **expo-secure-store** - Armazenamento seguro de tokens
- **fast-check** - Property-based testing

## Estrutura do Projeto (Clean Architecture)

```
src/
├── app/                    # Configuração do app
│   ├── App.tsx            # Componente raiz
│   ├── providers/         # Providers (Theme, Navigation)
│   └── navigation/        # Configuração de navegação
│
├── features/              # Features isoladas
│   └── auth/              # Feature de autenticação
│       ├── data/          # Camada de dados (API, repositories)
│       ├── domain/        # Camada de domínio (entities, use cases)
│       ├── presentation/  # Camada de apresentação (screens, components)
│       └── store/         # Estado (Zustand)
│
└── shared/                # Código compartilhado
    ├── components/        # Componentes reutilizáveis
    ├── services/          # Serviços (API client, storage)
    ├── theme/             # Design tokens e tema
    ├── hooks/             # Hooks compartilhados
    ├── types/             # Tipos globais
    └── utils/             # Utilitários
```

## Scripts

```bash
# Desenvolvimento
npm start                  # Inicia o Metro bundler
npm run android           # Executa no Android
npm run ios               # Executa no iOS

# Qualidade de código
npm run lint              # Executa ESLint
npm run lint:fix          # Corrige problemas de lint
npm run typecheck         # Verifica tipos TypeScript
npm run format            # Formata código com Prettier
npm run format:check      # Verifica formatação

# Testes
npm test                  # Executa testes
npm run test:watch        # Executa testes em modo watch
npm run test:coverage     # Executa testes com cobertura
```

## Configuração

1. Clone o repositório
2. Instale as dependências: `npm install`
3. Copie `.env.example` para `.env` e configure as variáveis
4. Execute o app: `npm run android` ou `npm run ios`

## Path Aliases

O projeto usa path aliases para imports mais limpos:

- `@/*` → `src/*`
- `@/features/*` → `src/features/*`
- `@/shared/*` → `src/shared/*`

Exemplo:
```typescript
import { Button } from '@/shared/components';
import { useAuthStore } from '@/features/auth/store';
```
