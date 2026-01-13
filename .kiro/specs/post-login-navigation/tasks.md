# Implementation Plan: Post-Login Navigation

## Overview

Este plano de implementação cobre as funcionalidades pós-login do Walking Safely Mobile, incluindo visualização do mapa, cadastro de ocorrências, cálculo de rotas e navegação guiada. A implementação será feita em TypeScript/React Native, aproveitando a estrutura existente do projeto.

## Tasks

- [x] 1. Configurar estrutura base e constantes
  - [x] 1.1 Criar arquivo de constantes de navegação
    - Criar `src/utils/navigationConstants.ts` com DEVIATION_THRESHOLD, RISK_ALERT_DISTANCE, cores de rota
    - _Requirements: 12.1, 12.2, 15.4, 16.1_
  - [x] 1.2 Criar arquivo de tipos de ocorrência
    - Criar `src/utils/occurrenceTypes.ts` com tipos e ícones
    - _Requirements: 4.2_
  - [x] 1.3 Criar arquivo de níveis de severidade
    - Criar `src/utils/severityLevels.ts` com valores e cores
    - _Requirements: 4.3, 2.4_

- [x] 2. Implementar OccurrenceStore
  - [x] 2.1 Criar store de ocorrências
    - Criar `src/store/occurrenceStore.ts` com estado e ações
    - Implementar fetchOccurrences, createOccurrence, selectOccurrence
    - _Requirements: 2.1, 4.5, 5.2_
  - [x] 2.2 Escrever property test para OccurrenceStore
    - **Property 6: Occurrence Form Validation**
    - **Validates: Requirements 4.6**

- [x] 3. Implementar componentes de pontos de risco
  - [x] 3.1 Criar RiskPointMarker
    - Criar `src/components/map/RiskPointMarker.tsx`
    - Implementar marcador com cor baseada em severidade
    - _Requirements: 2.4_
  - [x] 3.2 Escrever property test para cores de severidade
    - **Property 3: Severity Color Mapping**
    - **Validates: Requirements 2.4**
  - [x] 3.3 Criar RiskPointPopup
    - Criar `src/components/map/RiskPointPopup.tsx`
    - Exibir tipo, severidade e descrição (se houver)
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5_
  - [x] 3.4 Escrever property test para conteúdo do popup
    - **Property 4: Risk Point Popup Content Completeness**
    - **Validates: Requirements 3.2, 3.3, 3.4**

- [x] 4. Checkpoint - Verificar componentes de risco
  - Ensure all tests pass, ask the user if questions arise.

- [x] 5. Implementar tela de cadastro de ocorrência
  - [x] 5.1 Criar OccurrenceTypeSelector
    - Criar `src/components/occurrence/OccurrenceTypeSelector.tsx`
    - Lista de tipos com ícones selecionáveis
    - _Requirements: 4.2_
  - [x] 5.2 Criar SeveritySelector
    - Criar `src/components/occurrence/SeveritySelector.tsx`
    - Seletor de severidade com cores
    - _Requirements: 4.3_
  - [x] 5.3 Criar OccurrenceForm
    - Criar `src/components/occurrence/OccurrenceForm.tsx`
    - Formulário completo com validação
    - _Requirements: 4.2, 4.3, 4.4, 4.6_
  - [x] 5.4 Criar OccurrenceCreateScreen
    - Criar `src/screens/occurrence/OccurrenceCreateScreen.tsx`
    - Integrar form com store e navegação
    - _Requirements: 4.1, 4.5, 5.2_
  - [x] 5.5 Escrever property test para preservação de coordenadas
    - **Property 5: Occurrence Creation Coordinate Preservation**
    - **Validates: Requirements 4.5**

- [x] 6. Atualizar MapScreen para suportar ocorrências
  - [x] 6.1 Adicionar handler de long press
    - Detectar long press de 1 segundo
    - Capturar coordenadas e navegar para cadastro
    - _Requirements: 4.1_
  - [x] 6.2 Integrar RiskPointMarkers no mapa
    - Buscar ocorrências ao carregar e ao mover mapa
    - Renderizar marcadores para cada ocorrência
    - _Requirements: 2.1, 2.2, 2.3_
  - [x] 6.3 Integrar RiskPointPopup
    - Exibir popup ao tocar em marcador
    - _Requirements: 3.1_
  - [x] 6.4 Escrever property test para visibilidade de pontos
    - **Property 2: Risk Points Visibility Within Bounds**
    - **Validates: Requirements 2.1, 2.2, 2.3**

- [x] 7. Checkpoint - Verificar funcionalidades de ocorrência
  - Ensure all tests pass, ask the user if questions arise.

- [x] 8. Implementar busca de destino
  - [x] 8.1 Atualizar SearchBar para busca de endereços
    - Integrar com GeocodingService existente
    - Exibir lista de sugestões
    - _Requirements: 6.1, 6.3_
  - [x] 8.2 Implementar seleção de destino
    - Ao selecionar, definir como destino
    - Exibir opções de tipo de rota
    - _Requirements: 6.2, 7.1_
  - [x] 8.3 Escrever property test para resultados de busca
    - **Property 7: Search Results Minimum Count**
    - **Validates: Requirements 6.3**

- [x] 9. Implementar cálculo e preview de rota
  - [x] 9.1 Atualizar lógica de cálculo de rota
    - Implementar seleção de tipo (fastest/safest)
    - Usar safest como padrão
    - _Requirements: 7.1, 7.2, 7.3_
  - [x] 9.2 Escrever property test para tipo de rota padrão
    - **Property 8: Default Route Type Selection**
    - **Validates: Requirements 7.2**
  - [x] 9.3 Criar/Atualizar RouteInfoPanel
    - Exibir distância, tempo e risco em 3 colunas
    - Botões para instruções e iniciar
    - _Requirements: 9.1, 9.2, 9.3, 9.4, 9.5, 9.6_
  - [x] 9.4 Escrever property test para dados do painel
    - **Property 10: Route Info Panel Data Accuracy**
    - **Validates: Requirements 9.1, 9.2, 9.3**
  - [x] 9.5 Criar InstructionModal
    - Modal com lista de instruções
    - _Requirements: 10.1, 10.2, 10.3, 10.4_

