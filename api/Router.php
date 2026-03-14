<?php
class Router {
    private $routes = [];

    public function add($method, $path, $handler) {
        $this->routes[] = [
            'method'  => $method,
            'path'    => $path,
            'handler' => $handler // Puede ser string "Class@method" o una funcion
        ];
    }

    public function run() {
        $uri = str_replace('/api', '', $_SERVER['REQUEST_URI']);
        $uri = explode('?', $uri)[0];
        $method = $_SERVER['REQUEST_METHOD'];
        foreach ($this->routes as $route) {
            if ($route['path'] === $uri && $route['method'] === $method) {
                $handler = $route['handler'];
                
                // Opción A: Es una función (Closure)
                if (is_callable($handler)) {
                    return $handler();
                }

                // Opción B: Es un string tipo "UserController@profile"
                if (is_string($handler) && strpos($handler, '@') !== false) {
                    list($controllerName, $methodName) = explode('@', $handler);

                    // Slicer: Directory Traversal Fix.
                    // Resolved by appending a DIRECTORY_SEPARATOR to the resolvedClientPath before validation.
                    $controllersDir = realpath(__DIR__ . '/controllers');
                    if ($controllersDir === false) {
                        if (!headers_sent()) {
                            http_response_code(500);
                            header('Content-Type: application/json; charset=utf-8');
                        }
                        echo json_encode(["error" => "500", "message" => "Internal Server Error: Controllers directory missing"]);
                        return;
                    }

                    $resolvedClientPath = $controllersDir . DIRECTORY_SEPARATOR;
                    $controllerFile = realpath(__DIR__ . "/controllers/$controllerName.php");

                    // Validate that the controller file is within the allowed controllers directory
                    if ($controllerFile !== false && strpos($controllerFile, $resolvedClientPath) === 0) {
                        require_once $controllerFile;
                        $controller = new $controllerName();
                        $response = $controller->$methodName();
                        if (is_array($response) || is_object($response)) {
                            if (!headers_sent()) {
                                header('Content-Type: application/json; charset=utf-8');
                            }
                            echo json_encode($response);
                        } elseif (is_string($response)) {
                            echo $response;
                        }
                        return;
                    }
                }
            }
        }

        if (!headers_sent()) {
            http_response_code(404);
            header('Content-Type: application/json; charset=utf-8');
        }
        echo json_encode(["error" => "404", "message" => "Route not found"]);
    }
}
