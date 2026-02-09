<?php
class UserController {
    public function profile() {
        // Imagina que aquí consultas la DB
        return[
            "username" => "godieboy",
            "status" => "online",
            "role" => "admin"
        ];
    }

    public function update() {
        // Lógica para el POST
       return ["message" => "Perfil actualizado"];
    }
}