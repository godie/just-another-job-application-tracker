<?php

declare(strict_types=1);

namespace OverPHP\Core;

final class Router
{
    private const MIME_TYPES = [
        'html' => 'text/html',
        'css'  => 'text/css',
        'js'   => 'application/javascript',
        'json' => 'application/json',
        'png'  => 'image/png',
        'jpg'  => 'image/jpeg',
        'jpeg' => 'image/jpeg',
        'gif'  => 'image/gif',
        'svg'  => 'image/svg+xml',
        'ico'  => 'image/x-icon',
        'webp' => 'image/webp',
        'txt'  => 'text/plain',
        'pdf'  => 'application/pdf',
    ];

    /** @var array<string, array{static: array<string, array{handler:mixed, options:array}>, dynamic: array<int, array{path:string, handler:mixed, options:array, params:array<string>}>}> */
    private array $routes = [];

    /** @var array<string, string> */
    private array $compiledRegex = [];

    private readonly string $controllerNamespace;
    private readonly string $prefix;
    private readonly ?Container $container;
    /** @var array{enabled:bool,path:string,fallback_index:string} */
    private readonly array $clientConfig;
    private readonly ?string $resolvedClientPath;
    private readonly ?string $resolvedFallbackPath;

    /**
     * @param array{enabled?:bool,path?:string,fallback_index?:string} $clientConfig
     */
    public function __construct(
        string $controllerNamespace = 'OverPHP\\Controllers',
        string $prefix = '/api',
        ?Container $container = null,
        array $clientConfig = []
    ) {
        $this->controllerNamespace = rtrim($controllerNamespace, '\\');
        $this->prefix = rtrim($prefix, '/');
        $this->container = $container ?? Container::getInstance();
        $this->clientConfig = array_merge([
            'enabled' => false,
            'path' => '',
            'fallback_index' => 'index.html',
        ], $clientConfig);

        $resolvedClientPath = null;
        $resolvedFallbackPath = null;

        if ($this->clientConfig['enabled'] && $this->clientConfig['path'] !== '') {
            $resolvedClientPath = realpath($this->clientConfig['path']) ?: null;
            if ($resolvedClientPath !== null) {
                // Append DIRECTORY_SEPARATOR to ensure str_starts_with is secure against sibling traversal
                $resolvedClientPath .= DIRECTORY_SEPARATOR;
                $fallbackPath = $resolvedClientPath . $this->clientConfig['fallback_index'];
                $resolvedFallbackPath = realpath($fallbackPath) ?: null;
            }
        }

        $this->resolvedClientPath = $resolvedClientPath;
        $this->resolvedFallbackPath = $resolvedFallbackPath;
    }

    /**
     * @param callable|string $handler
     * @param array $options Route options like 'skip_csrf' => true
     */
    public function add(string $method, string $path, $handler, array $options = []): void
    {
        $method = strtoupper($method);
        if (!isset($this->routes[$method])) {
            $this->routes[$method] = ['static' => [], 'dynamic' => []];
        }

        if (!str_contains($path, '{')) {
            $this->routes[$method]['static'][$path] = [
                'handler' => $handler,
                'options' => $options,
            ];
        } else {
            preg_match_all('/\{([a-zA-Z0-9_]+)\}/', $path, $matches);
            $this->routes[$method]['dynamic'][] = [
                'path' => $path,
                'handler' => $handler,
                'options' => $options,
                'params' => $matches[1],
            ];
        }
    }

    public function run(): void
    {
        $uri = strtok($_SERVER['REQUEST_URI'] ?? '/', '?') ?: '/';
        $method = strtoupper($_SERVER['REQUEST_METHOD'] ?? 'GET');

        $hasPrefix = $this->prefix !== '' && (
            $uri === $this->prefix || str_starts_with($uri, $this->prefix . '/')
        );

        if ($this->clientConfig['enabled'] && !$hasPrefix) {
            if ($this->serveClient($uri)) {
                return;
            }
        }

        if ($hasPrefix) {
            $uri = substr($uri, strlen($this->prefix));
            if ($uri === '') {
                $uri = '/';
            }
        }

        if (!isset($this->routes[$method])) {
            $this->sendError(404, 'Not Found');
            return;
        }

        // 1. Check static routes (O(1))
        if (isset($this->routes[$method]['static'][$uri])) {
            $route = $this->routes[$method]['static'][$uri];
            if ($this->validateCsrf($method, $route['options'])) {
                $this->handleRoute($route['handler']);
            }
            return;
        }

        // 2. Check dynamic routes (Combined Regex for high performance)
        $compiled = $this->getCompiledRegex($method);
        if ($compiled && preg_match($compiled, $uri, $matches)) {
            $index = (int) $matches['MARK'];
            $route = $this->routes[$method]['dynamic'][$index];
            if ($this->validateCsrf($method, $route['options'])) {
                $params = [];
                foreach ($route['params'] as $i => $name) {
                    $params[$name] = $matches[$i + 1] ?? '';
                }
                $this->handleRoute($route['handler'], $params);
            }
            return;
        }

        $this->sendError(404, 'Not Found');
    }

