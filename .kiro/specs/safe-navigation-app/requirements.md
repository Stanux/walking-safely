# Documento de Requisitos

## Introdução

O Walking Safely é uma plataforma de mapeamento e inteligência territorial de segurança para o Brasil. O sistema fornece visualização, análise e alertas sobre ocorrências criminais, funcionando em smartphones (Android/iOS) e web. A solução oferece camadas por tipo de crime, mapas de calor, séries temporais, padrões de horário, integração com fontes externas e contribuição controlada de usuários. O sistema utiliza uma arquitetura de provedores de mapas abstraída, permitindo troca transparente entre Google Maps, HERE Maps e Mapbox.

## Glossário

- **Walking Safely**: Plataforma de mapeamento e inteligência territorial de segurança
- **Provedor de Mapas**: Serviço externo de mapas (Google Maps, HERE Maps ou Mapbox) utilizado para renderização e cálculo de rotas
- **Adaptador de Mapas**: Componente que abstrai as diferenças entre provedores de mapas, expondo interface unificada
- **Índice de Risco**: Valor numérico de 0 a 100 que representa o nível de perigo de uma região geográfica
- **Ocorrência**: Evento criminal reportado por usuários ou fontes oficiais, contendo localização, tipo, severidade e timestamp
- **Região de Alto Risco**: Região geográfica com Índice de Risco igual ou superior a 70
- **Sessão de Navegação Ativa**: Estado em que o usuário está seguindo uma rota calculada pelo sistema
- **Relato Colaborativo**: Ocorrência registrada por um usuário do aplicativo
- **Fonte de Dados Oficial**: Fonte de dados de segurança pública validada (ex: secretarias de segurança, delegacias)
- **Nível de Confiabilidade**: Grau de confiabilidade de uma ocorrência, variando de 1 (baixa) a 5 (alta)
- **Score de Confiabilidade**: Pontuação atribuída a fontes de dados baseada em qualidade e consistência
- **Mapa de Calor (Heatmap)**: Visualização que mostra concentração de ocorrências por intensidade de cor
- **Série Temporal**: Visualização de dados de ocorrências ao longo do tempo
- **Taxonomia de Crimes**: Estrutura hierárquica de categorias e subcategorias de tipos de crime
- **Deduplicação**: Processo de identificar e consolidar relatos duplicados da mesma ocorrência
- **ETL**: Processo de Extração, Transformação e Carga de dados de fontes externas
- **PostGIS**: Extensão do PostgreSQL para dados geoespaciais

## Requisitos

### Requisito 1: Abstração de Provedor de Mapas no Backend

**História de Usuário:** Como operador do sistema, quero que o backend suporte diferentes provedores de mapas, para que possamos trocar entre Google Maps, HERE Maps e Mapbox de forma transparente para o aplicativo.

#### Critérios de Aceitação

1. O Backend do Walking Safely DEVE implementar um Adaptador de Mapas que exponha APIs internas unificadas para cálculo de rotas, geocodificação e dados de tráfego.
2. O Aplicativo Mobile DEVE consumir exclusivamente as APIs do Backend para funcionalidades de mapas, sem comunicação direta com provedores externos.
3. QUANDO o Backend inicializar, O Walking Safely DEVE carregar o Provedor de Mapas configurado sem alterações nas APIs expostas ao aplicativo.
4. O Backend DEVE suportar troca de Provedor de Mapas via configuração de ambiente, sem necessidade de alterações no aplicativo.
5. QUANDO um Provedor de Mapas estiver indisponível, O Backend DEVE permitir fallback automático para um provedor alternativo configurado.

### Requisito 2: Cálculo de Rotas

**História de Usuário:** Como motorista, quero calcular rotas de navegação entre dois pontos, para que eu possa chegar ao meu destino de forma eficiente.

#### Critérios de Aceitação

1. QUANDO um usuário fornecer coordenadas de origem e destino, O Aplicativo DEVE enviar requisição ao Backend que calculará a rota através do Adaptador de Mapas e retornará o trajeto, tempo estimado e distância total em até 3 segundos.
2. QUANDO o Provedor de Mapas retornar uma resposta de erro, O Walking Safely DEVE exibir uma mensagem de erro ao usuário e sugerir tentar novamente.
3. QUANDO um usuário solicitar uma rota, O Walking Safely DEVE armazenar o timestamp da requisição e as coordenadas para fins de análise, sem armazenar identificação do usuário.
4. QUANDO calcular uma rota, O Backend DEVE analisar o Índice de Risco de todas as regiões no trajeto e retornar o risco máximo encontrado junto com a rota.
5. QUANDO exibir uma rota calculada, O Aplicativo DEVE informar ao usuário o Índice de Risco máximo do trajeto e alertar se houver regiões com risco igual ou superior a 50.
6. QUANDO uma rota passar por região com Índice de Risco igual ou superior a 50, O Aplicativo DEVE exibir aviso preventivo informando o nível de risco e recomendando cautela.

