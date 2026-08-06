<?php
declare(strict_types=1);

const ANALYTICS_DATA_PREFIX = "<?php http_response_code(404); exit; ?>\n";

function readAnalyticsSetting(string $key): ?string
{
    foreach ([$_ENV, $_SERVER] as $source) {
        if (isset($source[$key]) && trim((string) $source[$key]) !== '') {
            return trim((string) $source[$key]);
        }
    }

    $value = getenv($key);
    if ($value !== false && trim($value) !== '') {
        return trim($value);
    }

    static $fileSettings;
    if ($fileSettings === null) {
        $fileSettings = [];
        $paths = array_unique([
            dirname(__DIR__) . '/.env',
            dirname(__DIR__, 2) . '/.env',
        ]);
        foreach ($paths as $path) {
            if (file_exists($path)) {
                $fileSettings = parse_ini_file($path, false, INI_SCANNER_RAW) ?: [];
                break;
            }
        }
    }

    return isset($fileSettings[$key]) && trim((string) $fileSettings[$key]) !== ''
        ? trim((string) $fileSettings[$key])
        : null;
}

function resolveAnalyticsDataPath(): string
{
    return readAnalyticsSetting('ANALYTICS_DATA_PATH') ?? __DIR__ . '/.analytics-data.php';
}

function createEmptyAnalyticsState(): array
{
    return ['summary' => [], 'recent' => []];
}

function readAnalyticsState(string $path): array
{
    if (!file_exists($path)) {
        return createEmptyAnalyticsState();
    }

    $contents = file_get_contents($path);
    if ($contents === false || !str_starts_with($contents, ANALYTICS_DATA_PREFIX)) {
        throw new RuntimeException('Analytics data could not be read safely.');
    }

    $decoded = json_decode(substr($contents, strlen(ANALYTICS_DATA_PREFIX)), true, 512, JSON_THROW_ON_ERROR);
    if (!is_array($decoded)) {
        throw new RuntimeException('Analytics data has an invalid shape.');
    }

    $decoded['summary'] = isset($decoded['summary']) && is_array($decoded['summary'])
        ? $decoded['summary']
        : [];
    $decoded['recent'] = isset($decoded['recent']) && is_array($decoded['recent'])
        ? $decoded['recent']
        : [];

    return $decoded;
}

function ensureAnalyticsDataDirectory(string $path): void
{
    $directory = dirname($path);
    if (!is_dir($directory) && !mkdir($directory, 0700, true) && !is_dir($directory)) {
        throw new RuntimeException('Analytics data directory could not be created.');
    }
}

function writeAnalyticsState(string $path, array $state): void
{
    ensureAnalyticsDataDirectory($path);

    $payload = ANALYTICS_DATA_PREFIX . json_encode(
        $state,
        JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES | JSON_THROW_ON_ERROR,
    ) . "\n";
    $temporary = $path . '.tmp-' . bin2hex(random_bytes(6));

    if (file_put_contents($temporary, $payload, LOCK_EX) === false) {
        throw new RuntimeException('Analytics data could not be written.');
    }
    chmod($temporary, 0600);

    if (!rename($temporary, $path)) {
        @unlink($temporary);
        throw new RuntimeException('Analytics data could not be promoted.');
    }
}

function updateAnalyticsState(string $path, callable $update): array
{
    ensureAnalyticsDataDirectory($path);
    $lockPath = $path . '.lock';
    $lock = fopen($lockPath, 'c');
    if ($lock === false || !flock($lock, LOCK_EX)) {
        if (is_resource($lock)) {
            fclose($lock);
        }
        throw new RuntimeException('Analytics data could not be locked.');
    }

    try {
        $state = $update(readAnalyticsState($path));
        writeAnalyticsState($path, $state);
        return $state;
    } finally {
        flock($lock, LOCK_UN);
        fclose($lock);
        @chmod($lockPath, 0600);
    }
}

function parseReferrerDomain(string $referrer, string $siteHost): string
{
    $referrerHost = parse_url($referrer, PHP_URL_HOST);
    if (!is_string($referrerHost) || $referrerHost === '') {
        return 'Direct';
    }

    $normalizedReferrer = preg_replace('/^www\./i', '', strtolower($referrerHost));
    $normalizedSite = preg_replace('/^www\./i', '', strtolower(explode(':', $siteHost)[0]));

    return $normalizedReferrer === $normalizedSite ? 'Internal' : $normalizedReferrer;
}

function classifyDevice(string $userAgent): string
{
    if (preg_match('/(tablet|ipad|playbook|silk)|(android(?!.*mobi))/i', $userAgent)) {
        return 'Tablet';
    }
    if (preg_match('/(mobile|iphone|ipod|blackberry|opera mini|iemobile|android)/i', $userAgent)) {
        return 'Mobile';
    }
    return 'Desktop';
}

function classifyBrowser(string $userAgent): string
{
    if (preg_match('/Edg/i', $userAgent)) {
        return 'Edge';
    }
    if (preg_match('/OPR|Opera/i', $userAgent)) {
        return 'Opera';
    }
    if (preg_match('/Firefox/i', $userAgent)) {
        return 'Firefox';
    }
    if (preg_match('/Chrome|CriOS/i', $userAgent)) {
        return 'Chrome';
    }
    if (preg_match('/Safari/i', $userAgent)) {
        return 'Safari';
    }
    return 'Other';
}

