# Documento de Requisitos - Walking Safely Mobile

## Introdução

O Walking Safely Mobile é o aplicativo React Native que serve como interface principal para usuários da plataforma Walking Safely. O aplicativo consome exclusivamente as APIs do backend Laravel para todas as funcionalidades de mapas, navegação e registro de ocorrências. O app suporta Android e iOS, oferecendo navegação segura com alertas de risco, visualização de mapas de calor, registro colaborativo de ocorrências e suporte a múltiplos idiomas.

## Glossário

- **Walking Safely Mobile**: Aplicativo React Native para smartphones Android e iOS
- **Backend API**: API REST Laravel que fornece todos os dados e funcionalidades de mapas
- **Sessão de Navegação Ativa**: Estado em que o usuário está seguindo uma rota calculada
- **Índice de Risco**: Valor numérico de 0 a 100 que representa o nível de perigo de uma região
- **Região de Alto Risco**: Região geográfica com Índice de Risco igual ou superior a 70
- **Relato Colaborativo**: Ocorrência registrada por um usuário do aplicativo
- **Mapa de Calor (Heatmap)**: Visualização que mostra concentração de ocorrências por intensidade de cor
- **Taxonomia de Crimes**: Estrutura hierárquica de categorias e subcategorias de tipos de crime
- **Alerta de Risco**: Notificação visual e sonora ao aproximar-se de região de alto risco
- **Rota Segura**: Rota calculada priorizando menor exposição a regiões de risco

## Requisitos

### Requisito 1: Estrutura Base do Aplicativo

**História de Usuário:** Como desenvolvedor, quero uma estrutura de projeto React Native bem organizada, para que o desenvolvimento seja escalável e manutenível.

#### Critérios de Aceitação

1. O Aplicativo DEVE ser criado com React Native 0.73+ usando TypeScript.
2. O Aplicativo DEVE utilizar React Navigation 6+ para gerenciamento de navegação entre telas.
3. O Aplicativo DEVE utilizar Zustand para gerenciamento de estado global.
4. O Aplicativo DEVE utilizar react-native-maps para renderização de mapas.
5. O Aplicativo DEVE utilizar react-i18next para internacionalização.
6. O Aplicativo DEVE seguir estrutura de diretórios organizada com separação de concerns (screens, components, services, hooks, store, i18n).

### Requisito 2: Autenticação de Usuário

**História de Usuário:** Como usuário, quero fazer login e logout no aplicativo, para que eu possa acessar funcionalidades personalizadas e registrar ocorrências.

#### Critérios de Aceitação

1. QUANDO o usuário abrir o aplicativo pela primeira vez, O Aplicativo DEVE exibir tela de boas-vindas com opções de login e cadastro.
2. QUANDO o usuário submeter credenciais de login, O Aplicativo DEVE enviar requisição ao Backend e armazenar o token de autenticação de forma segura.
3. QUANDO o login falhar, O Aplicativo DEVE exibir mensagem de erro localizada informando o motivo.
4. QUANDO o usuário estiver autenticado, O Aplicativo DEVE incluir o token em todas as requisições ao Backend.
5. QUANDO o usuário solicitar logout, O Aplicativo DEVE remover o token armazenado e redirecionar para tela de login.
6. O Aplicativo DEVE manter o usuário logado entre sessões usando armazenamento seguro (AsyncStorage criptografado ou Keychain/Keystore).

### Requisito 3: Tela Principal com Mapa

**História de Usuário:** Como usuário, quero visualizar um mapa interativo na tela principal, para que eu possa ver minha localização e explorar a região.

#### Critérios de Aceitação

1. QUANDO o usuário acessar a tela principal, O Aplicativo DEVE exibir um mapa centralizado na localização atual do usuário.
2. QUANDO o usuário não conceder permissão de localização, O Aplicativo DEVE exibir mensagem explicativa e centralizar o mapa em localização padrão (São Paulo).
3. O Aplicativo DEVE exibir marcador indicando a posição atual do usuário no mapa.
4. QUANDO o usuário interagir com o mapa (zoom, pan), O Aplicativo DEVE responder de forma fluida sem travamentos.
5. O Aplicativo DEVE exibir barra de busca na parte superior para pesquisa de endereços.
6. O Aplicativo DEVE exibir botão flutuante para centralizar mapa na localização atual.