### Requisito 3: Atualização de Rota em Tempo Real

**História de Usuário:** Como motorista em navegação ativa, quero que minha rota seja atualizada automaticamente com base nas condições de tráfego, para que eu possa evitar atrasos.

#### Critérios de Aceitação

1. ENQUANTO um usuário estiver em uma Sessão de Navegação Ativa, O Backend DEVE consultar dados de tráfego a cada 60 segundos através do Adaptador de Mapas e recalcular a rota se o tempo de viagem aumentar mais de 10%.
2. QUANDO as condições de tráfego mudarem significativamente durante a navegação, O Walking Safely DEVE notificar o usuário sobre o novo tempo estimado de chegada.
3. QUANDO a rota recalculada diferir da rota atual, O Walking Safely DEVE exibir ambas as opções e permitir que o usuário escolha.
4. QUANDO recalcular uma rota durante navegação ativa, O Backend DEVE reavaliar o Índice de Risco de todas as regiões no novo trajeto.
5. QUANDO o Índice de Risco máximo da rota recalculada for diferente da rota original, O Aplicativo DEVE informar ao usuário a mudança no nível de risco.

### Requisito 4: Preferência por Rota Segura

**História de Usuário:** Como motorista preocupado com segurança, quero escolher rotas que evitem áreas de alto risco, para que eu possa viajar com mais segurança.

#### Critérios de Aceitação

1. ONDE um usuário habilitar a opção "rota mais segura", O Walking Safely DEVE calcular rotas que minimizem exposição a regiões com alto Índice de Risco.
2. QUANDO exibir opções de rota, O Walking Safely DEVE mostrar o Índice de Risco máximo e médio para cada alternativa de rota.
3. ONDE um usuário habilitar a opção "rota mais segura", O Walking Safely DEVE aceitar rotas até 20% mais longas em distância se reduzirem significativamente o Índice de Risco máximo do trajeto.
4. QUANDO calcular rota mais segura, O Backend DEVE comparar múltiplas alternativas e selecionar aquela com menor Índice de Risco máximo.
5. QUANDO a única rota disponível passar por Região de Alto Risco, O Aplicativo DEVE informar ao usuário que não há alternativa mais segura e exibir o nível de risco.

### Requisito 5: Classificação de Risco Geográfico

**História de Usuário:** Como administrador do sistema, quero que o sistema mantenha índices de risco para regiões geográficas, para que os cálculos de rota possam considerar fatores de segurança.

#### Critérios de Aceitação

1. O Walking Safely DEVE manter um Índice de Risco para cada região geográfica definida, atualizado pelo menos a cada 24 horas.
2. QUANDO calcular o Índice de Risco, O Walking Safely DEVE considerar peso do tipo de ocorrência conforme Taxonomia de Crimes, frequência de ocorrências nos últimos 30 dias, recência da ocorrência e Score de Confiabilidade da fonte.
3. QUANDO uma nova ocorrência for registrada, O Walking Safely DEVE recalcular o Índice de Risco da região afetada em até 5 minutos.
4. O Walking Safely DEVE atribuir Score de Confiabilidade 5 para fontes de dados oficiais e Score de Confiabilidade inicial 2 para relatos colaborativos.

### Requisito 6: Alertas ao Usuário

**História de Usuário:** Como motorista, quero receber alertas ao entrar em áreas de alto risco, para que eu possa aumentar minha atenção e consciência.

#### Critérios de Aceitação

1. QUANDO um usuário em Sessão de Navegação Ativa entrar em uma Região de Alto Risco, O Walking Safely DEVE emitir um alerta visual na tela e uma notificação sonora.
2. QUANDO emitir um alerta, O Walking Safely DEVE exibir o tipo de ocorrência predominante naquela região conforme Taxonomia de Crimes.
3. ONDE um usuário configurar preferências de alerta, O Walking Safely DEVE permitir habilitar ou desabilitar alertas por tipo de ocorrência.
4. O Walking Safely DEVE emitir alertas com pelo menos 500 metros de antecedência antes do usuário entrar em uma Região de Alto Risco quando viajando a velocidades acima de 40 km/h.
5. QUANDO configurar alertas, O Walking Safely DEVE permitir definir horários específicos para ativação (ex: alertas apenas à noite).

