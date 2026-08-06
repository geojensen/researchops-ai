# ResearchOps.ai

Public pages and server-side visitor analytics for [researchops.ai](https://researchops.ai).

## Test

The static contract suite requires Node 18 or newer:

```bash
npm test
```

The analytics behavior suite runs where PHP 8.1 or newer is available:

```bash
npm run test:server
```

Run both with `npm run test:all` on the hosted server before switching traffic to a new deployment.

## Deploy with Ploi

Connect `geojensen/researchops-ai` on `main` and serve the repository root with PHP 8.1 or newer. An ordinary deployment only needs to pull the repository; there is no build step.

The analytics endpoint will refuse traffic until these values exist in Ploi's environment file:

```dotenv
ANALYTICS_PASSWORD_HASH='$2y$...'
ANALYTICS_HASH_KEY='at-least-32-random-characters'
```

Generate the password hash and fingerprint key on the server without writing either value into Git:

```bash
php -r 'echo password_hash("YOUR ADMIN PASSWORD", PASSWORD_DEFAULT), PHP_EOL;'
php -r 'echo bin2hex(random_bytes(32)), PHP_EOL;'
```

Paste the first result into `ANALYTICS_PASSWORD_HASH` and the second into `ANALYTICS_HASH_KEY`, keeping the quotes. After deployment, open `https://researchops.ai/analytics/` and sign in. Successful login excludes that browser from subsequent traffic counts; use a private browser window when testing a public pageview.

Analytics data is created at runtime and remains outside Git. The PHP process must be able to write to the `analytics` directory.
