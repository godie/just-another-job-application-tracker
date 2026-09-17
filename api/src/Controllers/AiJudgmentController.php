<?php

declare(strict_types=1);

namespace OverPHP\Controllers;

use function OverPHP\Helpers\app_require_auth;

/**
 * Server-side proxy for TypeSafe System One judgments.
 *
 * The frontend sends `state` plus a map of typed questions (choice / score /
 * noul) and receives TypeSafe's typed answers. The API key never leaves the
 * server, and the endpoint requires an authenticated session so anonymous
 * callers cannot spend the account's quota.
 */
class AiJudgmentController
{
    private const TYPESAFE_URL = 'https://api.typesafe.ai/v1/systemone';
    private const DEFAULT_MODEL = 'jev-latest';

    /** Bounded so a single request cannot blow up cost or response size. */
    private const MAX_BODY_BYTES = 200_000;
    private const MAX_STATE_BYTES = 100_000;
    private const MAX_QUESTIONS = 25;

    private const ALLOWED_TYPES = ['choice', 'score', 'noul'];

    private const TIMEOUT_SECONDS = 30;

    /** @var array<string, mixed> */
    private array $config;

    public function __construct()
    {
        $this->config = require __DIR__ . '/../../config.php';
    }

    public function systemOne(): array
    {
        $authError = app_require_auth();
        if ($authError !== null) {
            return $authError;
        }

        $data = $this->readJson();
        if ($data === null) {
            http_response_code(400);
            return ['success' => false, 'error' => 'Invalid JSON body'];
        }

        $questions = $data['questions'] ?? null;
        if (!is_array($questions) || $questions === []) {
            http_response_code(400);
            return ['success' => false, 'error' => 'At least one question is required'];
        }
        if (count($questions) > self::MAX_QUESTIONS) {
            http_response_code(400);
            return ['success' => false, 'error' => 'Too many questions'];
        }
        foreach ($questions as $id => $question) {
            $type = is_array($question) ? ($question['type'] ?? null) : null;
            $instructions = is_array($question) ? ($question['instructions'] ?? null) : null;
            if (!is_string($id) || !in_array($type, self::ALLOWED_TYPES, true) || $instructions === null) {
                http_response_code(400);
                return ['success' => false, 'error' => "Invalid question: {$id}"];
            }
        }

        $state = $data['state'] ?? null;
        if ($state === null) {
            http_response_code(400);
            return ['success' => false, 'error' => 'State is required'];
        }
        if (strlen((string) json_encode($state)) > self::MAX_STATE_BYTES) {
            http_response_code(400);
            return ['success' => false, 'error' => 'State is too large'];
        }

        $apiKey = (string) ($this->config['typesafe_api_key'] ?? '');
        if ($apiKey === '') {
            http_response_code(503);
            return ['success' => false, 'error' => 'AI judgments are not configured'];
        }

        $result = $this->callTypeSafe([
            'state' => $state,
            'model' => (string) ($this->config['typesafe_model'] ?? self::DEFAULT_MODEL),
            'questions' => $questions,
        ], $apiKey);

        if (isset($result['error'])) {
            http_response_code(502);
            return ['success' => false, 'error' => $result['error']];
        }

        return [
            'success' => true,
            'model' => $result['model'] ?? null,
            'answers' => is_array($result['answers'] ?? null) ? $result['answers'] : [],
            'usage' => is_array($result['usage'] ?? null) ? $result['usage'] : null,
        ];
    }

    /**
     * @param array<string, mixed> $payload
     * @return array<string, mixed>
     */
    protected function callTypeSafe(array $payload, string $apiKey): array
    {
        $body = json_encode($payload);
        if ($body === false) {
            return ['error' => 'Could not encode request'];
        }

        $context = stream_context_create([
            'http' => [
                'method' => 'POST',
                'header' => "Content-Type: application/json\r\n"
                    . "Authorization: Bearer {$apiKey}\r\n",
                'content' => $body,
                'ignore_errors' => true,
                'timeout' => self::TIMEOUT_SECONDS,
            ],
        ]);

        $raw = @file_get_contents(self::TYPESAFE_URL, false, $context);
        if ($raw === false) {
            return ['error' => 'Could not reach the judgment service'];
        }

        try {
            $decoded = json_decode($raw, true, 32, JSON_THROW_ON_ERROR);
        } catch (\JsonException) {
            return ['error' => 'Invalid response from the judgment service'];
        }
        if (!is_array($decoded)) {
            return ['error' => 'Invalid response from the judgment service'];
        }
        if (isset($decoded['error'])) {
            $message = $decoded['error'];
            if (is_array($message)) {
                $message = $message['message'] ?? 'Judgment request rejected';
            }
            return ['error' => is_string($message) ? $message : 'Judgment request rejected'];
        }

        return $decoded;
    }

    /**
     * @return array<string, mixed>|null
     */
    protected function readJson(): ?array
    {
        $raw = file_get_contents('php://input', false, null, 0, self::MAX_BODY_BYTES + 1);
        if ($raw === false || $raw === '' || strlen($raw) > self::MAX_BODY_BYTES) {
            return null;
        }

        try {
            $decoded = json_decode($raw, true, 32, JSON_THROW_ON_ERROR);
        } catch (\JsonException) {
            return null;
        }

        return is_array($decoded) ? $decoded : null;
    }
}