### Requisito 7: Registro Colaborativo de Ocorrências

**História de Usuário:** Como usuário, quero reportar ocorrências de segurança que eu presenciar, para que eu possa ajudar outros usuários a se manterem seguros.

#### Critérios de Aceitação

1. QUANDO um usuário submeter um relato de ocorrência, O Walking Safely DEVE armazenar a ocorrência com timestamp, coordenadas GPS, tipo de ocorrência conforme Taxonomia de Crimes e nível de severidade.
2. QUANDO um usuário submeter um relato de ocorrência, O Walking Safely DEVE validar que as coordenadas GPS estão dentro de 100 metros da localização atual do usuário.
3. QUANDO múltiplos usuários reportarem ocorrências similares dentro de 500 metros e 30 minutos entre si, O Walking Safely DEVE aumentar o Score de Confiabilidade da ocorrência em 1 ponto, até o nível máximo 4.
4. O Walking Safely DEVE expirar automaticamente relatos colaborativos após 7 dias se não forem validados por relatos adicionais ou fontes oficiais.
5. O Walking Safely DEVE limitar cada usuário a submeter no máximo 5 relatos por hora para prevenir abuso.

### Requisito 8: Serialização de Relatos de Ocorrência

**História de Usuário:** Como componente do sistema, quero que os dados de ocorrência sejam serializados e desserializados de forma consistente, para que a integridade dos dados seja mantida através das fronteiras do sistema.

#### Critérios de Aceitação

1. QUANDO armazenar um relato de ocorrência, O Walking Safely DEVE serializar os dados da ocorrência em formato JSON.
2. QUANDO recuperar um relato de ocorrência, O Walking Safely DEVE desserializar os dados JSON de volta para a estrutura original da ocorrência.
3. O Walking Safely DEVE fornecer um formatador para dados de ocorrência que produza saída JSON legível por humanos.

### Requisito 9: Busca de Endereços e Geocodificação

**História de Usuário:** Como usuário, quero buscar endereços e pontos de interesse, para que eu possa definir meu destino facilmente.

#### Critérios de Aceitação

1. QUANDO um usuário inserir uma consulta de busca, O Aplicativo DEVE enviar requisição ao Backend que consultará o Provedor de Mapas através do Adaptador de Mapas e retornará até 5 resultados correspondentes em até 2 segundos.
2. QUANDO exibir resultados de busca, O Walking Safely DEVE mostrar endereço, cidade e coordenadas geográficas para cada resultado.
3. QUANDO o Provedor de Mapas estiver indisponível, O Walking Safely DEVE buscar no cache local de endereços previamente geocodificados.

### Requisito 10: Mapa de Calor de Ocorrências

**História de Usuário:** Como usuário, quero visualizar um mapa de calor das ocorrências, para que eu possa identificar rapidamente áreas com maior concentração de crimes.

#### Critérios de Aceitação

1. QUANDO um usuário acessar a visualização de mapa de calor, O Walking Safely DEVE renderizar uma camada de heatmap sobre o mapa base mostrando concentração de ocorrências.
2. QUANDO renderizar o mapa de calor, O Walking Safely DEVE permitir filtrar por tipo de crime conforme Taxonomia de Crimes e período de tempo.
3. QUANDO o usuário alterar o nível de zoom do mapa, O Walking Safely DEVE ajustar a granularidade do mapa de calor proporcionalmente.
4. O Walking Safely DEVE atualizar o mapa de calor em até 5 minutos após novas ocorrências serem registradas.

### Requisito 11: Série Temporal de Ocorrências

**História de Usuário:** Como usuário, quero visualizar a evolução das ocorrências ao longo do tempo, para que eu possa entender tendências e padrões.

#### Critérios de Aceitação

1. QUANDO um usuário acessar a visualização de série temporal, O Walking Safely DEVE exibir um gráfico de linha mostrando quantidade de ocorrências por período.
2. QUANDO exibir série temporal, O Walking Safely DEVE permitir filtrar por região geográfica (cidade, bairro ou polígono personalizado) e tipo de crime.
3. QUANDO exibir série temporal, O Walking Safely DEVE permitir selecionar granularidade temporal (hora, dia, semana ou mês).
4. O Walking Safely DEVE exibir análise de padrões de horário mostrando concentração por hora do dia e dia da semana.

### Requisito 12: Integração com Fontes Externas de Dados

**História de Usuário:** Como administrador do sistema, quero integrar dados de fontes oficiais externas, para que o sistema tenha informações mais completas e confiáveis.

#### Critérios de Aceitação

