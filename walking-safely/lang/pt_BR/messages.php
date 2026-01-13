<?php

return [
    // General
    'welcome' => 'Bem-vindo ao Walking Safely',
    'app_name' => 'Walking Safely',
    
    // Navigation
    'navigation' => [
        'home' => 'Início',
        'routes' => 'Rotas',
        'occurrences' => 'Ocorrências',
        'heatmap' => 'Mapa de Calor',
        'settings' => 'Configurações',
        'profile' => 'Perfil',
        'logout' => 'Sair',
    ],
    
    // Routes
    'routes' => [
        'calculate' => 'Calcular Rota',
        'origin' => 'Origem',
        'destination' => 'Destino',
        'safe_route' => 'Rota Mais Segura',
        'fastest_route' => 'Rota Mais Rápida',
        'distance' => 'Distância',
        'duration' => 'Duração',
        'risk_level' => 'Nível de Risco',
        'recalculating' => 'Recalculando rota...',
    ],
    
    // Risk Levels
    'risk' => [
        'low' => 'Baixo',
        'medium' => 'Médio',
        'high' => 'Alto',
        'critical' => 'Crítico',
        'warning' => 'Atenção: Esta rota passa por região com risco :level',
        'no_safe_alternative' => 'Não há alternativa mais segura disponível',
    ],
    
    // Route Risk Messages
    'risk_level' => [
        'low' => 'baixo',
        'moderate' => 'moderado',
        'high' => 'alto',
    ],
    'route_warning' => 'Atenção: Esta rota passa por região com risco :risk_level. Mantenha-se alerta.',
    'route_warning_with_crime' => 'Atenção: Esta rota passa por região com risco :risk_level. Tipo de ocorrência predominante: :crime_type. Mantenha-se alerta.',
    'route_recalculated' => 'Rota recalculada devido a aumento de :time_change% no tempo de viagem.',
    'risk_increased' => 'Nível de risco aumentou de :old_risk para :new_risk.',
    'risk_decreased' => 'Nível de risco diminuiu de :old_risk para :new_risk.',
    
    // Occurrences
    'occurrences' => [
        'report' => 'Reportar Ocorrência',
        'type' => 'Tipo de Ocorrência',
        'severity' => 'Severidade',
        'description' => 'Descrição',
        'location' => 'Localização',
        'timestamp' => 'Data/Hora',
        'submitted' => 'Ocorrência registrada com sucesso',
        'rate_limit' => 'Você atingiu o limite de relatos por hora',
        'location_invalid' => 'Localização inválida. Você deve estar próximo ao local da ocorrência.',
    ],
    
    // Alerts
    'alerts' => [
        'entering_high_risk' => 'Você está entrando em uma região de alto risco',
        'predominant_crime' => 'Tipo de crime predominante: :type',
        'stay_alert' => 'Mantenha-se alerta',
        'high_risk_region' => 'Atenção: Você está em uma região de alto risco. Nível de risco: :risk_level. Mantenha-se alerta.',
        'approaching_high_risk' => 'Cuidado: Você está se aproximando de uma região de alto risco em :distance metros. Nível de risco: :risk_level.',
        'preferences_updated' => 'Preferências de alerta atualizadas com sucesso',
    ],
    
    // Authentication
    'auth' => [
        'login' => 'Entrar',
        'register' => 'Cadastrar',
        'email' => 'E-mail',
        'password' => 'Senha',
        'confirm_password' => 'Confirmar Senha',
        'remember_me' => 'Lembrar-me',
        'forgot_password' => 'Esqueceu a senha?',
        'account_locked' => 'Conta bloqueada temporariamente. Tente novamente em :minutes minutos.',
    ],
    
    // Errors
    'errors' => [
        'generic' => 'Ocorreu um erro. Tente novamente.',
        'not_found' => 'Recurso não encontrado',
        'unauthorized' => 'Acesso não autorizado',
        'validation' => 'Erro de validação',
        'server_error' => 'Erro interno do servidor',
        'map_provider_unavailable' => 'Serviço de mapas temporariamente indisponível',
    ],

    // Location Permission
    'location_permission_required' => 'Permissão de localização é necessária para usar este recurso.',
    'authentication_required' => 'Autenticação é necessária.',
    'location_permission_granted' => 'Permissão de localização concedida com sucesso.',
    'location_permission_revoked' => 'Permissão de localização revogada. Todos os dados de localização foram limpos.',
    'location_data_cleared' => 'Todos os seus dados de localização foram limpos.',

    // Privacy & LGPD
    'privacy' => [
        'data_deletion_requested' => 'Sua solicitação de exclusão de dados foi recebida e será processada.',
        'data_deletion_completed' => 'Seus dados pessoais foram excluídos.',
        'data_export_ready' => 'Sua exportação de dados está pronta para download.',
        'consent_required' => 'Seu consentimento é necessário para prosseguir.',
    ],
    
    // Success messages
    'success' => [
        'saved' => 'Salvo com sucesso',
        'updated' => 'Atualizado com sucesso',
        'deleted' => 'Removido com sucesso',
    ],

    // Occurrence messages
    'occurrence_created' => 'Ocorrência registrada com sucesso',
    'occurrence_not_found' => 'Ocorrência não encontrada',
    'occurrence_deleted' => 'Ocorrência excluída com sucesso',
    'occurrence_delete_forbidden' => 'Você não tem permissão para excluir esta ocorrência',
];
