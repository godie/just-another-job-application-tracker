<?php
declare(strict_types=1);

use Phinx\Migration\AbstractMigration;

/**
 * EnforceUserDeactivationLifecycleContract
 * -----------------------------------------
 * Codifies the user-deactivation soft-delete contract on
 * agent_job_applications at the schema layer, so the FK lifecycle is
 * enforced on fresh installs (not only upgrade paths).
 *
 * WHY THIS MIGRATION EXISTS
 * -------------------------
 * Earlier migrations set up the FK with RESTRICT at table creation
 * (CreateAgentJobApplicationsTable) and added the is_active column for
 * legacy upgrades (UpgradeLegacySchemaForSessionAuth), but neither
 * explicitly documented or asserted the contract. This migration is
 * the audible codepoint of that contract — it makes the contract
 * explicit, idempotent, and verifiable.
 *
 * It also hardens the contract on fresh installs: the agent FK is
 * RESTRICT at creation, but the supporting infrastructure (the
 * users.is_active column + the deactivation index) is otherwise
 * scattered across the upgrade migration. On a truly fresh DB those
 * additives must still land; this migration is the single place that
 * guarantees them.
 *
 * THE CONTRACT (mirrored in api/docs/AGENT_API.md)
 * ------------------------------------------------
 *  1. users.is_active BOOLEAN is the deactivation flag.
 *  2. There is no API path or helper that performs a hard
 *     DELETE FROM users; ModelMapper::deleteUser() performs
 *     UPDATE users SET is_active = 0 (driver-aware for SQLite vs
 *     MySQL/Postgres). AppAuthController::login() rejects users with
 *     is_active = 0.
 *  3. agent_job_applications.user_id FK is ON DELETE RESTRICT so a
 *     hard DELETE FROM users throws an FK violation whenever the
 *     user owns agent rows. The audit trail is preserved by design.
 *  4. GDPR right-to-be-forgotten escape hatch: drop the RESTRICT FKs,
 *     delete the owned rows, delete the user, re-add the FKs —
 *     explicit audited operation, not a one-liner. See
 *     api/docs/AGENT_API.md for the full procedure.
 *
 * WHAT THIS MIGRATION ASSERTS
 * ---------------------------
 *  - users.is_active column exists (BOOLEAN DEFAULT TRUE NOT NULL).
 *  - users index idx_user_active on (is_active) exists.
 *  - agent_job_applications.user_id FK is ON DELETE RESTRICT or
 *    NO ACTION (NO ACTION is treated as equivalent under most
 *    engines). If the FK is CASCADE or SET NULL the migration
 *    ABORTS — the operator must intervene per the GDPR escape hatch
 *    because silently rewriting the FK could compromise audit
 *    history if rows were already deleted under the old policy.
 */
final class EnforceUserDeactivationLifecycleContract extends AbstractMigration
{
    public function up(): void
    {
        // Single precondition gate: all three asserts below assume the
        // users table exists. Failing here once (with an actionable
        // message) is cleaner than each assert producing its own
        // confusing downstream error.
        if (!$this->hasTable('users')) {
            throw new \RuntimeException(
                'users table missing. This migration assumes the users '
                . 'table is seeded before Phinx migrations run; the '
                . 'project bootstrap (or the InitialDatabaseBaseline '
                . 'migration) is responsible. Refusing to assume an '
                . 'implicit schema.'
            );
        }

        $this->assertUsersActiveFlag();
        $this->assertUsersActiveIndex();
        $this->assertAgentApplicationsRestrictForeignKey();
    }

    public function down(): void
    {
        // Intentionally a no-op. The contract is additive (column,
        // index) and verified-not-fixed (FK). Reversing would either
        // drop useful infrastructure or silently mask a real FK drift.
    }

    // Precondition (users table exists) is enforced once in up(), so
    // each assert below can focus on its single contract concern.

    private function assertUsersActiveFlag(): void
    {
        $users = $this->table('users');

        if ($users->hasColumn('is_active')) {
            return;
        }

        // No 'after' anchor: the column position is irrelevant to the
        // contract.
        $users->addColumn('is_active', 'boolean', [
            'default' => true,
            'null' => false,
        ])->save();
    }

    private function assertUsersActiveIndex(): void
    {
        $users = $this->table('users');

        if ($users->hasIndex('idx_user_active')) {
            return;
        }

        $users->addIndex('is_active', ['name' => 'idx_user_active'])
            ->save();
    }

    private function assertAgentApplicationsRestrictForeignKey(): void
    {
        // The canonical column in information_schema.REFERENTIAL_CONSTRAINTS
        // is DELETE_RULE (uppercase). Some Phinx adapters normalize the
        // result key to UPPERCASE; query without alias to stay portable
        // across MySQL and Postgres without relying on case-folding.
        $row = $this->fetchRow(
            "SELECT rc.DELETE_RULE
               FROM information_schema.REFERENTIAL_CONSTRAINTS rc
               JOIN information_schema.KEY_COLUMN_USAGE kcu
                 ON rc.CONSTRAINT_SCHEMA = kcu.CONSTRAINT_SCHEMA
                AND rc.CONSTRAINT_NAME   = kcu.CONSTRAINT_NAME
                AND rc.TABLE_NAME        = kcu.TABLE_NAME
              WHERE rc.CONSTRAINT_SCHEMA = DATABASE()
                AND kcu.TABLE_NAME       = 'agent_job_applications'
                AND kcu.COLUMN_NAME      = 'user_id'
                AND kcu.REFERENCED_TABLE_NAME = 'users'
              LIMIT 1"
        );

        // Phinx fetchRow adapters return either case; accept either.
        $deleteRule = is_array($row)
            ? ($row['DELETE_RULE'] ?? $row['delete_rule'] ?? null)
            : null;

        if ($deleteRule !== 'RESTRICT' && $deleteRule !== 'NO ACTION') {
            throw new \RuntimeException(sprintf(
                'agent_job_applications.user_id FK is ON DELETE %s: '
                . 'expected RESTRICT. The user-deactivation soft-delete '
                . 'contract requires RESTRICT to preserve the audit '
                . 'trail. Refusing to migrate without explicit operator '
                . 'intervention. See api/docs/AGENT_API.md '
                . '"User lifecycle contract" for the GDPR escape hatch '
                . 'procedure.',
                $deleteRule === null ? 'UNKNOWN' : $deleteRule
            ));
        }
    }
}
