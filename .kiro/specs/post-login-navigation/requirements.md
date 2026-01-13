# Requirements Document

## Introduction

Este documento define os requisitos para as funcionalidades pós-login do aplicativo Walking Safely Mobile. O escopo inclui a visualização do mapa, cadastro de ocorrências de risco, busca de destinos, cálculo de rotas seguras e navegação guiada com alertas de risco. As funcionalidades de autenticação (login, registro, recuperação de senha) já estão implementadas e não fazem parte deste escopo.

## Glossary

- **Map_Screen**: Tela principal do aplicativo que exibe o mapa com a localização do usuário e pontos de risco
- **User_Marker**: Marcador visual no mapa representando a posição atual do usuário (ícone de veículo)
- **Risk_Point**: Ponto no mapa indicando uma ocorrência de risco cadastrada por usuários
- **Occurrence**: Registro de um evento de risco em uma localização específica
- **Occurrence_Type**: Categoria do evento de risco (Roubo, Furto, Agressão, Assédio, Vandalismo, Atividade Suspeita)
- **Severity_Level**: Nível de gravidade da ocorrência (Baixa, Média, Alta, Crítica)
- **Route**: Trajeto calculado entre o ponto de partida e o destino
- **Fastest_Route**: Rota otimizada para menor tempo de deslocamento
- **Safest_Route**: Rota otimizada para menor exposição a áreas de risco
- **Navigation_Mode**: Modo de navegação guiada com orientação em tempo real
- **Route_Info_Panel**: Painel inferior exibindo informações do trajeto (distância, tempo, risco)
- **Instruction_Modal**: Modal com lista completa de instruções de navegação
- **Maneuver_Indicator**: Indicador visual no topo da tela mostrando próximo movimento
- **Voice_Narration**: Sistema de narração por voz das instruções de navegação
- **Risk_Alert**: Alerta emitido ao usuário quando se aproxima de área de risco
- **Route_Recalculation**: Recálculo automático da rota quando usuário sai do percurso

## Requirements

### Requirement 1: Exibição Inicial do Mapa

**User Story:** Como usuário, quero abrir o app e ver minha localização atual no mapa com um marcador representado por um veículo, para que eu saiba onde estou.

#### Acceptance Criteria

1. WHEN o usuário abrir o aplicativo após login, THE Map_Screen SHALL exibir o mapa centralizado na localização atual do usuário
2. WHEN a localização do usuário estiver disponível, THE Map_Screen SHALL exibir o User_Marker utilizando um ícone de veículo
3. WHILE o usuário estiver na Map_Screen, THE System SHALL atualizar a posição do User_Marker conforme o usuário se move
4. IF a localização do usuário não estiver disponível, THEN THE System SHALL solicitar permissão de localização ao usuário

### Requirement 2: Visualização de Pontos de Risco

**User Story:** Como usuário, quero ver todos os pontos de risco cadastrados na área visível do mapa, para que eu tenha consciência das áreas perigosas ao meu redor.

#### Acceptance Criteria

1. THE Map_Screen SHALL exibir todos os Risk_Points cadastrados que estejam dentro da área visível do mapa
2. THE Map_Screen SHALL exibir os Risk_Points independentemente de haver ou não uma Route ativa
3. WHEN o usuário mover ou aplicar zoom no mapa, THE System SHALL atualizar os Risk_Points visíveis de acordo com a nova área exibida
4. THE Risk_Points SHALL ser diferenciados visualmente por Severity_Level

### Requirement 3: Visualização de Detalhes do Ponto de Risco

**User Story:** Como usuário, quero clicar em um ponto de risco no mapa e ver seus detalhes, para entender melhor a ocorrência.

#### Acceptance Criteria

1. WHEN o usuário tocar em um Risk_Point no mapa, THE System SHALL exibir um popup com os detalhes da ocorrência
2. THE popup SHALL exibir o Occurrence_Type da ocorrência
3. THE popup SHALL exibir o Severity_Level da ocorrência
4. IF a ocorrência possuir descrição, THEN THE popup SHALL exibir a descrição
5. THE popup SHALL permitir que o usuário feche e retorne à visualização do mapa

### Requirement 4: Cadastro de Ocorrência de Risco

**User Story:** Como usuário, quero poder cadastrar uma ocorrência de risco pressionando um ponto no mapa, para contribuir com a segurança da comunidade.

#### Acceptance Criteria

1. WHEN o usuário pressionar e mantiver o toque sobre um ponto do mapa por 1 segundo, THE System SHALL abrir a tela de cadastro de Occurrence
2. WHEN a tela de cadastro for exibida, THE System SHALL permitir a seleção de um Occurrence_Type entre: Roubo, Furto, Agressão, Assédio, Vandalismo ou Atividade Suspeita
3. WHEN o usuário estiver cadastrando uma Occurrence, THE System SHALL permitir a definição do Severity_Level como: Baixa, Média, Alta ou Crítica
4. WHEN o usuário estiver cadastrando uma Occurrence, THE System SHALL permitir o preenchimento opcional de uma descrição
5. WHEN o usuário confirmar o envio da Occurrence, THE System SHALL registrar a ocorrência associada às coordenadas selecionadas
6. IF o usuário não selecionar Occurrence_Type ou Severity_Level, THEN THE System SHALL impedir o envio e exibir mensagem de validação

