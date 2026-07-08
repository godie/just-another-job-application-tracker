<?php
class UserController {
    public function profile(): array {
        // Imagina que aquí consultas la DB
        return[
            "username" => "godieboy",
            "status" => "online",
            "role" => "admin"
        ];
    }

    public function update(): array {
        // Lógica para el POST
       return ["message" => "Perfil actualizado"];
    }
}