1. O Walking Safely DEVE implementar pipeline ETL para ingestão automatizada de dados de fontes externas.
2. QUANDO ingerir dados de fonte externa, O Walking Safely DEVE mapear os tipos de crime para a Taxonomia de Crimes padronizada do sistema.
3. QUANDO ingerir dados de fonte externa, O Walking Safely DEVE executar deduplicação para evitar registros duplicados de mesma ocorrência.
4. O Walking Safely DEVE manter registro de origem, timestamp de ingestão e Score de Confiabilidade para cada dado importado.
5. QUANDO uma fonte externa estiver indisponível por mais de 24 horas, O Walking Safely DEVE notificar administradores do sistema.

### Requisito 13: Gestão de Taxonomia de Crimes

**História de Usuário:** Como administrador do sistema, quero gerenciar a taxonomia de tipos de crime, para que as categorias reflitam a realidade brasileira.

#### Critérios de Aceitação

1. O Walking Safely DEVE manter uma Taxonomia de Crimes hierárquica com categorias e subcategorias.
2. QUANDO um administrador adicionar ou modificar categoria na taxonomia, O Walking Safely DEVE versionar a alteração e manter histórico.
3. O Walking Safely DEVE fornecer mapeamento de equivalências entre taxonomias de diferentes fontes externas.
4. QUANDO serializar dados de taxonomia, O Walking Safely DEVE produzir formato JSON consistente para exportação e importação.

### Requisito 14: Moderação de Relatos

**História de Usuário:** Como moderador, quero revisar e moderar relatos de usuários, para que informações falsas ou abusivas sejam removidas.

#### Critérios de Aceitação

1. QUANDO um relato for sinalizado como suspeito pelo sistema de detecção de anomalias, O Walking Safely DEVE adicionar o relato à fila de moderação.
2. QUANDO um moderador aprovar ou rejeitar um relato, O Walking Safely DEVE registrar a decisão, timestamp e identificação do moderador para auditoria.
3. O Walking Safely DEVE detectar automaticamente padrões de abuso como múltiplos relatos similares do mesmo usuário em curto período.
4. QUANDO um relato for rejeitado, O Walking Safely DEVE notificar o usuário autor com motivo da rejeição.

### Requisito 15: Permissão de Localização e Privacidade

**História de Usuário:** Como usuário preocupado com privacidade, quero que meus dados de localização sejam tratados de forma segura, para que minhas informações pessoais sejam protegidas.

#### Critérios de Aceitação

1. QUANDO um usuário conceder permissão de localização, O Walking Safely DEVE usar dados de localização apenas durante a sessão ativa do aplicativo.
2. O Walking Safely DEVE evitar armazenar histórico de localização associado à identificação do usuário.
3. QUANDO um usuário revogar permissão de localização, O Walking Safely DEVE parar imediatamente de acessar dados GPS e limpar qualquer informação de localização em cache.
4. O Walking Safely DEVE agregar e anonimizar dados de localização antes de usar para análises estatísticas.
5. O Walking Safely DEVE fornecer mecanismo para usuário solicitar exclusão de dados pessoais conforme LGPD.

### Requisito 16: Gestão de Usuários e Permissões

**História de Usuário:** Como administrador, quero gerenciar usuários e suas permissões, para que o acesso ao sistema seja controlado adequadamente.

#### Critérios de Aceitação

1. O Walking Safely DEVE suportar três níveis de permissão: usuário comum, moderador e administrador.
2. QUANDO um administrador criar ou modificar permissões de usuário, O Walking Safely DEVE registrar a alteração em log de auditoria.
3. O Walking Safely DEVE implementar autenticação segura com suporte a autenticação de dois fatores para moderadores e administradores.
4. QUANDO um usuário exceder limite de tentativas de login falhas, O Walking Safely DEVE bloquear temporariamente a conta por 15 minutos.

### Requisito 17: Integração do Backend com Provedores de Mapas

**História de Usuário:** Como operador do sistema, quero que o backend tenha integração confiável com provedores de mapas, para que as funcionalidades de navegação funcionem de forma consistente.

#### Critérios de Aceitação

1. O Backend DEVE autenticar com Provedores de Mapas usando credenciais configuradas (API Key ou OAuth) para todas as requisições.
2. ENQUANTO a cota de uso do Provedor de Mapas atingir 80% do limite mensal, O Backend DEVE priorizar respostas em cache e reduzir chamadas externas à API em 50%.
3. QUANDO uma requisição ao Provedor de Mapas falhar, O Backend DEVE tentar novamente a requisição até 3 vezes com backoff exponencial antes de retornar um erro ao Aplicativo.
4. O Backend DEVE monitorar custos de API por provedor e alertar administradores quando custos excederem limites configurados.
5. O Backend DEVE implementar cache de respostas de geocodificação e rotas frequentes para reduzir chamadas aos provedores.

