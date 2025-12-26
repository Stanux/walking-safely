<?php

return [
    // General
    'welcome' => 'Welcome to Walking Safely',
    'app_name' => 'Walking Safely',
    
    // Navigation
    'navigation' => [
        'home' => 'Home',
        'routes' => 'Routes',
        'occurrences' => 'Occurrences',
        'heatmap' => 'Heat Map',
        'settings' => 'Settings',
        'profile' => 'Profile',
        'logout' => 'Logout',
    ],
    
    // Routes
    'routes' => [
        'calculate' => 'Calculate Route',
        'origin' => 'Origin',
        'destination' => 'Destination',
        'safe_route' => 'Safest Route',
        'fastest_route' => 'Fastest Route',
        'distance' => 'Distance',
        'duration' => 'Duration',
        'risk_level' => 'Risk Level',
        'recalculating' => 'Recalculating route...',
    ],
    
    // Risk Levels
    'risk' => [
        'low' => 'Low',
        'medium' => 'Medium',
        'high' => 'High',
        'critical' => 'Critical',
        'warning' => 'Warning: This route passes through a :level risk area',
        'no_safe_alternative' => 'No safer alternative available',
    ],
    
    // Route Risk Messages
    'risk_level' => [
        'low' => 'low',
        'moderate' => 'moderate',
        'high' => 'high',
    ],
    'route_warning' => 'Caution: This route passes through a :risk_level risk area. Stay alert.',
    'route_warning_with_crime' => 'Caution: This route passes through a :risk_level risk area. Predominant occurrence type: :crime_type. Stay alert.',
    'route_recalculated' => 'Route recalculated due to :time_change% increase in travel time.',
    'risk_increased' => 'Risk level increased from :old_risk to :new_risk.',
    'risk_decreased' => 'Risk level decreased from :old_risk to :new_risk.',
    
    // Occurrences
    'occurrences' => [
        'report' => 'Report Occurrence',
        'type' => 'Occurrence Type',
        'severity' => 'Severity',
        'description' => 'Description',
        'location' => 'Location',
        'timestamp' => 'Date/Time',
        'submitted' => 'Occurrence reported successfully',
        'rate_limit' => 'You have reached the hourly report limit',
        'location_invalid' => 'Invalid location. You must be near the occurrence location.',
    ],
    
    // Alerts
    'alerts' => [
        'entering_high_risk' => 'You are entering a high risk area',
        'predominant_crime' => 'Predominant crime type: :type',
        'stay_alert' => 'Stay alert',
        'high_risk_region' => 'Warning: You are in a high risk area. Risk level: :risk_level. Stay alert.',
        'approaching_high_risk' => 'Caution: You are approaching a high risk area in :distance meters. Risk level: :risk_level.',
        'preferences_updated' => 'Alert preferences updated successfully',
    ],
    
    // Authentication
    'auth' => [
        'login' => 'Login',
        'register' => 'Register',
        'email' => 'Email',
        'password' => 'Password',
        'confirm_password' => 'Confirm Password',
        'remember_me' => 'Remember me',
        'forgot_password' => 'Forgot password?',
        'account_locked' => 'Account temporarily locked. Try again in :minutes minutes.',
    ],
    
    // Errors
    'errors' => [
        'generic' => 'An error occurred. Please try again.',
        'not_found' => 'Resource not found',
        'unauthorized' => 'Unauthorized access',
        'validation' => 'Validation error',
        'server_error' => 'Internal server error',
        'map_provider_unavailable' => 'Map service temporarily unavailable',
    ],

    // Location Permission
    'location_permission_required' => 'Location permission is required to use this feature.',
    'authentication_required' => 'Authentication is required.',
    'location_permission_granted' => 'Location permission granted successfully.',
    'location_permission_revoked' => 'Location permission revoked. All location data has been cleared.',
    'location_data_cleared' => 'All your location data has been cleared.',

    // Privacy & LGPD
    'privacy' => [
        'data_deletion_requested' => 'Your data deletion request has been received and will be processed.',
        'data_deletion_completed' => 'Your personal data has been deleted.',
        'data_export_ready' => 'Your data export is ready for download.',
        'consent_required' => 'Your consent is required to proceed.',
    ],
    
    // Success messages
    'success' => [
        'saved' => 'Saved successfully',
        'updated' => 'Updated successfully',
        'deleted' => 'Deleted successfully',
    ],
];