### Requirement 5: Atualização Global de Ocorrências

**User Story:** Como usuário, quero que o mapa seja atualizado em tempo real quando novas ocorrências forem cadastradas, para ter informações sempre atualizadas.

#### Acceptance Criteria

1. WHEN uma nova Occurrence for registrada, THE System SHALL atualizar o mapa de todos os usuários que estejam visualizando aquela região
2. WHEN o usuário concluir o cadastro da Occurrence, THE System SHALL retornar automaticamente para a Map_Screen exibindo o Risk_Point recém-cadastrado
3. THE System SHALL sincronizar novos Risk_Points em tempo real via conexão com o backend

### Requirement 6: Busca de Destino

**User Story:** Como usuário, quero buscar um endereço, local ou ponto de interesse e ver opções listadas, para selecionar meu destino.

#### Acceptance Criteria

1. WHEN o usuário digitar um endereço, local ou ponto de interesse na barra de busca, THE System SHALL listar opções correspondentes para seleção
2. WHEN o usuário selecionar uma opção da lista, THE System SHALL definir o local como destino para cálculo de rota
3. THE System SHALL exibir no mínimo 5 resultados de busca quando disponíveis
4. IF nenhum resultado for encontrado, THEN THE System SHALL exibir mensagem informativa ao usuário

### Requirement 7: Cálculo de Rotas

**User Story:** Como usuário, quero calcular rotas até meu destino podendo escolher entre rota mais rápida ou rota de menor risco, para planejar meu trajeto.

#### Acceptance Criteria

1. WHEN o usuário selecionar um destino, THE System SHALL permitir a escolha entre Fastest_Route ou Safest_Route
2. WHEN o usuário não selecionar um tipo de rota antes do cálculo, THE System SHALL calcular automaticamente a Safest_Route
3. WHEN o usuário solicitar o cálculo de rota, THE System SHALL calcular e exibir a Route no mapa
4. THE Route calculada SHALL considerar os Risk_Points cadastrados para determinar o nível de risco do trajeto

### Requirement 8: Exibição da Rota no Mapa

**User Story:** Como usuário, quero ver a rota plotada no mapa exibindo ponto de partida, pontos de risco e ponto de chegada, para visualizar meu trajeto completo.

#### Acceptance Criteria

1. WHEN uma Route for calculada, THE Map_Screen SHALL exibir o ponto de partida com marcador distinto
2. WHEN uma Route for calculada, THE Map_Screen SHALL exibir o trajeto como linha no mapa
3. WHEN uma Route for calculada, THE Map_Screen SHALL exibir o ponto de chegada com marcador distinto
4. WHEN uma Route estiver ativa, THE Map_Screen SHALL continuar exibindo todos os Risk_Points na área visível do mapa
5. THE Route line SHALL ser exibida em cor azul

### Requirement 9: Informações do Trajeto

**User Story:** Como usuário, quero ver na parte inferior da tela a distância total, tempo estimado e nível de risco do trajeto, para avaliar minha rota.

#### Acceptance Criteria

1. WHEN uma Route for exibida, THE Route_Info_Panel SHALL apresentar a distância total em quilômetros
2. WHEN uma Route for exibida, THE Route_Info_Panel SHALL apresentar o tempo estimado de percurso
3. WHEN uma Route for exibida, THE Route_Info_Panel SHALL apresentar o nível de risco calculado para o trajeto
4. THE Route_Info_Panel SHALL organizar distância, tempo e risco em uma única linha com três colunas
5. THE Route_Info_Panel SHALL exibir um botão para visualizar instruções de navegação
6. THE Route_Info_Panel SHALL exibir um botão de ação para iniciar o trajeto

### Requirement 10: Lista de Instruções de Navegação

**User Story:** Como usuário, quero ver a lista completa de instruções do trajeto antes de iniciar, para conhecer o percurso.

#### Acceptance Criteria

1. WHEN o usuário acionar o botão de instruções, THE System SHALL exibir o Instruction_Modal
2. THE Instruction_Modal SHALL ocupar a maior parte da tela
3. THE Instruction_Modal SHALL listar todas as instruções que serão apresentadas durante a navegação
4. THE Instruction_Modal SHALL permitir que o usuário feche e retorne à visualização do mapa

### Requirement 11: Início da Navegação Guiada

**User Story:** Como usuário, quero iniciar o trajeto e ser orientado visualmente em tempo real, para seguir a rota com segurança.

#### Acceptance Criteria

