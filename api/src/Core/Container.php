<?php

declare(strict_types=1);

namespace OverPHP\Core;

/**
 * Simple Service Container for Dependency Injection.
 */
final class Container
{
    /** @var array<string, mixed> */
    private array $bindings = [];

    /** @var array<string, mixed> */
    private array $instances = [];

    /** @var array<string, \ReflectionClass<object>> */
    private static array $reflectionCache = [];

    private static ?self $instance = null;

    public static function getInstance(): self
    {
        if (self::$instance === null) {
            self::$instance = new self();
        }
        return self::$instance;
    }

    /**
     * Register a binding.
     *
     * @param callable|string|object $concrete
     */
    public function bind(string $abstract, mixed $concrete, bool $shared = false): void
    {
        $this->bindings[$abstract] = [
            'concrete' => $concrete,
            'shared' => $shared,
        ];
    }

    /**
     * Register a singleton binding.
     */
    public function singleton(string $abstract, mixed $concrete): void
    {
        $this->bind($abstract, $concrete, true);
    }

    /**
     * Resolve the given type from the container.
     */
    public function make(string $abstract): mixed
    {
        if (isset($this->instances[$abstract])) {
            return $this->instances[$abstract];
        }

        $isBound = isset($this->bindings[$abstract]);
        $concrete = $isBound ? $this->bindings[$abstract]['concrete'] : $abstract;

        if ($concrete instanceof \Closure || (is_string($concrete) && !class_exists($concrete) && is_callable($concrete))) {
            $object = $concrete($this);
        } elseif (is_object($concrete)) {
            $object = $concrete;
        } else {
            $object = $this->build($concrete);
        }

        if (!$isBound || $this->bindings[$abstract]['shared']) {
            $this->instances[$abstract] = $object;
        }

        return $object;
    }

    /**
     * Instantiate a concrete instance of the given type.
     *
     * Note: \Closure is absent from the native signature because PHP 8.4
     * rejects object-subtype redundancies in union types (\Closure is
     * itself an object subtype). PHPDoc preserves the intent; the
     * is_object() guard below returns Closures unchanged.
     *
     * @param string|object|\Closure $concrete
     */
    private function build(string|object $concrete): object
    {
        if (is_object($concrete)) {
            return $concrete;
        }

        // After the is_object guard above, $concrete is guaranteed to be a
        // string (Closure is an object subtype). class_exists is the only
        // remaining validity check.
        if (!class_exists($concrete)) {
            throw new \InvalidArgumentException(
                'Cannot build instance: unknown class ' . $concrete
            );
        }

        if (isset(self::$reflectionCache[$concrete])) {
            $reflector = self::$reflectionCache[$concrete];
        } else {
            $reflector = new \ReflectionClass($concrete);
            self::$reflectionCache[$concrete] = $reflector;
        }

        if (!$reflector->isInstantiable()) {
            throw new \Exception("Class {$concrete} is not instantiable.");
        }

        $constructor = $reflector->getConstructor();

        if (null === $constructor) {
            return new $concrete();
        }

        $dependencies = $constructor->getParameters();
        $instances = $this->resolveDependencies($dependencies);

        return $reflector->newInstanceArgs($instances);
    }

    /**
     * Resolve all of the dependencies from the ReflectionParameters.
     *
     * @param \ReflectionParameter[] $dependencies
     * @return array<int, mixed>
     */
    private function resolveDependencies(array $dependencies): array
    {
        $results = [];

        foreach ($dependencies as $dependency) {
            $type = $dependency->getType();

            if (!$type instanceof \ReflectionNamedType || $type->isBuiltin()) {
                if ($dependency->isDefaultValueAvailable()) {
                    $results[] = $dependency->getDefaultValue();
                    continue;
                }
                throw new \Exception("Unable to resolve dependency {$dependency->getName()}.");
            }

            $results[] = $this->make($type->getName());
        }

        return $results;
    }
}
