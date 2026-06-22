<?php

declare(strict_types=1);

namespace OverPHP\Helpers;

/**
 * Validate agent API key from Authorization header.
 *
 * Expects: Authorization: Bearer <token>
 *
 * @param string $expectedKey The expected API key from configuration
 * @return array|null Returns error array if invalid, null if valid
 */
function agent_require_api_key(string $expectedKey): ?array
{
    if ($expectedKey === '') {
        http_response_code(500);
        return [
            'success' => false,
            'error' => 'Agent API key not configured',
        ];
    }

    $header = $_SERVER['HTTP_AUTHORIZATION'] ?? '';

    if ($header === '') {
        http_response_code(401);
        return [
            'success' => false,
            'error' => 'Authorization header missing',
        ];
    }

    // Support "Bearer <token>" or just "<token>"
    if (str_starts_with($header, 'Bearer ')) {
        $token = substr($header, 7);
    } else {
        $token = $header;
    }

    // Use hash_equals to prevent timing attacks
    if (!hash_equals($expectedKey, $token)) {
        http_response_code(401);
        return [
            'success' => false,
            'error' => 'Invalid API key',
        ];
    }

    return null;
}
