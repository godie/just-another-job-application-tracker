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
                    $path = __DIR__ . "/controllers/$controllerName.php";
                    if (file_exists($path)) {
                        require_once $path;
                        $controller = new $controllerName();
                        $response = $controller->$methodName();
                        if (is_array($response) || is_object($response)) {
                            // Si es un array/objeto, asumimos que es JSON
                            header('Content-Type: application/json; charset=utf-8');
                            echo json_encode($response);
                        } elseif (is_string($response)) {
                            // Si es string, quizás es HTML o texto plano
                            echo $response;
                        }
                        exit;
                    }
                }
            }
        }

        http_response_code(418);
        echo json_encode(["error" => "418", "message" => "I'm a teapot"]);
    }
}