1. WHEN o usuário acionar o botão de iniciar trajeto, THE System SHALL iniciar o Navigation_Mode
2. WHEN o Navigation_Mode estiver ativo, THE System SHALL indicar visualmente a localização atual do usuário no mapa em tempo real
3. WHEN o Navigation_Mode estiver ativo, THE System SHALL atualizar a posição e orientação do mapa alinhando a direção de deslocamento ao topo da tela
4. WHEN o Navigation_Mode estiver ativo, THE System SHALL manter a tela do dispositivo ativa

### Requirement 12: Diferenciação Visual do Trajeto

**User Story:** Como usuário, quero que o trecho já percorrido tenha cor diferente do trecho a percorrer, para visualizar meu progresso.

#### Acceptance Criteria

1. WHEN o Navigation_Mode estiver ativo, THE System SHALL exibir o trecho já percorrido da Route em azul acinzentado
2. WHEN o Navigation_Mode estiver ativo, THE System SHALL exibir o trecho ainda não percorrido da Route em azul
3. WHILE o usuário avança no trajeto, THE System SHALL atualizar dinamicamente as cores dos trechos

### Requirement 13: Indicadores Visuais de Manobra

**User Story:** Como usuário, quero ver no topo da tela indicadores visuais do próximo movimento a realizar, para me preparar para as manobras.

#### Acceptance Criteria

1. WHEN o Navigation_Mode estiver ativo, THE Maneuver_Indicator SHALL exibir no topo da tela o próximo movimento a ser realizado
2. THE Maneuver_Indicator SHALL incluir ícone direcional e descrição textual do movimento
3. WHEN um movimento for concluído, THE System SHALL atualizar o Maneuver_Indicator para o próximo movimento da Route
4. THE Maneuver_Indicator SHALL exibir a distância até o próximo movimento

### Requirement 14: Narração por Voz

**User Story:** Como usuário, quero que o aplicativo narre as instruções de navegação por voz, para ser guiado sem precisar olhar a tela.

#### Acceptance Criteria

1. WHEN o Navigation_Mode estiver ativo, THE Voice_Narration SHALL narrar as instruções de navegação
2. THE System SHALL disponibilizar um botão flutuante para mutar ou reativar a Voice_Narration
3. WHEN o usuário mutar a Voice_Narration, THE System SHALL manter apenas a orientação visual
4. THE Voice_Narration SHALL narrar instruções com antecedência adequada para o usuário se preparar

### Requirement 15: Alertas de Áreas de Risco

**User Story:** Como usuário, quero ser avisado quando me aproximar de áreas de risco, para aumentar minha atenção.

#### Acceptance Criteria

1. WHEN o usuário estiver se aproximando de um Risk_Point durante Navigation_Mode, THE System SHALL emitir um Risk_Alert
2. THE Risk_Alert SHALL incluir notificação visual na tela
3. WHEN a Voice_Narration estiver ativa, THE Risk_Alert SHALL incluir alerta sonoro
4. THE System SHALL emitir Risk_Alert quando o usuário estiver a uma distância configurável do Risk_Point

### Requirement 16: Recálculo Automático de Rota

**User Story:** Como usuário, quero que o aplicativo recalcule a rota automaticamente se eu sair do percurso, mantendo minha preferência inicial.

#### Acceptance Criteria

1. WHEN o usuário se afastar mais de 30 metros da Route ativa, THE System SHALL identificar que o usuário saiu do percurso
2. WHEN o System identificar que o usuário saiu do percurso ativo, THE System SHALL iniciar Route_Recalculation automaticamente
3. THE Route_Recalculation SHALL respeitar a escolha inicial do tipo de rota (Fastest_Route ou Safest_Route)
4. WHEN a Route_Recalculation for concluída, THE System SHALL atualizar a Route exibida no mapa
5. THE System SHALL notificar o usuário visualmente e por voz que a rota foi recalculada
6. THE System SHALL usar a posição atual do usuário como novo ponto de partida para o recálculo

### Requirement 17: Encerramento do Trajeto

**User Story:** Como usuário, quero poder encerrar o trajeto em andamento a qualquer momento e voltar para a tela inicial.

#### Acceptance Criteria

1. WHEN o Navigation_Mode estiver ativo, THE System SHALL disponibilizar opção para encerrar o trajeto
2. WHEN o usuário encerrar o trajeto, THE System SHALL finalizar o Navigation_Mode
3. WHEN o usuário encerrar o trajeto, THE System SHALL retornar para a Map_Screen inicial
4. WHEN o usuário encerrar o trajeto, THE System SHALL limpar a Route ativa do mapa

### Requirement 18: Manter Tela Ativa

**User Story:** Como usuário, quero que a tela do dispositivo permaneça sempre ligada durante o uso do aplicativo, para não perder informações importantes.

#### Acceptance Criteria

1. WHILE o usuário estiver utilizando o aplicativo, THE System SHALL manter a tela do dispositivo ativa
2. WHILE o Navigation_Mode estiver ativo, THE System SHALL impedir que a tela entre em modo de suspensão
3. WHEN o usuário sair do aplicativo ou encerrar a navegação, THE System SHALL restaurar o comportamento padrão de suspensão da tela
