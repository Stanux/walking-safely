<?php
/**
 * GitHub Webhook Handler for Auto-Deploy
 * Place this file in a web-accessible location on your VPS
 * Configure GitHub webhook to POST to this URL
 */

// Secret token for webhook validation (set this in GitHub webhook settings)
$secret = getenv('GITHUB_WEBHOOK_SECRET') ?: 'your-secret-token-here';

// Log file
$logFile = '/var/log/deploy.log';

// Validate request
$payload = file_get_contents('php://input');

// Handle both JSON and form-urlencoded payloads
$contentType = $_SERVER['CONTENT_TYPE'] ?? '';
if (strpos($contentType, 'application/x-www-form-urlencoded') !== false) {
    // GitHub sends payload as form field when content-type is urlencoded
    $payload = $_POST['payload'] ?? $payload;
}

$signature = $_SERVER['HTTP_X_HUB_SIGNATURE_256'] ?? '';

if (!$signature) {
    http_response_code(401);
    die('No signature provided');
}

$hash = 'sha256=' . hash_hmac('sha256', $payload, $secret);
if (!hash_equals($hash, $signature)) {
    http_response_code(401);
    die('Invalid signature');
}

// Parse payload
$data = json_decode($payload, true);

// Log received data for debugging
file_put_contents($logFile, date('Y-m-d H:i:s') . " - Received ref: " . ($data['ref'] ?? 'null') . "\n", FILE_APPEND);

// Only deploy on push to main branch
$ref = $data['ref'] ?? '';
if ($ref !== 'refs/heads/main') {
    echo 'Not main branch, skipping deploy. Ref: ' . $ref;
    exit(0);
}

// Log deployment
$logMessage = date('Y-m-d H:i:s') . " - Deploy triggered by " . ($data['pusher']['name'] ?? 'unknown') . "\n";
file_put_contents($logFile, $logMessage, FILE_APPEND);

// Execute deploy script in background
$deployScript = '/var/www/walking-safely/deploy.sh';
exec("nohup $deployScript >> $logFile 2>&1 &");

http_response_code(200);
echo 'Deploy started';