    private function validateCsrf(string $method, array $options): bool
    {
        if (Security::isCsrfEnabled() &&
            empty($options['skip_csrf']) &&
            in_array($method, ['POST', 'PUT', 'PATCH', 'DELETE'], true)) {

            $token = $_SERVER['HTTP_X_CSRF_TOKEN'] ?? $_SERVER['HTTP_X_XSRF_TOKEN'] ?? $_POST['_csrf_token'] ?? null;
            if (!Security::validateCsrfToken($token)) {
                $this->sendError(403, 'Invalid CSRF token');
                return false;
            }
        }
        return true;
    }

    private function handleRoute(mixed $handler, array $params = []): void
    {
        if (is_callable($handler)) {
            $response = $handler(...array_values($params));
            $this->emitResponse($response);
            return;
        }

        if (is_string($handler) && str_contains($handler, '@')) {
            [$controller, $methodName] = explode('@', $handler, 2);
            $controllerClass = $this->resolveControllerFqn($controller);

            if (!class_exists($controllerClass)) {
                $this->sendError(404, 'Controller Not Found');
                return;
            }

            $instance = $this->container->make($controllerClass);
            if (!method_exists($instance, $methodName)) {
                $this->sendError(404, 'Action Not Found');
                return;
            }

            $response = $instance->$methodName(...array_values($params));
            $this->emitResponse($response);
            return;
        }
    }

    private function getCompiledRegex(string $method): ?string
    {
        if (isset($this->compiledRegex[$method])) {
            return $this->compiledRegex[$method];
        }

        if (empty($this->routes[$method]['dynamic'])) {
            return null;
        }

        $patterns = [];
        foreach ($this->routes[$method]['dynamic'] as $index => $route) {
            $parts = preg_split('/(\{[a-zA-Z0-9_]+\})/', $route['path'], -1, PREG_SPLIT_DELIM_CAPTURE);
            $pattern = '';
            foreach ($parts as $part) {
                if (str_starts_with($part, '{') && str_ends_with($part, '}')) {
                    $pattern .= '([^/]+)';
                } else {
                    $pattern .= preg_quote($part, '#');
                }
            }
            $patterns[] = $pattern . '(*MARK:' . $index . ')';
        }

        return $this->compiledRegex[$method] = '#^(?|' . implode('|', $patterns) . ')$#';
    }

    private function serveClient(string $uri): bool
    {
        if ($this->resolvedClientPath === null) {
            return false;
        }

        $filePath = $this->resolvedClientPath . ltrim($uri, '/');

        if (is_dir($filePath)) {
            $filePath = rtrim($filePath, '/') . '/' . $this->clientConfig['fallback_index'];
        }

        $realFilePath = realpath($filePath);

        if ($realFilePath && str_starts_with($realFilePath, $this->resolvedClientPath) && is_file($realFilePath)) {
            $this->serveFile($realFilePath);
            return true;
        }

        if ($this->resolvedFallbackPath !== null && is_file($this->resolvedFallbackPath)) {
            $this->serveFile($this->resolvedFallbackPath);
            return true;
        }

        return false;
    }

    private function serveFile(string $filePath): void
    {
        $fileName = basename($filePath);
        $extension = strtolower(pathinfo($filePath, PATHINFO_EXTENSION));

        // 🔐 Security: Block PHP files and hidden files (starting with dot)
        if ($extension === 'php' || str_starts_with($fileName, '.')) {
            $this->sendError(403, 'Forbidden');
            return;
        }

        $stat = stat($filePath);
        if ($stat === false) {
            $this->sendError(404, 'Not Found');
            return;
        }

        $lastModified = $stat['mtime'];
        $fileSize = $stat['size'];
        $etag = sprintf('"%x-%x"', $lastModified, $fileSize);

        if (!headers_sent()) {
            $contentType = self::MIME_TYPES[$extension] ?? null;

            if ($contentType === null && class_exists('finfo')) {
                $finfo = new \finfo(FILEINFO_MIME_TYPE);
                $contentType = $finfo->file($filePath) ?: null;
            }

            if ($contentType === null) {
                $contentType = 'application/octet-stream';
            }

            header('Content-Type: ' . $contentType);
            header('Cache-Control: public, max-age=3600');
            header('Last-Modified: ' . gmdate('D, d M Y H:i:s', $lastModified) . ' GMT');
            header('ETag: ' . $etag);
            header('Content-Length: ' . $fileSize);

            $ifNoneMatch = $_SERVER['HTTP_IF_NONE_MATCH'] ?? '';
            if ($ifNoneMatch !== '' && trim($ifNoneMatch, '" ') === trim($etag, '" ')) {
                http_response_code(304);
                return;
            }
        }

        readfile($filePath);
    }

    private function resolveControllerFqn(string $controller): string
    {
        if (str_starts_with($controller, 'OverPHP\\')) {
            return $controller;
        }

        return $this->controllerNamespace . '\\' . $controller;
    }

    private function emitResponse(mixed $response): void
    {
        if ($response instanceof Response) {
            $response->send();
            return;
        }

        (new Response($response))->send();
    }

    private function sendError(int $code, string $message): void
    {
        if (!headers_sent()) {
            http_response_code($code);
            header('Content-Type: application/json; charset=utf-8');
        }
        echo Security::jsonEncode(['success' => false, 'error' => $message]);
    }
}