### Requisito 4: Busca de Endereços

**História de Usuário:** Como usuário, quero buscar endereços e pontos de interesse, para que eu possa definir meu destino facilmente.

#### Critérios de Aceitação

1. QUANDO o usuário digitar na barra de busca, O Aplicativo DEVE enviar requisição ao Backend após 500ms de debounce.
2. QUANDO o Backend retornar resultados, O Aplicativo DEVE exibir lista com até 5 sugestões de endereços.
3. QUANDO o usuário selecionar um resultado, O Aplicativo DEVE centralizar o mapa nas coordenadas do endereço selecionado.
4. QUANDO o usuário selecionar um resultado, O Aplicativo DEVE exibir opção para iniciar navegação até o destino.
5. QUANDO a busca não retornar resultados, O Aplicativo DEVE exibir mensagem informativa localizada.
6. QUANDO o Backend estiver indisponível, O Aplicativo DEVE exibir mensagem de erro e sugerir tentar novamente.

### Requisito 5: Cálculo e Exibição de Rotas

**História de Usuário:** Como motorista, quero calcular rotas de navegação entre dois pontos, para que eu possa chegar ao meu destino de forma eficiente e segura.

#### Critérios de Aceitação

1. QUANDO o usuário solicitar uma rota, O Aplicativo DEVE enviar coordenadas de origem e destino ao Backend.
2. QUANDO o Backend retornar a rota, O Aplicativo DEVE desenhar o trajeto no mapa usando polyline.
3. QUANDO exibir a rota, O Aplicativo DEVE mostrar tempo estimado, distância total e Índice de Risco máximo do trajeto.
4. QUANDO o Índice de Risco máximo for >= 50, O Aplicativo DEVE exibir aviso visual destacado com recomendação de cautela.
5. QUANDO o Índice de Risco máximo for >= 70, O Aplicativo DEVE colorir a polyline em vermelho nas regiões de alto risco.
6. O Aplicativo DEVE exibir botão para alternar entre "rota mais rápida" e "rota mais segura".
7. QUANDO o usuário selecionar "rota mais segura", O Aplicativo DEVE enviar parâmetro ao Backend e exibir rota alternativa.

### Requisito 6: Navegação Ativa (Turn-by-Turn)

**História de Usuário:** Como motorista em navegação ativa, quero receber instruções de direção em tempo real, para que eu possa seguir a rota sem me perder.

#### Critérios de Aceitação

1. QUANDO o usuário iniciar navegação, O Aplicativo DEVE entrar em modo de navegação ativa com mapa rotacionado na direção do movimento.
2. ENQUANTO em navegação ativa, O Aplicativo DEVE exibir próxima instrução de direção na parte superior da tela.
3. ENQUANTO em navegação ativa, O Aplicativo DEVE atualizar a posição do usuário no mapa em tempo real.
4. ENQUANTO em navegação ativa, O Aplicativo DEVE exibir tempo estimado de chegada e distância restante.
5. QUANDO o usuário desviar da rota, O Aplicativo DEVE solicitar recálculo ao Backend automaticamente.
6. O Aplicativo DEVE exibir botão para encerrar navegação a qualquer momento.
7. ENQUANTO em navegação ativa, O Aplicativo DEVE manter a tela ligada (wake lock).

### Requisito 7: Alertas de Risco Durante Navegação

**História de Usuário:** Como motorista, quero receber alertas ao me aproximar de áreas de alto risco, para que eu possa aumentar minha atenção.

#### Critérios de Aceitação

