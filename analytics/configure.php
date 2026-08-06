<?php
declare(strict_types=1);

require_once __DIR__ . '/analytics.php';

function readHiddenAnalyticsPassword(string $prompt): string
{
    if (!stream_isatty(STDIN)) {
        throw new RuntimeException('Run this command from an interactive terminal.');
    }

    fwrite(STDOUT, $prompt);
    $terminalMode = trim((string) shell_exec('stty -g'));
    if ($terminalMode === '') {
        throw new RuntimeException('Terminal settings could not be read.');
    }

    shell_exec('stty -echo');
    try {
        $input = fgets(STDIN);
    } finally {
        shell_exec('stty ' . escapeshellarg($terminalMode));
        fwrite(STDOUT, PHP_EOL);
    }

    if ($input === false) {
        throw new RuntimeException('Password input could not be read.');
    }

    return rtrim($input, "\r\n");
}

function resolveAnalyticsProjectRoot(): string
{
    $parent = dirname(__DIR__);
    return basename($parent) === 'public' ? dirname($parent) : $parent;
}

if (PHP_SAPI !== 'cli') {
    http_response_code(404);
    exit;
}

try {
    $password = readHiddenAnalyticsPassword('New analytics password: ');
    $confirmation = readHiddenAnalyticsPassword('Confirm analytics password: ');

    if ($password !== $confirmation) {
        throw new RuntimeException('Passwords did not match. Nothing changed.');
    }
    if (strlen($password) < 12) {
        throw new RuntimeException('Use at least 12 characters. Nothing changed.');
    }

    $passwordHash = password_hash($password, PASSWORD_DEFAULT);
    if (!is_string($passwordHash) || !password_verify($password, $passwordHash)) {
        throw new RuntimeException('The password hash could not be verified. Nothing changed.');
    }

    $hashKey = readAnalyticsSetting('ANALYTICS_HASH_KEY') ?? bin2hex(random_bytes(32));
    $environmentPath = resolveAnalyticsProjectRoot() . '/.env';
    $contents = file_exists($environmentPath) ? file_get_contents($environmentPath) : '';
    if ($contents === false) {
        throw new RuntimeException('The environment file could not be read. Nothing changed.');
    }

    $updated = replaceAnalyticsEnvironmentSettings($contents, $passwordHash, $hashKey);
    $temporaryPath = $environmentPath . '.tmp-' . bin2hex(random_bytes(6));
    if (file_put_contents($temporaryPath, $updated, LOCK_EX) === false) {
        throw new RuntimeException('The environment file could not be written. Nothing changed.');
    }
    chmod($temporaryPath, 0600);
    if (!rename($temporaryPath, $environmentPath)) {
        @unlink($temporaryPath);
        throw new RuntimeException('The environment file could not be promoted. Nothing changed.');
    }

    fwrite(STDOUT, "Analytics password updated and verified.\n");
} catch (Throwable $error) {
    fwrite(STDERR, $error->getMessage() . PHP_EOL);
    exit(1);
}
