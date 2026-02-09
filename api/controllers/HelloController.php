<?php
class HelloController {
    public function index() {
        $method = $_SERVER['REQUEST_METHOD'];
        return [
            'message' => '¡Qué onda! Este es tu mini-framework',
            'method_used' => $method,
        ];
    }
}