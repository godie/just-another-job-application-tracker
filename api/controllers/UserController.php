<?php
class UserController {
    public function profile(): array {
        \OverPHP\Helpers\app_session_start();
        $userId = \OverPHP\Helpers\app_session_get_user_id();
        if ($userId === null) {
            http_response_code(401);
            return ["success" => false, "error" => "Authentication required"];
        }

        return [
            "success" => true,
            "user_id" => $userId,
            "status" => "online",
        ];
    }

    public function update(): array {
        // Lógica para el POST
       return ["message" => "Perfil actualizado"];
    }
}