function createDailyFingerprint(
    string $ipAddress,
    string $userAgent,
    DateTimeImmutable $now,
    string $key,
): string {
    return hash_hmac('sha256', $now->format('Y-m-d') . "\n" . $ipAddress . "\n" . $userAgent, $key);
}

function recordAnalyticsEvent(
    array $state,
    array $event,
    string $fingerprint,
    DateTimeImmutable $now,
): array {
    $date = $now->format('Y-m-d');
    $state['summary'] = isset($state['summary']) && is_array($state['summary'])
        ? $state['summary']
        : [];
    $state['recent'] = isset($state['recent']) && is_array($state['recent'])
        ? $state['recent']
        : [];

    if (!isset($state['summary'][$date]) || !is_array($state['summary'][$date])) {
        $state['summary'][$date] = [
            'views' => 0,
            'unique_count' => 0,
            'fingerprints' => [],
            'referrers' => [],
            'devices' => ['Desktop' => 0, 'Mobile' => 0, 'Tablet' => 0],
            'browsers' => [],
        ];
    }

    $day = &$state['summary'][$date];
    $day['views'] = (int) ($day['views'] ?? 0) + 1;
    $day['fingerprints'] = isset($day['fingerprints']) && is_array($day['fingerprints'])
        ? $day['fingerprints']
        : [];

    if (!in_array($fingerprint, $day['fingerprints'], true)) {
        $day['fingerprints'][] = $fingerprint;
        $day['unique_count'] = count($day['fingerprints']);
    }

    foreach (['referrers' => 'referrer', 'devices' => 'device', 'browsers' => 'browser'] as $bucket => $field) {
        $label = (string) ($event[$field] ?? 'Other');
        $day[$bucket] = isset($day[$bucket]) && is_array($day[$bucket]) ? $day[$bucket] : [];
        $day[$bucket][$label] = (int) ($day[$bucket][$label] ?? 0) + 1;
    }

    array_unshift($state['recent'], [
        'time' => $now->format('Y-m-d H:i:s') . ' UTC',
        'path' => (string) ($event['path'] ?? '/dstl-method-criteria/'),
        'referrer' => (string) ($event['referrer'] ?? 'Direct'),
        'device' => (string) ($event['device'] ?? 'Desktop'),
        'browser' => (string) ($event['browser'] ?? 'Other'),
    ]);
    $state['recent'] = array_slice($state['recent'], 0, 200);

    ksort($state['summary']);
    if (count($state['summary']) > 90) {
        $state['summary'] = array_slice($state['summary'], -90, null, true);
    }

    foreach ($state['summary'] as $dayDate => &$daySummary) {
        if ($dayDate !== $date) {
            unset($daySummary['fingerprints']);
        }
    }
    unset($daySummary);

    return $state;
}

function addAnalyticsCounts(array &$totals, array $counts): void
{
    foreach ($counts as $label => $count) {
        $totals[$label] = (int) ($totals[$label] ?? 0) + (int) $count;
    }
}

function summarizeAnalytics(array $state, DateTimeImmutable $now): array
{
    $summary = isset($state['summary']) && is_array($state['summary']) ? $state['summary'] : [];
    $emptyDay = ['views' => 0, 'unique_count' => 0];
    $today = $now->format('Y-m-d');
    $yesterday = $now->modify('-1 day')->format('Y-m-d');
    $sevenDayStart = $now->modify('-6 days')->format('Y-m-d');
    $thirtyDayStart = $now->modify('-29 days')->format('Y-m-d');
    $views7 = 0;
    $views30 = 0;
    $referrers = [];
    $devices = [];
    $browsers = [];

    foreach ($summary as $date => $day) {
        $views = (int) ($day['views'] ?? 0);
        if ($date >= $sevenDayStart && $date <= $today) {
            $views7 += $views;
        }
        if ($date >= $thirtyDayStart && $date <= $today) {
            $views30 += $views;
        }
        addAnalyticsCounts($referrers, is_array($day['referrers'] ?? null) ? $day['referrers'] : []);
        addAnalyticsCounts($devices, is_array($day['devices'] ?? null) ? $day['devices'] : []);
        addAnalyticsCounts($browsers, is_array($day['browsers'] ?? null) ? $day['browsers'] : []);
    }

    arsort($referrers);
    arsort($devices);
    arsort($browsers);

    $history = [];
    for ($daysAgo = 13; $daysAgo >= 0; $daysAgo--) {
        $date = $now->modify("-$daysAgo days")->format('Y-m-d');
        $history[$date] = [
            'views' => (int) ($summary[$date]['views'] ?? 0),
            'uniques' => (int) ($summary[$date]['unique_count'] ?? 0),
        ];
    }

    return [
        'today' => array_merge($emptyDay, $summary[$today] ?? []),
        'yesterday' => array_merge($emptyDay, $summary[$yesterday] ?? []),
        'views7' => $views7,
        'views30' => $views30,
        'history' => $history,
        'referrers' => $referrers,
        'devices' => $devices,
        'browsers' => $browsers,
        'recent' => array_slice($state['recent'] ?? [], 0, 100),
    ];
}
