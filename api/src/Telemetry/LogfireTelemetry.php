<?php

declare(strict_types=1);

namespace OverPHP\Telemetry;

use OpenTelemetry\API\Trace\TracerInterface;
use OpenTelemetry\API\Trace\TracerProviderInterface;
use OpenTelemetry\Contrib\Otlp\OtlpHttpTransportFactory;
use OpenTelemetry\SDK\Trace\TracerProvider;
use OpenTelemetry\SDK\Trace\SpanExporter\OtlpHttpExporter;
use OpenTelemetry\SDK\Trace\SpanProcessor\BatchSpanProcessor;
use OpenTelemetry\SDK\Resource\ResourceInfo;
use OpenTelemetry\SDK\Resource\ResourceInfoFactory;
use OpenTelemetry\SemConv\ResourceAttributes;

/**
 * Logfire telemetry bootstrap for OverPHP.
 *
 * Initializes OpenTelemetry tracing with OTLP HTTP export to Logfire.
 * Safe to call even when credentials are missing — telemetry silently
 * disables itself and returns a no-op tracer.
 */
final class LogfireTelemetry
{
    private const SERVICE_VERSION = '2.4.2';
    private const INSTRUMENTATION_NAME = 'overphp';
    private const INSTRUMENTATION_VERSION = '2.4.2';

    private static ?TracerProviderInterface $tracerProvider = null;
    private static ?TracerInterface $tracer = null;
    private static bool $initialized = false;

    /**
     * Initialize the tracer provider.
     *
     * @param array{logfire_token?:string, service_name?:string, base_url?:string} $config
     */
    public static function init(array $config = []): void
    {
        if (self::$initialized) {
            return;
        }
        self::$initialized = true;

        $token = $config['logfire_token'] ?? (getenv('LOGFIRE_TOKEN') ?: '');
        if ($token === '') {
            // Telemetry credentials missing — safe no-op.
            return;
        }

        $serviceName = $config['service_name'] ?? (getenv('OTEL_SERVICE_NAME') ?: 'overphp-api');
        $baseUrl = rtrim($config['base_url'] ?? (getenv('LOGFIRE_BASE_URL') ?: 'https://logfire-us.pydantic.dev'), '/');

        try {
            $resource = ResourceInfoFactory::create([
                ResourceAttributes::SERVICE_NAME => $serviceName,
                ResourceAttributes::SERVICE_VERSION => self::SERVICE_VERSION,
                ResourceAttributes::DEPLOYMENT_ENVIRONMENT => getenv('APP_ENV') ?: 'production',
            ]);

            $transport = (new OtlpHttpTransportFactory())->create(
                $baseUrl . '/v1/traces',
                'application/x-protobuf',
                ['Authorization' => 'Bearer ' . $token]
            );

            $exporter = new OtlpHttpExporter($transport);
            $spanProcessor = new BatchSpanProcessor($exporter);

            self::$tracerProvider = TracerProvider::builder()
                ->addSpanProcessor($spanProcessor)
                ->setResource($resource)
                ->build();

            self::$tracer = self::$tracerProvider->getTracer(self::INSTRUMENTATION_NAME, self::INSTRUMENTATION_VERSION);
        } catch (\Throwable $e) {
            // Swallow initialization errors so the app never fails because of telemetry.
            error_log('[LogfireTelemetry] Init failed: ' . $e->getMessage());
        }
    }

    public static function tracer(): TracerInterface
    {
        if (self::$tracer === null) {
            return (new TracerProvider())->getTracer('noop');
        }
        return self::$tracer;
    }

    public static function tracerProvider(): ?TracerProviderInterface
    {
        return self::$tracerProvider;
    }

    /**
     * Gracefully shut down the tracer provider.
     * Call at the end of the request lifecycle.
     */
    public static function shutdown(): void
    {
        if (self::$tracerProvider !== null) {
            try {
                self::$tracerProvider->shutdown();
            } catch (\Throwable $e) {
                error_log('[LogfireTelemetry] Shutdown failed: ' . $e->getMessage());
            }
        }
    }
}
