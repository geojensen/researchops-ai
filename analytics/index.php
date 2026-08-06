<?php
declare(strict_types=1);

require_once __DIR__ . '/analytics.php';

function isSecureAnalyticsRequest(): bool
{
    return ($_SERVER['HTTPS'] ?? '') === 'on'
        || strtolower((string) ($_SERVER['HTTP_X_FORWARDED_PROTO'] ?? '')) === 'https';
}

function escapeAnalyticsHtml(mixed $value): string
{
    return htmlspecialchars((string) $value, ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8');
}

session_set_cookie_params([
    'lifetime' => 0,
    'path' => '/analytics/',
    'secure' => isSecureAnalyticsRequest(),
    'httponly' => true,
    'samesite' => 'Strict',
]);
session_start();
header('Cache-Control: no-store');

$passwordHash = readAnalyticsSetting('ANALYTICS_PASSWORD_HASH');
if ($passwordHash === null) {
    http_response_code(503);
    exit('Analytics dashboard is not configured.');
}

$_SESSION['analytics_csrf'] ??= bin2hex(random_bytes(24));
$csrf = $_SESSION['analytics_csrf'];

if (
    ($_SERVER['REQUEST_METHOD'] ?? '') === 'POST'
    && ($_POST['action'] ?? '') === 'logout'
    && hash_equals($csrf, (string) ($_POST['csrf'] ?? ''))
) {
    $_SESSION = [];
    session_destroy();
    header('Location: /analytics/');
    exit;
}

$loginError = '';
if (($_SERVER['REQUEST_METHOD'] ?? '') === 'POST' && ($_POST['action'] ?? '') === 'login') {
    $nowTimestamp = time();
    $failures = array_values(array_filter(
        $_SESSION['analytics_login_failures'] ?? [],
        fn (int $timestamp): bool => $timestamp >= $nowTimestamp - 900,
    ));

    if (count($failures) >= 5) {
        $loginError = 'Too many attempts. Try again in 15 minutes.';
    } elseif (password_verify((string) ($_POST['password'] ?? ''), $passwordHash)) {
        session_regenerate_id(true);
        $_SESSION['analytics_logged_in'] = true;
        $_SESSION['analytics_login_failures'] = [];
        setcookie('researchops_analytics_exclude', '1', [
            'expires' => time() + 31536000,
            'path' => '/',
            'secure' => isSecureAnalyticsRequest(),
            'httponly' => true,
            'samesite' => 'Lax',
        ]);
        header('Location: /analytics/');
        exit;
    } else {
        $failures[] = $nowTimestamp;
        $_SESSION['analytics_login_failures'] = $failures;
        $loginError = 'Incorrect password.';
    }
}

if (($_SESSION['analytics_logged_in'] ?? false) !== true) {
    ?>
<!doctype html>
<html lang="en">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>Analytics Login | ResearchOps.ai</title>
    <link rel="icon" type="image/x-icon" href="/img/favicon.png">
    <link rel="stylesheet" href="/analytics/style.css">
</head>
<body class="login-body">
<main class="login-card">
    <p class="eyebrow">ResearchOps.ai</p>
    <h1>Visitor analytics</h1>
    <p>Sign in to view traffic for the agent manifest.</p>
    <?php if ($loginError !== ''): ?>
        <p class="error" role="alert"><?= escapeAnalyticsHtml($loginError) ?></p>
    <?php endif; ?>
    <form method="post" action="/analytics/">
        <input type="hidden" name="action" value="login">
        <label for="password">Password</label>
        <input id="password" name="password" type="password" required autofocus autocomplete="current-password">
        <button type="submit">Sign in</button>
    </form>
</main>
</body>
</html>
    <?php
    exit;
}

$loadError = '';
try {
    $analytics = summarizeAnalytics(
        readAnalyticsState(resolveAnalyticsDataPath()),
        new DateTimeImmutable('now', new DateTimeZone('UTC')),
    );
} catch (Throwable $error) {
    error_log('ResearchOps analytics read failed: ' . $error->getMessage());
    $loadError = 'Analytics data could not be read. Check the server log.';
    $analytics = summarizeAnalytics(createEmptyAnalyticsState(), new DateTimeImmutable('now', new DateTimeZone('UTC')));
}

$maximumHistoryViews = max(1, ...array_map(
    fn (array $day): int => (int) $day['views'],
    array_values($analytics['history']),
));
?>
<!doctype html>
<html lang="en">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>Visitor Analytics | ResearchOps.ai</title>
    <link rel="icon" type="image/x-icon" href="/img/favicon.png">
    <link rel="stylesheet" href="/analytics/style.css">
</head>
<body>
<header class="dashboard-nav">
    <a href="/">ResearchOps.ai</a>
    <form method="post" action="/analytics/">
        <input type="hidden" name="action" value="logout">
        <input type="hidden" name="csrf" value="<?= escapeAnalyticsHtml($csrf) ?>">
        <button class="text-button" type="submit">Log out</button>
    </form>
</header>

<main class="dashboard">
    <header class="dashboard-header">
        <div>
            <p class="eyebrow">Agent manifest</p>
            <h1>Visitor analytics</h1>
            <p>Traffic for <a href="/dstl-method-criteria/">/dstl-method-criteria/</a>. Times are UTC.</p>
        </div>
    </header>

    <?php if ($loadError !== ''): ?>
        <p class="error" role="alert"><?= escapeAnalyticsHtml($loadError) ?></p>
    <?php endif; ?>

    <section class="metrics" aria-label="Traffic summary">
        <article><p>Today’s pageviews</p><strong><?= (int) $analytics['today']['views'] ?></strong><span>Yesterday: <?= (int) $analytics['yesterday']['views'] ?></span></article>
        <article><p>Today’s uniques</p><strong><?= (int) $analytics['today']['unique_count'] ?></strong><span>Yesterday: <?= (int) $analytics['yesterday']['unique_count'] ?></span></article>
        <article><p>Last 7 days</p><strong><?= (int) $analytics['views7'] ?></strong><span>Pageviews</span></article>
        <article><p>Last 30 days</p><strong><?= (int) $analytics['views30'] ?></strong><span>Pageviews</span></article>
    </section>

    <section class="panel">
        <h2>Daily traffic · last 14 days</h2>
        <div class="chart" role="img" aria-label="Daily pageviews for the last 14 days">
            <?php foreach ($analytics['history'] as $date => $day): ?>
                <?php $height = max(2, round(((int) $day['views'] / $maximumHistoryViews) * 100)); ?>
                <div class="chart-day" title="<?= escapeAnalyticsHtml($date) ?>: <?= (int) $day['views'] ?> views, <?= (int) $day['uniques'] ?> uniques">
                    <span><?= (int) $day['views'] ?></span>
                    <i style="height: <?= $height ?>%"></i>
                    <small><?= escapeAnalyticsHtml(substr($date, 5)) ?></small>
                </div>
            <?php endforeach; ?>
        </div>
    </section>

    <div class="panel-grid">
        <section class="panel">
            <h2>Referrers · last 90 days</h2>
            <?php if ($analytics['referrers'] === []): ?><p class="empty">No referrers recorded yet.</p><?php endif; ?>
            <ol class="breakdown">
                <?php foreach (array_slice($analytics['referrers'], 0, 10, true) as $label => $count): ?>
                    <li><span><?= escapeAnalyticsHtml($label) ?></span><strong><?= (int) $count ?></strong></li>
                <?php endforeach; ?>
            </ol>
        </section>

        <section class="panel">
            <h2>Devices and browsers</h2>
            <div class="split-breakdown">
                <ol class="breakdown">
                    <?php foreach ($analytics['devices'] as $label => $count): ?>
                        <li><span><?= escapeAnalyticsHtml($label) ?></span><strong><?= (int) $count ?></strong></li>
                    <?php endforeach; ?>
                </ol>
                <ol class="breakdown">
                    <?php foreach ($analytics['browsers'] as $label => $count): ?>
                        <li><span><?= escapeAnalyticsHtml($label) ?></span><strong><?= (int) $count ?></strong></li>
                    <?php endforeach; ?>
                </ol>
            </div>
        </section>
    </div>

    <section class="panel">
        <h2>Recent activity</h2>
        <?php if ($analytics['recent'] === []): ?>
            <p class="empty">No pageviews recorded yet.</p>
        <?php else: ?>
            <div class="table-scroll">
                <table>
                    <thead><tr><th>Time</th><th>Referrer</th><th>Device</th><th>Browser</th></tr></thead>
                    <tbody>
                    <?php foreach ($analytics['recent'] as $entry): ?>
                        <tr>
                            <td><?= escapeAnalyticsHtml($entry['time'] ?? '') ?></td>
                            <td><?= escapeAnalyticsHtml($entry['referrer'] ?? 'Direct') ?></td>
                            <td><?= escapeAnalyticsHtml($entry['device'] ?? 'Other') ?></td>
                            <td><?= escapeAnalyticsHtml($entry['browser'] ?? 'Other') ?></td>
                        </tr>
                    <?php endforeach; ?>
                    </tbody>
                </table>
            </div>
        <?php endif; ?>
    </section>
</main>
</body>
</html>
