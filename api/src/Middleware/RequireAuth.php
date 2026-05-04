<?php

declare(strict_types=1);

namespace OverPHP\Middleware;

use function OverPHP\Helpers\app_session_start;
use function OverPHP\Helpers\app_session_get_user_id;

class RequireAuth
{
    /**
     * Handle the authentication check.
     *
     * @return array|null Returns error array if not authenticated, null if authenticated
     */
    public static function handle(): ?array
    {
        app_session_start();
        $userId = app_session_get_user_id();

        if ($userId === null) {
            http_response_code(401);
            return [
                'success' => false,
                'error' => 'Authentication required',
                'message' => 'Please log in to access this resource',
            ];
        }

        return null;
    }

    /**
     * Check if user is authenticated without sending response.
     *
     * @return bool True if authenticated, false otherwise
     */
    public static function isAuthenticated(): bool
    {
        app_session_start();
        return app_session_get_user_id() !== null;
    }
}