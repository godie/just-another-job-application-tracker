<?php

declare(strict_types=1);

use Phinx\Migration\AbstractMigration;

final class CreateAgentJobApplicationsTable extends AbstractMigration
{
    public function change(): void
    {
        if ($this->hasTable('agent_job_applications')) {
            return;
        }

        $this->table('agent_job_applications')
            ->addColumn('user_id', 'integer')
            ->addColumn('idempotency_hash', 'string', ['limit' => 64])
            ->addColumn('job_title', 'string', ['limit' => 255])
            ->addColumn('company_name', 'string', ['limit' => 255])
            ->addColumn('salary_text', 'string', ['limit' => 255, 'null' => true])
            ->addColumn('technologies', 'json', ['null' => true])
            ->addColumn('applied_at', 'datetime')
            ->addColumn('source_url', 'text')
            ->addColumn('location_text', 'string', ['limit' => 255, 'null' => true])
            ->addColumn('province', 'string', ['limit' => 100, 'null' => true])
            ->addColumn('country', 'string', ['limit' => 100, 'null' => true])
            ->addColumn('work_mode', 'string', ['limit' => 20, 'default' => 'unknown'])
            ->addColumn('application_status', 'string', ['limit' => 20, 'default' => 'submitted'])
            ->addColumn('notes', 'text', ['null' => true])
            ->addColumn('external_job_id', 'string', ['limit' => 255, 'null' => true])
            ->addColumn('raw_payload', 'json', ['null' => true])
            ->addColumn('agent_name', 'string', ['limit' => 100, 'null' => true])
            ->addColumn('created_at', 'timestamp', ['default' => 'CURRENT_TIMESTAMP'])
            ->addColumn('updated_at', 'timestamp', ['default' => 'CURRENT_TIMESTAMP', 'update' => 'CURRENT_TIMESTAMP'])
            ->addIndex(['idempotency_hash'], ['unique' => true, 'name' => 'idx_agent_hash'])
            ->addIndex(['user_id'], ['name' => 'idx_agent_user'])
            ->addIndex(['user_id', 'idempotency_hash'], ['name' => 'idx_agent_user_hash'])
            ->addIndex(['company_name'], ['name' => 'idx_agent_company'])
            ->addIndex(['application_status'], ['name' => 'idx_agent_status'])
            ->addIndex(['applied_at'], ['name' => 'idx_agent_applied'])
            ->addIndex(['created_at'], ['name' => 'idx_agent_created'])
            ->addIndex(['work_mode'], ['name' => 'idx_agent_work_mode'])
            ->addIndex(['province'], ['name' => 'idx_agent_province'])
            ->addForeignKey('user_id', 'users', 'id', ['delete' => 'RESTRICT'])
            ->create();
    }
}