1. QUANDO o usuário em navegação ativa se aproximar de Região de Alto Risco, O Aplicativo DEVE emitir alerta visual na tela.
2. QUANDO emitir alerta visual, O Aplicativo DEVE reproduzir som de notificação (se habilitado nas preferências).
3. QUANDO emitir alerta, O Aplicativo DEVE exibir o tipo de ocorrência predominante na região.
4. O Aplicativo DEVE emitir alertas com antecedência baseada na velocidade (mínimo 500m a velocidades > 40km/h).
5. O Aplicativo DEVE permitir dispensar o alerta com um toque.
6. QUANDO o Índice de Risco da rota mudar após recálculo, O Aplicativo DEVE informar ao usuário a mudança.

### Requisito 8: Atualização de Rota em Tempo Real

**História de Usuário:** Como motorista em navegação ativa, quero que minha rota seja atualizada com base nas condições de tráfego, para que eu possa evitar atrasos.

#### Critérios de Aceitação

1. ENQUANTO em navegação ativa, O Aplicativo DEVE consultar o Backend a cada 60 segundos para verificar condições de tráfego.
2. QUANDO o Backend informar rota alternativa mais rápida, O Aplicativo DEVE exibir modal com comparação entre rotas.
3. QUANDO exibir comparação de rotas, O Aplicativo DEVE mostrar diferença de tempo, distância e Índice de Risco.
4. O Aplicativo DEVE permitir que o usuário aceite ou recuse a rota alternativa.
5. QUANDO o usuário aceitar rota alternativa, O Aplicativo DEVE atualizar o trajeto no mapa imediatamente.

### Requisito 9: Visualização de Mapa de Calor

**História de Usuário:** Como usuário, quero visualizar um mapa de calor das ocorrências, para que eu possa identificar áreas com maior concentração de crimes.

#### Critérios de Aceitação

1. O Aplicativo DEVE exibir botão/toggle para ativar camada de mapa de calor sobre o mapa base.
2. QUANDO ativado, O Aplicativo DEVE requisitar dados de heatmap ao Backend para a região visível.
3. QUANDO o Backend retornar dados, O Aplicativo DEVE renderizar camada de heatmap com gradiente de cores (verde → amarelo → vermelho).
4. O Aplicativo DEVE permitir filtrar o mapa de calor por tipo de crime.
5. O Aplicativo DEVE permitir filtrar o mapa de calor por período de tempo (últimas 24h, 7 dias, 30 dias).
6. QUANDO o usuário alterar o zoom do mapa, O Aplicativo DEVE requisitar dados atualizados ao Backend.

### Requisito 10: Registro de Ocorrências

**História de Usuário:** Como usuário, quero reportar ocorrências de segurança que eu presenciar, para que eu possa ajudar outros usuários.

#### Critérios de Aceitação

1. O Aplicativo DEVE exibir botão flutuante para registrar nova ocorrência (apenas para usuários autenticados).
2. QUANDO o usuário iniciar registro, O Aplicativo DEVE capturar automaticamente coordenadas GPS e timestamp.
3. O Aplicativo DEVE exibir formulário com seleção de tipo de crime (conforme Taxonomia) e nível de severidade.
4. QUANDO o usuário submeter relato, O Aplicativo DEVE enviar dados ao Backend.
5. QUANDO o Backend validar e aceitar o relato, O Aplicativo DEVE exibir confirmação de sucesso.
6. QUANDO o Backend rejeitar o relato (localização inválida, rate limit), O Aplicativo DEVE exibir mensagem de erro localizada.
7. O Aplicativo DEVE exibir contador de relatos restantes na hora atual (limite de 5/hora).

### Requisito 11: Preferências de Alerta

**História de Usuário:** Como usuário, quero configurar minhas preferências de alerta, para que eu receba apenas notificações relevantes para mim.

#### Critérios de Aceitação

1. O Aplicativo DEVE exibir tela de configurações de alerta acessível pelo menu.
2. O Aplicativo DEVE permitir habilitar/desabilitar alertas sonoros.
3. O Aplicativo DEVE permitir habilitar/desabilitar alertas por tipo de ocorrência.
4. O Aplicativo DEVE permitir configurar horários de ativação de alertas (ex: apenas à noite).
5. QUANDO o usuário modificar preferências, O Aplicativo DEVE sincronizar com o Backend.
6. O Aplicativo DEVE carregar preferências do Backend ao iniciar.

