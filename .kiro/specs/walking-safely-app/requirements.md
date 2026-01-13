# Documento de Requisitos

## Introdução

WalkingSafelyApp é um aplicativo móvel desenvolvido em React Native focado inicialmente na feature de autenticação (login, registro e recuperação de senha). O aplicativo segue Clean Architecture com organização por features, utilizando TypeScript, Zustand para estado global, Tamagui como framework visual, e suporte completo a Dark Mode. O app consome a API REST do backend Walking Safely.

## Glossário

- **App**: O aplicativo móvel WalkingSafelyApp
- **Usuário**: Pessoa que utiliza o aplicativo
- **Feature**: Módulo funcional isolado seguindo Clean Architecture
- **Design_Token**: Valores padronizados para cores, espaçamento e tipografia
- **Service_Layer**: Camada de serviços desacoplada que gerencia comunicação com APIs
- **Auth_Navigator**: Navegador para fluxos de autenticação
- **App_Navigator**: Navegador para fluxos do aplicativo autenticado
- **Theme_Provider**: Componente que gerencia o tema (Light/Dark Mode)
- **Store**: Estado global gerenciado pelo Zustand
- **API_Backend**: API REST do Walking Safely (documentação em /api/documentation)
- **Bearer_Token**: Token de autenticação retornado pela API após login

## Requisitos

### Requisito 1: Configuração da Arquitetura do Projeto

**História do Usuário:** Como desenvolvedor, quero uma arquitetura de projeto bem estruturada, para que o código seja manutenível, escalável e siga as melhores práticas.

#### Critérios de Aceitação

1. O App DEVE organizar o código usando Clean Architecture com estrutura de pastas baseada em features
2. O App DEVE usar TypeScript em 100% do código com verificação de tipos estrita habilitada
3. O App DEVE separar responsabilidades em camadas: apresentação, domínio e dados
4. QUANDO uma nova feature for adicionada, O App DEVE permitir que ela seja autocontida dentro de sua própria pasta
5. O App DEVE manter uma pasta compartilhada para preocupações transversais e utilitários reutilizáveis

### Requisito 2: Gerenciamento de Estado

**História do Usuário:** Como desenvolvedor, quero gerenciamento de estado centralizado, para que o estado da aplicação seja previsível e fácil de depurar.

#### Critérios de Aceitação

1. O App DEVE usar Zustand para gerenciamento de estado global
2. O App DEVE organizar stores por domínio de feature
3. QUANDO mudanças de estado ocorrerem, O Store DEVE notificar todos os componentes inscritos
4. O App NÃO DEVE colocar lógica de negócio diretamente em componentes de tela
5. O App DEVE persistir dados de estado relevantes entre reinicializações do app quando apropriado

### Requisito 3: Camada de Comunicação com API

**História do Usuário:** Como desenvolvedor, quero uma camada de serviços desacoplada, para que a comunicação com APIs seja centralizada e as telas permaneçam limpas.

#### Critérios de Aceitação

1. A Service_Layer DEVE usar Axios para comunicação HTTP com a API_Backend
2. A Service_Layer DEVE ser completamente desacoplada dos componentes de tela
3. QUANDO uma requisição de API falhar, A Service_Layer DEVE tratar erros de forma consistente e retornar respostas de erro tipadas
4. A Service_Layer DEVE suportar interceptadores de requisição para adicionar Bearer_Token no header Authorization
5. A Service_Layer DEVE suportar interceptadores de resposta para tratamento de erros (401, 422, 423, 503)
6. O App DEVE definir interfaces tipadas para todas as requisições e respostas de API
7. QUANDO a API retornar erro 401, A Service_Layer DEVE redirecionar o usuário para a tela de login
8. QUANDO a API retornar erro 423 (conta bloqueada), A Service_Layer DEVE exibir mensagem com tempo restante de bloqueio

### Requisito 4: Sistema de Navegação

**História do Usuário:** Como usuário, quero navegação fluida entre telas, para que eu possa acessar todas as funcionalidades do app de forma intuitiva.

#### Critérios de Aceitação

1. O App DEVE usar React Navigation para navegação entre telas
2. O App DEVE implementar navegadores separados: Auth_Navigator para fluxos não autenticados e App_Navigator para fluxos autenticados
3. QUANDO um usuário não estiver autenticado, O App DEVE exibir apenas telas do Auth_Navigator
4. QUANDO um usuário estiver autenticado, O App DEVE exibir apenas telas do App_Navigator
5. O App DEVE suportar deep linking para telas principais
6. O App DEVE manter o estado de navegação apropriadamente durante o ciclo de vida do app

### Requisito 5: Framework Visual e Temas

**História do Usuário:** Como usuário, quero uma experiência visual consistente e bonita, para que o app seja agradável e fácil de usar.

#### Critérios de Aceitação

1. O App DEVE usar Tamagui como framework visual
2. O App DEVE implementar Design_Tokens para cores, espaçamento e tipografia
3. O Theme_Provider DEVE suportar Modo Claro e Modo Escuro
4. QUANDO o usuário mudar a preferência de tema, O App DEVE atualizar todos os elementos visuais imediatamente
5. O App DEVE respeitar a preferência de tema do sistema por padrão
6. O App NÃO DEVE usar estilos inline que são repetidos entre componentes

