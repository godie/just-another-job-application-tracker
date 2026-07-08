<?php

declare(strict_types=1);

namespace OverPHP\Middleware;

/**
 * Session-based rate limiter using a file-based sliding-window counter.
 *
 * Limits requests to $maxRequests per $windowSeconds per user.
 * Stores timestamps in sys_get_temp_dir()/jat_rate_limits/{userId}.json
 * with atomic write-then-rename to prevent corruption from concurrent requests.
 */
class RateLimiter
{
    /** Maximum requests allowed within the window */
    private int $maxRequests;

    /** Window duration in seconds */
    private int $windowSeconds;

    /** Directory where rate-limit files are stored */
    private string $storageDir;

    /**
     * @param int $maxRequests  Max requests per window (default: 10)
     * @param int $windowSeconds  Window duration in seconds (default: 60)
     * @param string|null $storageDir  Custom storage directory (default: system temp + jat_rate_limits)
     */
    public function __construct(
        int $maxRequests = 10,
        int $windowSeconds = 60,
        ?string $storageDir = null
    ) {
        $this->maxRequests = $maxRequests;
        $this->windowSeconds = $windowSeconds;
        $this->storageDir = $storageDir ?? (sys_get_temp_dir() . '/jat_rate_limits');
    }

    /**
     * Check if the given user has exceeded the rate limit.
     *
     * Best-effort sliding window: there is an inherent TOCTOU race between read and
     * write that two concurrent requests from the same user could exploit to exceed
     * the limit in bursts. This is acceptable for an API credit protection use case.
     *
     * @param int $userId  The authenticated user ID
     * @return array{allowed: bool, remaining: int, retryAfter: int, limit: int, windowSeconds: int}
     */
    public function check(int $userId): array
    {
        $now = time();
        $this->ensureStorageDir();

        // Periodic garbage collection: ~1% of requests clean up stale files
        if (random_int(0, 99) === 0) {
            $this->collectGarbage($now);
        }

        $filePath = $this->filePath($userId);
        $timestamps = $this->readTimestamps($filePath);

        // Purge timestamps outside the window
        $cutoff = $now - $this->windowSeconds;
        $timestamps = array_values(array_filter($timestamps, fn(int $ts): bool => $ts > $cutoff));

        $currentCount = count($timestamps);

        if ($currentCount >= $this->maxRequests) {
            // Rate limit exceeded — calculate when it resets
            $oldestInWindow = min($timestamps);
            $retryAfter = max(1, $oldestInWindow + $this->windowSeconds - $now);

            return [
                'allowed' => false,
                'remaining' => 0,
                'retryAfter' => $retryAfter,
                'limit' => $this->maxRequests,
                'windowSeconds' => $this->windowSeconds,
            ];
        }

        // Record this request
        $timestamps[] = $now;
        $this->writeTimestamps($filePath, $timestamps);

        return [
            'allowed' => true,
            'remaining' => $this->maxRequests - count($timestamps),
            'retryAfter' => 0,
            'limit' => $this->maxRequests,
            'windowSeconds' => $this->windowSeconds,
        ];
    }

    /**
     * Build a standardized 429 error response array.
     *
     * @param array{retryAfter: int, limit: int, windowSeconds: int} $rateLimitInfo
     */
    public static function buildRateLimitError(array $rateLimitInfo): array
    {
        http_response_code(429);
        header('Retry-After: ' . $rateLimitInfo['retryAfter']);
        header('X-RateLimit-Limit: ' . $rateLimitInfo['limit']);
        header('X-RateLimit-Remaining: 0');
        header('X-RateLimit-Reset: ' . (time() + $rateLimitInfo['retryAfter']));

        return [
            'error' => 'rate_limited',
            'message' => 'Too many search requests. Please try again in ' . $rateLimitInfo['retryAfter'] . ' seconds.',
            'retryAfter' => $rateLimitInfo['retryAfter'],
            'limit' => $rateLimitInfo['limit'],
        ];
    }

    // ────────────────────────────────────────────
    //  File I/O helpers
    // ────────────────────────────────────────────

    private function filePath(int $userId): string
    {
        return $this->storageDir . '/' . $userId . '.json';
    }

    private function ensureStorageDir(): void
    {
        if (!is_dir($this->storageDir)) {
            @mkdir($this->storageDir, 0700, true);
        }
    }

    /**
     * Read timestamps array from file. Returns empty array if file doesn't exist
     * or is corrupted.
     *
     * @return int[]
     */
    private function readTimestamps(string $filePath): array
    {
        if (!file_exists($filePath)) {
            return [];
        }

        $contents = @file_get_contents($filePath);
        if ($contents === false) {
            return [];
        }

        $data = json_decode($contents, true);
        if (!is_array($data) || !isset($data['timestamps']) || !is_array($data['timestamps'])) {
            return [];
        }

        // Validate all entries are integers
        $timestamps = [];
        foreach ($data['timestamps'] as $ts) {
            if (is_int($ts) && $ts > 0) {
                $timestamps[] = $ts;
            }
        }

        return $timestamps;
    }

    /**
     * Write timestamps to file atomically (write to temp file, then rename)
     * to prevent corruption from concurrent requests.
     *
     * @param int[] $timestamps
     */
    private function writeTimestamps(string $filePath, array $timestamps): void
    {
        $data = json_encode([
            'timestamps' => $timestamps,
            'updated_at' => time(),
        ], JSON_THROW_ON_ERROR);

        $tmpPath = $filePath . '.' . uniqid('tmp_', true);
        $written = @file_put_contents($tmpPath, $data, LOCK_EX);

        if ($written === false) {
            // Non-critical: swallow write failures (best-effort rate limiting)
            return;
        }

        // Atomic rename — if it fails, clean up the temp file
        if (!@rename($tmpPath, $filePath)) {
            @unlink($tmpPath);
        }
    }

    /**
     * Periodic garbage collection: delete rate-limit files that haven't been
     * updated in over 1 hour (stale sessions / abandoned counters).
     */
    private function collectGarbage(int $now): void
    {
        $files = @glob($this->storageDir . '/*.json');
        if (!is_array($files)) {
            return;
        }

        $staleCutoff = $now - 3600; // 1 hour
        foreach ($files as $file) {
            $mtime = @filemtime($file);
            if ($mtime !== false && $mtime < $staleCutoff) {
                @unlink($file);
            }
        }

        // Also clean up orphaned temp files (named like "1.json.tmp_abc123")
        $tmpFiles = @glob($this->storageDir . '/*.tmp_*');
        if (is_array($tmpFiles)) {
            foreach ($tmpFiles as $tmpFile) {
                @unlink($tmpFile);
            }
        }
    }
}