### Requisito 12: Internacionalização (i18n)

**História de Usuário:** Como usuário internacional, quero usar o aplicativo no meu idioma nativo, para que eu possa entender todas as informações.

#### Critérios de Aceitação

1. O Aplicativo DEVE suportar Português (Brasil), Inglês e Espanhol.
2. QUANDO o usuário abrir o aplicativo pela primeira vez, O Aplicativo DEVE detectar o idioma do dispositivo e usar como padrão.
3. O Aplicativo DEVE permitir trocar o idioma nas configurações.
4. QUANDO o usuário trocar o idioma, O Aplicativo DEVE atualizar toda a interface imediatamente.
5. O Aplicativo DEVE enviar header Accept-Language em todas as requisições ao Backend.
6. QUANDO exibir tipos de crime, O Aplicativo DEVE mostrar nomes traduzidos conforme idioma selecionado.
7. O Aplicativo DEVE armazenar todas as strings em arquivos de tradução separados do código.

### Requisito 13: Permissões e Privacidade

**História de Usuário:** Como usuário preocupado com privacidade, quero controlar as permissões do aplicativo, para que meus dados sejam protegidos.

#### Critérios de Aceitação

1. QUANDO o aplicativo precisar de localização, O Aplicativo DEVE solicitar permissão explicando o motivo de uso.
2. O Aplicativo DEVE funcionar em modo limitado se o usuário negar permissão de localização.
3. QUANDO o usuário revogar permissão de localização, O Aplicativo DEVE parar de acessar GPS imediatamente.
4. O Aplicativo DEVE exibir tela de configurações de privacidade com opção de solicitar exclusão de dados (LGPD).
5. O Aplicativo DEVE exibir link para política de privacidade.

### Requisito 14: Tratamento de Erros e Estados de Loading

**História de Usuário:** Como usuário, quero feedback visual claro sobre o estado do aplicativo, para que eu saiba quando algo está carregando ou falhou.

#### Critérios de Aceitação

1. QUANDO uma requisição estiver em andamento, O Aplicativo DEVE exibir indicador de loading apropriado.
2. QUANDO uma requisição falhar por erro de rede, O Aplicativo DEVE exibir mensagem de erro com opção de tentar novamente.
3. QUANDO o Backend retornar erro, O Aplicativo DEVE exibir mensagem localizada baseada no código de erro.
4. O Aplicativo DEVE implementar retry automático para falhas de rede (até 3 tentativas).
5. QUANDO o dispositivo estiver offline, O Aplicativo DEVE exibir banner informativo e desabilitar funcionalidades que requerem conexão.

### Requisito 15: Performance e Otimização

**História de Usuário:** Como usuário, quero que o aplicativo seja rápido e responsivo, para que eu possa usá-lo efetivamente enquanto me desloco.

#### Critérios de Aceitação

1. O Aplicativo DEVE carregar a tela principal em até 2 segundos após splash screen.
2. O Aplicativo DEVE responder a interações do usuário em até 100ms.
3. O Aplicativo DEVE implementar cache local para dados frequentemente acessados (taxonomia, preferências).
4. O Aplicativo DEVE otimizar requisições de mapa de calor usando debounce e cancelamento de requisições pendentes.
5. O Aplicativo DEVE liberar recursos (GPS, wake lock) quando em background.

### Requisito 16: Navegação entre Telas

**História de Usuário:** Como usuário, quero navegar facilmente entre as diferentes funcionalidades do aplicativo.

#### Critérios de Aceitação

1. O Aplicativo DEVE implementar navegação por tabs na parte inferior (Mapa, Estatísticas, Configurações).
2. O Aplicativo DEVE implementar navegação por stack para fluxos específicos (login, detalhes de ocorrência).
3. O Aplicativo DEVE manter estado das telas ao navegar entre tabs.
4. O Aplicativo DEVE suportar gestos de navegação (swipe back no iOS).
5. O Aplicativo DEVE exibir header com título da tela atual e botão de voltar quando apropriado.