### Requisito 18: Performance do Sistema

**História de Usuário:** Como usuário, quero que o aplicativo responda rapidamente, para que eu possa usá-lo efetivamente enquanto me desloco.

#### Critérios de Aceitação

1. O Walking Safely DEVE responder a requisições de cálculo de rota em até 3 segundos sob condições normais de rede.
2. O Walking Safely DEVE responder a requisições de geocodificação em até 2 segundos sob condições normais de rede.
3. O Walking Safely DEVE carregar visualização de mapa com camadas de ocorrências em até 2 segundos.
4. O Walking Safely DEVE manter 99,5% de disponibilidade mensal para funcionalidades principais.
5. O Walking Safely DEVE otimizar consultas geoespaciais por região e nível de zoom para manter performance.

### Requisito 19: Serialização do Índice de Risco

**História de Usuário:** Como componente do sistema, quero que os dados do índice de risco sejam serializados de forma consistente para armazenamento e transmissão, para que a integridade dos dados seja mantida.

#### Critérios de Aceitação

1. QUANDO armazenar dados do Índice de Risco, O Walking Safely DEVE serializar os dados em formato JSON incluindo identificador da região, valor do índice, timestamp do cálculo e fatores contribuintes.
2. QUANDO recuperar dados do Índice de Risco, O Walking Safely DEVE desserializar os dados JSON de volta para a estrutura original do Índice de Risco.
3. O Walking Safely DEVE fornecer um formatador para dados do Índice de Risco que produza saída JSON legível por humanos.

### Requisito 20: Painel de Analytics

**História de Usuário:** Como administrador, quero acessar um painel de analytics, para que eu possa monitorar indicadores e tomar decisões baseadas em dados.

#### Critérios de Aceitação

1. O Walking Safely DEVE fornecer painel web com indicadores de gestão incluindo total de ocorrências, distribuição por tipo e região, e tendências temporais.
2. QUANDO um administrador acessar o painel, O Walking Safely DEVE exibir dados atualizados com defasagem máxima de 15 minutos.
3. O Walking Safely DEVE permitir exportação de relatórios em formato CSV e PDF.
4. O Walking Safely DEVE exibir métricas de qualidade de dados incluindo Score de Confiabilidade médio por fonte e taxa de deduplicação.


### Requisito 21: Internacionalização (i18n)

**História de Usuário:** Como usuário internacional, quero usar o aplicativo no meu idioma nativo, para que eu possa entender todas as informações e funcionalidades.

#### Critérios de Aceitação

1. O Aplicativo Mobile DEVE suportar múltiplos idiomas, incluindo no mínimo Português (Brasil), Inglês e Espanhol.
2. QUANDO um usuário selecionar um idioma nas configurações, O Aplicativo DEVE exibir toda a interface no idioma selecionado.
3. O Backend DEVE retornar mensagens de erro e notificações no idioma preferido do usuário.
4. O Walking Safely DEVE armazenar todas as strings de interface em arquivos de recursos separados do código.
5. QUANDO adicionar novo idioma ao sistema, O Walking Safely DEVE permitir a adição sem alterações no código fonte.
6. O Walking Safely DEVE detectar automaticamente o idioma do dispositivo do usuário e usar como padrão inicial.
7. QUANDO exibir nomes de tipos de crime da Taxonomia, O Walking Safely DEVE mostrar a tradução correspondente ao idioma do usuário.
8. O Backend DEVE serializar mensagens de erro com código de erro e chave de tradução, permitindo que o cliente exiba no idioma correto.

### Requisito 22: Gestão de Traduções

**História de Usuário:** Como administrador, quero gerenciar as traduções do sistema, para que o conteúdo esteja sempre atualizado em todos os idiomas.

#### Critérios de Aceitação

1. O Walking Safely DEVE manter um repositório centralizado de traduções para todos os idiomas suportados.
2. QUANDO uma tradução estiver faltando para um idioma, O Walking Safely DEVE usar o idioma padrão (Português) como fallback.
3. O Walking Safely DEVE fornecer interface administrativa para adicionar e editar traduções.
4. QUANDO uma tradução for modificada, O Walking Safely DEVE versionar a alteração e manter histórico.
5. O Walking Safely DEVE exportar e importar traduções em formato JSON para facilitar trabalho de tradutores externos.
