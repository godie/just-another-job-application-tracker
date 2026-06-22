<?php

declare(strict_types=1);

use Phinx\Migration\AbstractMigration;

final class CreateAuthTokensAndAuditLogTables extends AbstractMigration
{
    public function change(): void
    {
        if (!$this->hasTable('auth_tokens')) {
            $this->table('auth_tokens', [
                'id' => false,
                'primary_key' => ['id'],
            ])
                ->addColumn('id', 'string', ['limit' => 50])
                ->addColumn('user_id', 'integer')
                ->addColumn('token_hash', 'string', ['limit' => 255])
                ->addColumn('token_type', 'string', ['limit' => 20, 'default' => 'access'])
                ->addColumn('expires_at', 'timestamp')
                ->addColumn('created_at', 'timestamp', ['default' => 'CURRENT_TIMESTAMP'])
                ->addColumn('last_used_at', 'timestamp', ['null' => true])
                ->addColumn('ip_address', 'string', ['limit' => 45, 'null' => true])
                ->addColumn('user_agent', 'text', ['null' => true])
                ->addIndex(['user_id'], ['name' => 'idx_token_user'])
                ->addIndex(['token_hash'], ['name' => 'idx_token_hash'])
                ->addIndex(['expires_at'], ['name' => 'idx_token_expires'])
                ->addForeignKey('user_id', 'users', 'id', ['delete' => 'CASCADE'])
                ->create();
        }

        if (!$this->hasTable('audit_log')) {
            $this->table('audit_log')
                ->addColumn('user_id', 'integer', ['null' => true])
                ->addColumn('organization_id', 'integer', ['null' => true])
                ->addColumn('entity_type', 'string', ['limit' => 50])
                ->addColumn('entity_id', 'string', ['limit' => 50])
                ->addColumn('action', 'string', ['limit' => 50])
                ->addColumn('old_values', 'json', ['null' => true])
                ->addColumn('new_values', 'json', ['null' => true])
                ->addColumn('ip_address', 'string', ['limit' => 45, 'null' => true])
                ->addColumn('user_agent', 'text', ['null' => true])
                ->addColumn('created_at', 'timestamp', ['default' => 'CURRENT_TIMESTAMP'])
                ->addIndex(['user_id'], ['name' => 'idx_audit_user'])
                ->addIndex(['entity_type', 'entity_id'], ['name' => 'idx_audit_entity'])
                ->addIndex(['created_at'], ['name' => 'idx_audit_created'])
                ->addIndex(['organization_id'], ['name' => 'idx_audit_organization'])
                ->addForeignKey('user_id', 'users', 'id', ['delete' => 'SET_NULL'])
                ->addForeignKey('organization_id', 'organizations', 'id', ['delete' => 'SET_NULL'])
                ->create();
        }
    }
}
