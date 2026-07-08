<?php

declare(strict_types=1);

namespace OverPHP\Tests\Core;

use InvalidArgumentException;
use OverPHP\Core\Container;
use PHPUnit\Framework\TestCase;

/**
 * Smoke tests for Container::build()'s InvalidArgumentException throw.
 *
 * Background (from Phase 8 code review, commit 99665c1):
 *
 *   Container::build() was tightened from `build(mixed $concrete): mixed`
 *   to `build(string|object|\Closure $concrete): object` and now throws
 *   \InvalidArgumentException when the concrete is a non-class string
 *   (the previous "return raw value" behavior was a silent-failure
 *   footgun). The throw fires in the make() flow when:
 *     - $concrete is NOT a Closure
 *     - $concrete is NOT an object
 *     - $concrete is NOT a callable non-class string
 *   so the only path to build() is a class-name string (built) or a
 *   non-class, non-callable string (throw).
 *
 * What this test locks in:
 *
 *   1. make() with a non-class string (direct case) raises
 *      InvalidArgumentException — the abstract == concrete path.
 *   2. make() with a non-class string via bind() (binding case) raises
 *      InvalidArgumentException — the concrete-is-resolved-from-bindings
 *      path. Same throw, different code path through make().
 *
 * If a future refactor (a) silently coerces non-class strings to a
 * default, or (b) reverts build() to the previous `mixed` signature
 * with the silent-return behavior, both tests will fail loudly.
 *
 * @group smoke
 */
class ContainerSmokeTest extends TestCase
{
    private Container $container;

    protected function setUp(): void
    {
        // Fresh Container per test to avoid static-state pollution
        // (Container::$reflectionCache + Container::$instance are both
        // static). The throw path doesn't touch either static, but
        // using a fresh instance keeps the test isolated.
        $this->container = new Container();
    }

    public function testBuildWithNonClassStringThrows(): void
    {
        // Direct case: make() with a non-class, non-callable string.
        // Reaches build() via the else branch in make() (not Closure,
        // not object, not a callable non-class string). The class
        // name uses a backslash namespace separator to ensure it's
        // neither an existing class nor a callable function name.
        $this->expectException(InvalidArgumentException::class);
        $this->expectExceptionMessageMatches('/unknown class/');
        $this->container->make('NonExistent\\SmokeTestClass');
    }

    public function testBuildWithNonClassStringViaBindingThrows(): void
    {
        // Binding case: bind() a non-class string as the concrete,
        // then make() resolves the binding and passes the non-class
        // string to build(). Different code path through make()
        // ($isBound === true), same throw in build().
        $this->container->bind('smoke_test_abstract', 'NonExistent\\SmokeTestBindingConcrete');
        $this->expectException(InvalidArgumentException::class);
        $this->expectExceptionMessageMatches('/unknown class/');
        $this->container->make('smoke_test_abstract');
    }
}
