<?php
declare(strict_types=1);

require_once dirname(__DIR__) . '/analytics/analytics.php';

$assertions = 0;

function expectAnalyticsSame(mixed $expected, mixed $actual, string $message): void
{
    global $assertions;
    $assertions++;
    if ($expected !== $actual) {
        throw new RuntimeException($message . "\nExpected: " . var_export($expected, true) . "\nActual: " . var_export($actual, true));
    }
}

function expectAnalyticsTrue(bool $condition, string $message): void
{
    expectAnalyticsSame(true, $condition, $message);
}

$now = new DateTimeImmutable('2026-08-06 12:00:00', new DateTimeZone('UTC'));
$event = [
    'path' => '/dstl-method-criteria/',
    'referrer' => 'linkedin.com',
    'device' => 'Desktop',
    'browser' => 'Chrome',
];

$state = recordAnalyticsEvent(createEmptyAnalyticsState(), $event, 'visitor-a', $now);
$state = recordAnalyticsEvent($state, $event, 'visitor-a', $now);
expectAnalyticsSame(2, $state['summary']['2026-08-06']['views'], 'Every pageview is counted.');
expectAnalyticsSame(1, $state['summary']['2026-08-06']['unique_count'], 'A visitor counts once per day.');

$state = recordAnalyticsEvent($state, $event, 'visitor-b', $now);
expectAnalyticsSame(2, $state['summary']['2026-08-06']['unique_count'], 'A second visitor changes the daily unique count.');
expectAnalyticsSame(3, $state['summary']['2026-08-06']['referrers']['linkedin.com'], 'Referrers aggregate with views.');
expectAnalyticsSame(3, count($state['recent']), 'Recent activity retains each pageview.');

expectAnalyticsSame('Internal', parseReferrerDomain('https://researchops.ai/example', 'researchops.ai'), 'Same-site navigation is internal.');
expectAnalyticsSame('google.com', parseReferrerDomain('https://www.google.com/search?q=research', 'researchops.ai'), 'External referrers reduce to domains.');
expectAnalyticsSame('Mobile', classifyDevice('Mozilla/5.0 (iPhone) Safari/605.1.15'), 'Mobile devices are classified.');
expectAnalyticsSame('Edge', classifyBrowser('Mozilla/5.0 Chrome/120.0 Edg/120.0'), 'Edge is not misclassified as Chrome.');

$summary = summarizeAnalytics($state, $now);
expectAnalyticsSame(3, $summary['today']['views'], 'The dashboard receives today’s views.');
expectAnalyticsSame(3, $summary['views7'], 'The seven-day total includes today.');
expectAnalyticsSame(14, count($summary['history']), 'The dashboard always receives fourteen chart days.');

$environment = replaceAnalyticsEnvironmentSettings(
    "EXISTING=value\nANALYTICS_PASSWORD_HASH='old'\nANALYTICS_HASH_KEY='old-key'\n",
    '$2y$10$new-hash',
    'new-key',
);
expectAnalyticsTrue(str_contains($environment, "EXISTING=value"), 'Unrelated environment settings survive configuration.');
expectAnalyticsSame(1, substr_count($environment, 'ANALYTICS_PASSWORD_HASH='), 'The password hash is replaced once.');
expectAnalyticsSame(1, substr_count($environment, 'ANALYTICS_HASH_KEY='), 'The fingerprint key is replaced once.');
expectAnalyticsTrue(
    str_contains($environment, "ANALYTICS_PASSWORD_HASH='" . '$2y$10$new-hash' . "'"),
    'The replacement hash keeps its dollar signs.',
);

$directory = sys_get_temp_dir() . '/researchops-analytics-' . bin2hex(random_bytes(6));
$path = $directory . '/data.php';
updateAnalyticsState(
    $path,
    fn (array $current): array => recordAnalyticsEvent($current, $event, 'visitor-a', $now),
);
$stored = file_get_contents($path);
expectAnalyticsTrue(
    is_string($stored) && str_starts_with($stored, ANALYTICS_DATA_PREFIX),
    'Stored analytics cannot be served as JSON by PHP.',
);
expectAnalyticsSame(1, readAnalyticsState($path)['summary']['2026-08-06']['views'], 'Stored analytics can be read back.');

@unlink($path);
@unlink($path . '.lock');
@rmdir($directory);

fwrite(STDOUT, $assertions . " analytics assertions passed.\n");
