<?php

return [
    // General
    'welcome' => 'Bienvenido a Walking Safely',
    'app_name' => 'Walking Safely',
    
    // Navigation
    'navigation' => [
        'home' => 'Inicio',
        'routes' => 'Rutas',
        'occurrences' => 'Ocurrencias',
        'heatmap' => 'Mapa de Calor',
        'settings' => 'Configuración',
        'profile' => 'Perfil',
        'logout' => 'Cerrar Sesión',
    ],
    
    // Routes
    'routes' => [
        'calculate' => 'Calcular Ruta',
        'origin' => 'Origen',
        'destination' => 'Destino',
        'safe_route' => 'Ruta Más Segura',
        'fastest_route' => 'Ruta Más Rápida',
        'distance' => 'Distancia',
        'duration' => 'Duración',
        'risk_level' => 'Nivel de Riesgo',
        'recalculating' => 'Recalculando ruta...',
    ],
    
    // Risk Levels
    'risk' => [
        'low' => 'Bajo',
        'medium' => 'Medio',
        'high' => 'Alto',
        'critical' => 'Crítico',
        'warning' => 'Atención: Esta ruta pasa por una zona de riesgo :level',
        'no_safe_alternative' => 'No hay alternativa más segura disponible',
    ],
    
    // Route Risk Messages
    'risk_level' => [
        'low' => 'bajo',
        'moderate' => 'moderado',
        'high' => 'alto',
    ],
    'route_warning' => 'Atención: Esta ruta pasa por una zona de riesgo :risk_level. Mantente alerta.',
    'route_warning_with_crime' => 'Atención: Esta ruta pasa por una zona de riesgo :risk_level. Tipo de ocurrencia predominante: :crime_type. Mantente alerta.',
    'route_recalculated' => 'Ruta recalculada debido a un aumento del :time_change% en el tiempo de viaje.',
    'risk_increased' => 'El nivel de riesgo aumentó de :old_risk a :new_risk.',
    'risk_decreased' => 'El nivel de riesgo disminuyó de :old_risk a :new_risk.',
    
    // Occurrences
    'occurrences' => [
        'report' => 'Reportar Ocurrencia',
        'type' => 'Tipo de Ocurrencia',
        'severity' => 'Severidad',
        'description' => 'Descripción',
        'location' => 'Ubicación',
        'timestamp' => 'Fecha/Hora',
        'submitted' => 'Ocurrencia registrada con éxito',
        'rate_limit' => 'Has alcanzado el límite de reportes por hora',
        'location_invalid' => 'Ubicación inválida. Debes estar cerca del lugar de la ocurrencia.',
    ],
    
    // Alerts
    'alerts' => [
        'entering_high_risk' => 'Estás entrando en una zona de alto riesgo',
        'predominant_crime' => 'Tipo de crimen predominante: :type',
        'stay_alert' => 'Mantente alerta',
        'high_risk_region' => 'Advertencia: Estás en una zona de alto riesgo. Nivel de riesgo: :risk_level. Mantente alerta.',
        'approaching_high_risk' => 'Precaución: Te estás acercando a una zona de alto riesgo en :distance metros. Nivel de riesgo: :risk_level.',
        'preferences_updated' => 'Preferencias de alerta actualizadas con éxito',
    ],
    
    // Authentication
    'auth' => [
        'login' => 'Iniciar Sesión',
        'register' => 'Registrarse',
        'email' => 'Correo Electrónico',
        'password' => 'Contraseña',
        'confirm_password' => 'Confirmar Contraseña',
        'remember_me' => 'Recordarme',
        'forgot_password' => '¿Olvidaste tu contraseña?',
        'account_locked' => 'Cuenta bloqueada temporalmente. Intenta de nuevo en :minutes minutos.',
    ],
    
    // Errors
    'errors' => [
        'generic' => 'Ocurrió un error. Por favor, intenta de nuevo.',
        'not_found' => 'Recurso no encontrado',
        'unauthorized' => 'Acceso no autorizado',
        'validation' => 'Error de validación',
        'server_error' => 'Error interno del servidor',
        'map_provider_unavailable' => 'Servicio de mapas temporalmente no disponible',
    ],

    // Location Permission
    'location_permission_required' => 'Se requiere permiso de ubicación para usar esta función.',
    'authentication_required' => 'Se requiere autenticación.',
    'location_permission_granted' => 'Permiso de ubicación concedido con éxito.',
    'location_permission_revoked' => 'Permiso de ubicación revocado. Todos los datos de ubicación han sido eliminados.',
    'location_data_cleared' => 'Todos tus datos de ubicación han sido eliminados.',

    // Privacy & LGPD
    'privacy' => [
        'data_deletion_requested' => 'Tu solicitud de eliminación de datos ha sido recibida y será procesada.',
        'data_deletion_completed' => 'Tus datos personales han sido eliminados.',
        'data_export_ready' => 'Tu exportación de datos está lista para descargar.',
        'consent_required' => 'Se requiere tu consentimiento para continuar.',
    ],
    
    // Success messages
    'success' => [
        'saved' => 'Guardado con éxito',
        'updated' => 'Actualizado con éxito',
        'deleted' => 'Eliminado con éxito',
    ],
];
