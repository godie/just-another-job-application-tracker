<?php

declare(strict_types=1);

namespace OverPHP\Telemetry;

use OpenTelemetry\API\Trace\TracerInterface;
use OpenTelemetry\API\Trace\TracerProviderInterface;
use OpenTelemetry\Contrib\Otlp\OtlpHttpTransportFactory;
use OpenTelemetry\Contrib\Otlp\SpanExporter;
use OpenTelemetry\SDK\Trace\TracerProvider;
use OpenTelemetry\SDK\Trace\SpanProcessor\BatchSpanProcessor;
use OpenTelemetry\SDK\Common\Time\ClockFactory;
use OpenTelemetry\SDK\Resource\ResourceInfo;
use OpenTelemetry\SDK\Resource\ResourceInfoFactory;
use OpenTelemetry\SDK\Common\Attribute\Attributes;
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
    private const SERVICE_VERSION = '2.5.1';
    private const INSTRUMENTATION_NAME = 'overphp';
    private const INSTRUMENTATION_VERSION = '2.5.1';

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
            // ResourceInfoFactory exists with `defaultResource()`,
            // `emptyResource()`, and `mandatoryResource()` — not `create()`.
            // The idiomatic pattern is: start from `defaultResource()` so
            // OTel service detectors (process.pid, host.name,
            // telemetry.sdk.*) still register, then `.merge(...)` our custom
            // resource on top. Plain `ResourceInfo::create($attributes)`
            // loses the SDK-conventional merging.
            //
            // We additionally classify by class_exists() before touching
            // Attributes::create(): some prod deploys ship with a stale
            // vendor (composer install ran before the SDK package was
            // bumped) where the Attributes factory class is absent at
            // runtime. Forcing the autoloader there throws
            // "Class ... not found" and the whole init fails. With the
            // guard, we degrade gracefully to defaultResource() alone,
            // keeping OTel's built-in SDK service detectors intact while
            // deferring the custom SERVICE_NAME / SERVICE_VERSION /
            // DEPLOYMENT_ENVIRONMENT_NAME merge until the next deploy
            // where the SDK is up-to-date.
            $resource = ResourceInfoFactory::defaultResource();
            if (class_exists(Attributes::class)) {
                $attributes = Attributes::create([
                    ResourceAttributes::SERVICE_NAME => $serviceName,
                    ResourceAttributes::SERVICE_VERSION => self::SERVICE_VERSION,
                    ResourceAttributes::DEPLOYMENT_ENVIRONMENT_NAME => getenv('APP_ENV') ?: 'production',
                ]);
                $resource = $resource->merge(ResourceInfo::create($attributes));
            }

            $transport = (new OtlpHttpTransportFactory())->create(
                $baseUrl . '/v1/traces',
                'application/x-protobuf',
                ['Authorization' => 'Bearer ' . $token]
            );

            $exporter = new SpanExporter($transport);
            // BatchSpanProcessor requires an explicit ClockInterface as the
            // second constructor arg — the SDK does NOT default it.
            $spanProcessor = new BatchSpanProcessor($exporter, ClockFactory::getDefault());

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