- [x] 10. Checkpoint - Verificar cálculo de rotas
  - Ensure all tests pass, ask the user if questions arise.

- [x] 11. Implementar navegação guiada - Parte 1
  - [x] 11.1 Criar NavigationScreen
    - Criar `src/screens/navigation/NavigationScreen.tsx`
    - Iniciar sessão de navegação
    - _Requirements: 11.1, 11.2_
  - [x] 11.2 Implementar rotação do mapa por direção
    - Alinhar direção de deslocamento ao topo
    - _Requirements: 11.3_
  - [x] 11.3 Implementar diferenciação visual do trajeto
    - Criar componente TraveledRoute
    - Trecho percorrido em azul acinzentado, restante em azul
    - _Requirements: 12.1, 12.2, 12.3_
  - [x] 11.4 Escrever property test para cores do trajeto
    - **Property 11: Traveled Path Color Differentiation**
    - **Validates: Requirements 12.1, 12.2, 12.3**

- [x] 12. Implementar navegação guiada - Parte 2
  - [x] 12.1 Criar ManeuverIndicator
    - Criar `src/components/navigation/ManeuverIndicator.tsx`
    - Exibir ícone, texto e distância
    - _Requirements: 13.1, 13.2, 13.4_
  - [x] 12.2 Implementar atualização de instrução
    - Avançar para próxima instrução quando movimento concluído
    - _Requirements: 13.3_
  - [x] 12.3 Escrever property test para indicador de manobra
    - **Property 12: Maneuver Indicator Accuracy**
    - **Validates: Requirements 13.1, 13.2, 13.3, 13.4**

- [x] 13. Implementar narração por voz
  - [x] 13.1 Criar hook useVoiceNavigation
    - Criar `src/hooks/useVoiceNavigation.ts`
    - Integrar com react-native-tts
    - _Requirements: 14.1, 14.4_
  - [x] 13.2 Criar MuteButton
    - Criar `src/components/navigation/MuteButton.tsx`
    - Botão flutuante para mutar/desmutar
    - _Requirements: 14.2, 14.3_

- [x] 14. Implementar alertas de risco
  - [x] 14.1 Criar hook useRiskAlerts
    - Criar `src/hooks/useRiskAlerts.ts`
    - Verificar proximidade de pontos de risco
    - _Requirements: 15.1, 15.4_
  - [x] 14.2 Criar RiskAlertBanner
    - Criar `src/components/navigation/RiskAlertBanner.tsx`
    - Exibir alerta visual
    - _Requirements: 15.2_
  - [x] 14.3 Integrar alerta sonoro
    - Narrar alerta quando voz ativa
    - _Requirements: 15.3_
  - [x] 14.4 Escrever property test para alertas de proximidade
    - **Property 13: Risk Alert Proximity Trigger**
    - **Validates: Requirements 15.1, 15.4**

- [x] 15. Checkpoint - Verificar navegação guiada
  - Ensure all tests pass, ask the user if questions arise.

- [x] 16. Implementar recálculo de rota
  - [x] 16.1 Atualizar navigationStore para recálculo
    - Detectar desvio > 30m da rota
    - Manter preferência de tipo de rota
    - _Requirements: 16.1, 16.2, 16.6_
  - [x] 16.2 Implementar notificação de recálculo
    - Notificar visual e por voz
    - _Requirements: 16.4, 16.5_
  - [x] 16.3 Escrever property test para recálculo
    - **Property 14: Route Recalculation Trigger and Preference Preservation**
    - **Validates: Requirements 16.1, 16.2, 16.3, 16.6**

- [x] 17. Implementar encerramento e tela ativa
  - [x] 17.1 Implementar encerramento do trajeto
    - Botão para encerrar navegação
    - Limpar estado e voltar para MapScreen
    - _Requirements: 17.1, 17.2, 17.3, 17.4_
  - [x] 17.2 Implementar keep awake
    - Manter tela ativa durante uso do app
    - Usar react-native-keep-awake
    - _Requirements: 18.1, 18.2, 18.3_

- [x] 18. Integração e navegação entre telas
  - [x] 18.1 Configurar rotas de navegação
    - Todas as telas registradas em MainNavigator.tsx (MapHome, RoutePreview, ActiveNavigation, ReportOccurrence)
    - Tipos de navegação definidos em types/navigation.ts
    - Parâmetros de navegação configurados corretamente
    - _Requirements: 4.1, 5.2, 11.1, 17.3_
  - [x] 18.2 Integrar fluxo completo
    - Fluxo implementado: Mapa → Busca → Rota → Navegação → Encerramento
    - Fluxo implementado: Mapa → Long press → Cadastro → Mapa
    - _Requirements: All_

- [x] 19. Checkpoint Final
  - Todos os fluxos de navegação estão funcionais
  - Todos os requisitos de navegação pós-login implementados
  - Cobertura de testes existente para componentes principais

## Notes

- Todos os testes são obrigatórios para garantir qualidade desde o início
- Cada task referencia requisitos específicos para rastreabilidade
- Checkpoints garantem validação incremental
- Property tests validam propriedades universais de corretude
- Unit tests validam exemplos específicos e edge cases
- A implementação usa TypeScript e segue a estrutura existente do projeto
