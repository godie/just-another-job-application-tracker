<?php

declare(strict_types=1);

namespace OverPHP\Controllers;

use OverPHP\Telemetry\LogfireTelemetry;

/**
 * Receives web-vitals metrics from the frontend and logs them
 * as span events in the active OpenTelemetry trace.
 */
final class PerfController
{
    private const MAX_BODY_BYTES = 32_000;

    public function vitals(): array
    {
        $tracer = LogfireTelemetry::tracer();
        $span = $tracer->spanBuilder('web-vitals.receive')
            ->startSpan();

        $raw = file_get_contents('php://input', false, null, 0, self::MAX_BODY_BYTES + 1);
        if ($raw === false || $raw === '' || strlen($raw) > self::MAX_BODY_BYTES) {
            $data = [];
        } else {
            try {
                $decoded = json_decode($raw, true, 8, JSON_THROW_ON_ERROR);
                $data = is_array($decoded) ? $decoded : [];
            } catch (\Throwable) {
                $data = [];
            }
        }

        if (!empty($data)) {
            $span->addEvent('web-vital', [
                'webvital.name' => $data['name'] ?? 'unknown',
                'webvital.value' => $data['value'] ?? 0,
                'webvital.id' => $data['id'] ?? '',
                'webvital.navigation_type' => $data['navigationType'] ?? '',
                'webvital.rating' => $data['rating'] ?? '',
            ]);
        }

        $span->end();

        return ['success' => true];
    }
}
