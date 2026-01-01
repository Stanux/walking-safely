<?php

return [

    /*
    |--------------------------------------------------------------------------
    | Third Party Services
    |--------------------------------------------------------------------------
    |
    | This file is for storing the credentials for third party services such
    | as Mailgun, Postmark, AWS and more. This file provides the de facto
    | location for this type of information, allowing packages to have
    | a conventional file to locate the various service credentials.
    |
    */

    'postmark' => [
        'token' => env('POSTMARK_TOKEN'),
    ],

    'ses' => [
        'key' => env('AWS_ACCESS_KEY_ID'),
        'secret' => env('AWS_SECRET_ACCESS_KEY'),
        'region' => env('AWS_DEFAULT_REGION', 'us-east-1'),
    ],

    'resend' => [
        'key' => env('RESEND_KEY'),
    ],

    'slack' => [
        'notifications' => [
            'bot_user_oauth_token' => env('SLACK_BOT_USER_OAUTH_TOKEN'),
            'channel' => env('SLACK_BOT_USER_DEFAULT_CHANNEL'),
        ],
    ],

    /*
    |--------------------------------------------------------------------------
    | Map Provider Configuration
    |--------------------------------------------------------------------------
    |
    | Configuration for map providers (Google Maps, HERE Maps, Mapbox).
    | The system supports transparent switching between providers.
    |
    */

    'map_provider' => 'nominatim', // Forçado para nominatim

    'map_fallback_order' => ['nominatim', 'google', 'here', 'mapbox'],

    'google_maps' => [
        'api_key' => env('GOOGLE_MAPS_API_KEY', ''),
        'monthly_quota' => env('GOOGLE_MAPS_MONTHLY_QUOTA', 100000),
        'cost_alert_threshold' => env('GOOGLE_MAPS_COST_ALERT', 100.0),
    ],

    'here_maps' => [
        'api_key' => env('HERE_MAPS_API_KEY', ''),
        'monthly_quota' => env('HERE_MAPS_MONTHLY_QUOTA', 100000),
        'cost_alert_threshold' => env('HERE_MAPS_COST_ALERT', 100.0),
    ],

    'mapbox' => [
        'api_key' => env('MAPBOX_API_KEY', ''),
        'monthly_quota' => env('MAPBOX_MONTHLY_QUOTA', 100000),
        'cost_alert_threshold' => env('MAPBOX_COST_ALERT', 100.0),
    ],

    'nominatim' => [
        'monthly_quota' => env('NOMINATIM_MONTHLY_QUOTA', 100000),
        'cost_alert_threshold' => 0, // Free service
    ],

    'hybrid_traffic' => [
        'max_traffic_requests_per_hour' => env('HYBRID_TRAFFIC_MAX_REQUESTS_HOUR', 100),
        'cache_hit_ratio_threshold' => env('HYBRID_TRAFFIC_CACHE_THRESHOLD', 0.7),
        'fallback_to_estimated' => env('HYBRID_TRAFFIC_FALLBACK', true),
        'primary_traffic_provider' => env('HYBRID_TRAFFIC_PROVIDER', 'google'),
    ],

];