### Requisito 6: Componentes Reutilizáveis

**História do Usuário:** Como desenvolvedor, quero uma biblioteca de componentes reutilizáveis, para que o desenvolvimento de UI seja mais rápido e consistente.

#### Critérios de Aceitação

1. O App DEVE criar componentes de UI reutilizáveis para padrões comuns (botões, inputs, cards, modais)
2. QUANDO um componente for criado, O App DEVE garantir que ele aceite design tokens para estilização
3. O App DEVE documentar props de componentes com interfaces TypeScript
4. O App DEVE garantir que componentes sejam acessíveis (suporte a leitores de tela, contraste adequado)
5. QUANDO um padrão visual for usado mais de duas vezes, O App DEVE extraí-lo em um componente reutilizável

### Requisito 7: Tela de Login

**História do Usuário:** Como usuário, quero fazer login na minha conta, para que eu possa acessar funcionalidades personalizadas.

#### Critérios de Aceitação

1. O App DEVE fornecer uma tela de login com campos de email e senha
2. O App DEVE validar formato de email antes de enviar requisição
3. O App DEVE validar que senha não está vazia antes de enviar requisição
4. QUANDO o usuário submeter credenciais válidas, O App DEVE consumir POST /auth/login
5. QUANDO a autenticação for bem-sucedida, O App DEVE armazenar o Bearer_Token de forma segura
6. QUANDO a autenticação for bem-sucedida, O App DEVE navegar para o App_Navigator
7. QUANDO a autenticação falhar com erro 401, O App DEVE exibir mensagem de credenciais inválidas com tentativas restantes
8. QUANDO a conta estiver bloqueada (erro 423), O App DEVE exibir tempo restante de bloqueio
9. O App DEVE fornecer link para tela de registro
10. O App DEVE fornecer link para tela de recuperação de senha

### Requisito 8: Tela de Registro

**História do Usuário:** Como novo usuário, quero criar uma conta, para que eu possa usar o aplicativo.

#### Critérios de Aceitação

1. O App DEVE fornecer uma tela de registro com campos: nome, email, senha e confirmação de senha
2. O App DEVE validar que nome tem pelo menos 2 caracteres
3. O App DEVE validar formato de email antes de enviar requisição
4. O App DEVE validar que senha tem pelo menos 8 caracteres
5. O App DEVE validar que senha e confirmação de senha são iguais
6. O App DEVE permitir seleção de idioma preferido (pt_BR, en, es)
7. QUANDO o usuário submeter dados válidos, O App DEVE consumir POST /auth/register
8. QUANDO o registro for bem-sucedido, O App DEVE armazenar o Bearer_Token de forma segura
9. QUANDO o registro for bem-sucedido, O App DEVE navegar para o App_Navigator
10. QUANDO o registro falhar com erro 422, O App DEVE exibir mensagens de validação específicas por campo
11. O App DEVE fornecer link para tela de login

### Requisito 9: Tela de Recuperação de Senha

**História do Usuário:** Como usuário que esqueceu a senha, quero recuperar acesso à minha conta, para que eu possa continuar usando o aplicativo.

#### Critérios de Aceitação

1. O App DEVE fornecer uma tela de recuperação de senha com campo de email
2. O App DEVE validar formato de email antes de enviar requisição
3. QUANDO o usuário submeter email válido, O App DEVE consumir POST /auth/forgot-password
4. QUANDO a requisição for bem-sucedida, O App DEVE exibir mensagem de confirmação de envio de email
5. QUANDO o email não existir no sistema, O App DEVE exibir mensagem genérica de sucesso (por segurança)
6. O App DEVE fornecer link para voltar à tela de login
7. O App DEVE exibir instruções claras sobre o processo de recuperação

### Requisito 10: Persistência de Sessão

**História do Usuário:** Como usuário, quero permanecer logado entre sessões, para que eu não precise fazer login toda vez que abrir o app.

#### Critérios de Aceitação

1. O App DEVE armazenar Bearer_Token de forma segura usando armazenamento criptografado
2. QUANDO o app for iniciado, O App DEVE verificar se existe token armazenado
3. QUANDO existir token válido armazenado, O App DEVE navegar diretamente para App_Navigator
4. QUANDO o token expirar ou for inválido, O App DEVE limpar dados armazenados e navegar para Auth_Navigator
5. O App DEVE fornecer funcionalidade de logout consumindo POST /auth/logout
6. QUANDO o logout for executado, O App DEVE limpar todos os dados de sessão armazenados
7. QUANDO o logout for executado, O App DEVE navegar para Auth_Navigator

### Requisito 11: Padrões de Qualidade de Código

**História do Usuário:** Como desenvolvedor, quero padrões de qualidade de código aplicados, para que o código permaneça limpo e manutenível.

#### Critérios de Aceitação

1. O App DEVE configurar ESLint com regras estritas de TypeScript
2. O App DEVE configurar Prettier para formatação de código consistente
3. O App NÃO DEVE permitir nenhum tipo `any` do TypeScript sem justificativa explícita
4. O App DEVE manter convenções de nomenclatura consistentes em todo o código
5. O App DEVE garantir que todas as funções e componentes exportados tenham tipos TypeScript adequados
6. O App DEVE estar pronto para produção sem declarações console.log em builds de produção
