<?php
declare(strict_types=1);

require_once __DIR__ . '/analytics.php';

header('Cache-Control: no-store');
header('Content-Type: application/json; charset=utf-8');

function sendAnalyticsResponse(int $status, array $payload): never
{
    http_response_code($status);
    echo json_encode($payload, JSON_UNESCAPED_SLASHES);
    exit;
}

if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'POST') {
    header('Allow: POST');
    sendAnalyticsResponse(405, ['success' => false]);
}

if (($_COOKIE['researchops_analytics_exclude'] ?? '') === '1' || ($_SERVER['HTTP_DNT'] ?? '') === '1') {
    sendAnalyticsResponse(200, ['success' => true, 'recorded' => false]);
}

$body = file_get_contents('php://input', false, null, 0, 4097);
if ($body === false || strlen($body) > 4096) {
    sendAnalyticsResponse(413, ['success' => false]);
}

try {
    $payload = json_decode($body, true, 16, JSON_THROW_ON_ERROR);
} catch (JsonException) {
    sendAnalyticsResponse(400, ['success' => false]);
}

$expectedPath = '/dstl-method-criteria/';
if (!is_array($payload) || ($payload['path'] ?? '') !== $expectedPath) {
    sendAnalyticsResponse(400, ['success' => false]);
}

$siteHost = (string) ($_SERVER['HTTP_HOST'] ?? 'researchops.ai');
$origin = (string) ($_SERVER['HTTP_ORIGIN'] ?? '');
if ($origin !== '') {
    $originHost = parse_url($origin, PHP_URL_HOST);
    $expectedHost = explode(':', $siteHost)[0];
    if (!is_string($originHost) || strcasecmp($originHost, $expectedHost) !== 0) {
        sendAnalyticsResponse(403, ['success' => false]);
    }
}

$key = readAnalyticsSetting('ANALYTICS_HASH_KEY');
if ($key === null || strlen($key) < 32) {
    sendAnalyticsResponse(503, ['success' => false]);
}

$now = new DateTimeImmutable('now', new DateTimeZone('UTC'));
$userAgent = substr((string) ($_SERVER['HTTP_USER_AGENT'] ?? 'Unknown'), 0, 500);
$ipAddress = substr((string) ($_SERVER['REMOTE_ADDR'] ?? 'Unknown'), 0, 80);
$referrer = substr((string) ($payload['referrer'] ?? ''), 0, 2000);
$event = [
    'path' => $expectedPath,
    'referrer' => parseReferrerDomain($referrer, $siteHost),
    'device' => classifyDevice($userAgent),
    'browser' => classifyBrowser($userAgent),
];
$fingerprint = createDailyFingerprint($ipAddress, $userAgent, $now, $key);

try {
    updateAnalyticsState(
        resolveAnalyticsDataPath(),
        fn (array $state): array => recordAnalyticsEvent($state, $event, $fingerprint, $now),
    );
} catch (Throwable $error) {
    error_log('ResearchOps analytics write failed: ' . $error->getMessage());
    sendAnalyticsResponse(500, ['success' => false]);
}

sendAnalyticsResponse(200, ['success' => true, 'recorded' => true]);
