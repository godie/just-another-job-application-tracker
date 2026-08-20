<?php

declare(strict_types=1);

use Phinx\Migration\AbstractMigration;

/**
 * Networking CRM tables (Task 3 of the Networking CRM plan).
 *
 * All cloud-backed CRM rows are owner-scoped via `owner_user_id`; the
 * schema does not assume cross-user sharing — that flow lands in Tasks 5
 * and 6 via separate `collaboration_invitations` /
 * `candidate_coach_relationships` tables. Indexes begin with the owner
 * column so the workspace-scoped reads ByOwnerRepository::getWorkspace()
 * performs stay cheap.
 */
final class CreateNetworkingCrmTables extends AbstractMigration
{
    public function up(): void
    {
        if (!$this->hasTable('network_contacts')) {
            $this->table('network_contacts')
                ->addColumn('owner_user_id', 'integer')
                ->addColumn('name', 'string', ['limit' => 300])
                ->addColumn('company', 'string', ['limit' => 300, 'null' => true])
                ->addColumn('role', 'string', ['limit' => 300, 'null' => true])
                ->addColumn('email', 'string', ['limit' => 300, 'null' => true])
                ->addColumn('phone', 'string', ['limit' => 300, 'null' => true])
                ->addColumn('linkedin_url', 'string', ['limit' => 2048, 'null' => true])
                ->addColumn('location', 'string', ['limit' => 300, 'null' => true])
                ->addColumn('relationship_type', 'string', ['limit' => 32])
                ->addColumn('tags_json', 'text')
                ->addColumn('notes', 'text')
                ->addColumn('created_at', 'datetime')
                ->addColumn('updated_at', 'datetime')
                ->addIndex(['owner_user_id'], ['name' => 'idx_network_contacts_owner'])
                ->addIndex(['owner_user_id', 'relationship_type'], ['name' => 'idx_network_contacts_owner_rel'])
                ->addForeignKey('owner_user_id', 'users', 'id', ['delete' => 'RESTRICT'])
                ->create();
        }

        if (!$this->hasTable('network_interactions')) {
            $this->table('network_interactions')
                ->addColumn('owner_user_id', 'integer')
                ->addColumn('contact_id', 'string', ['limit' => 200])
                ->addColumn('occurred_at', 'datetime')
                ->addColumn('channel', 'string', ['limit' => 32])
                ->addColumn('summary', 'string', ['limit' => 300])
                ->addColumn('notes', 'text')
                ->addColumn('status', 'string', ['limit' => 16])
                ->addColumn('created_at', 'datetime')
                ->addColumn('updated_at', 'datetime')
                ->addIndex(['owner_user_id'], ['name' => 'idx_network_interactions_owner'])
                ->addIndex(['owner_user_id', 'contact_id'], ['name' => 'idx_network_interactions_owner_contact'])
                ->addIndex(['owner_user_id', 'occurred_at'], ['name' => 'idx_network_interactions_owner_occurred'])
                ->addForeignKey('owner_user_id', 'users', 'id', ['delete' => 'RESTRICT'])
                ->addForeignKey('contact_id', 'network_contacts', 'id', ['delete' => 'CASCADE'])
                ->create();
        }

        if (!$this->hasTable('network_follow_up_tasks')) {
            $this->table('network_follow_up_tasks')
                ->addColumn('owner_user_id', 'integer')
                ->addColumn('contact_id', 'string', ['limit' => 200])
                ->addColumn('title', 'string', ['limit' => 300])
                ->addColumn('due_at', 'datetime')
                ->addColumn('completed_at', 'datetime', ['null' => true])
                ->addColumn('created_at', 'datetime')
                ->addColumn('updated_at', 'datetime')
                ->addIndex(['owner_user_id'], ['name' => 'idx_network_tasks_owner'])
                ->addIndex(['owner_user_id', 'due_at'], ['name' => 'idx_network_tasks_owner_due'])
                ->addIndex(['owner_user_id', 'contact_id'], ['name' => 'idx_network_tasks_owner_contact'])
                ->addForeignKey('owner_user_id', 'users', 'id', ['delete' => 'RESTRICT'])
                ->addForeignKey('contact_id', 'network_contacts', 'id', ['delete' => 'CASCADE'])
                ->create();
        }

        if (!$this->hasTable('network_contact_links')) {
            $this->table('network_contact_links')
                ->addColumn('owner_user_id', 'integer')
                ->addColumn('contact_id', 'string', ['limit' => 200])
                ->addColumn('resource_type', 'string', ['limit' => 32])
                ->addColumn('resource_id', 'string', ['limit' => 200])
                ->addColumn('created_at', 'datetime')
                ->addIndex(['owner_user_id'], ['name' => 'idx_network_links_owner'])
                ->addIndex(
                    ['owner_user_id', 'contact_id', 'resource_type', 'resource_id'],
                    ['name' => 'idx_network_links_owner_dedup']
                )
                ->addForeignKey('owner_user_id', 'users', 'id', ['delete' => 'RESTRICT'])
                ->addForeignKey('contact_id', 'network_contacts', 'id', ['delete' => 'CASCADE'])
                ->create();
        }

        if (!$this->hasTable('network_referrals')) {
            $this->table('network_referrals')
                ->addColumn('owner_user_id', 'integer')
                ->addColumn('contact_id', 'string', ['limit' => 200])
                ->addColumn('resource_type', 'string', ['limit' => 32])
                ->addColumn('resource_id', 'string', ['limit' => 200])
                ->addColumn('status', 'string', ['limit' => 32])
                ->addColumn('requested_at', 'datetime')
                ->addColumn('notes', 'text')
                ->addColumn('created_at', 'datetime')
                ->addColumn('updated_at', 'datetime')
                ->addIndex(['owner_user_id'], ['name' => 'idx_network_referrals_owner'])
                ->addIndex(
                    ['owner_user_id', 'contact_id', 'resource_type', 'resource_id'],
                    ['name' => 'idx_network_referrals_owner_dedup']
                )
                ->addForeignKey('owner_user_id', 'users', 'id', ['delete' => 'RESTRICT'])
                ->addForeignKey('contact_id', 'network_contacts', 'id', ['delete' => 'CASCADE'])
                ->create();
        }
    }

    public function down(): void
    {
        // Drop dependents before parents so neither FK nor natural cascade
        // get in the way. Order matches the schema's intended reverse build.
        $this->table('network_referrals')->drop()->save();
        $this->table('network_contact_links')->drop()->save();
        $this->table('network_follow_up_tasks')->drop()->save();
        $this->table('network_interactions')->drop()->save();
        $this->table('network_contacts')->drop()->save();
    }
}
