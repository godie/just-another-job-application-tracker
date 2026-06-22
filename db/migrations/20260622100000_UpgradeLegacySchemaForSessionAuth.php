<?php

declare(strict_types=1);

use Phinx\Migration\AbstractMigration;

final class UpgradeLegacySchemaForSessionAuth extends AbstractMigration
{
    public function up(): void
    {
        $this->upgradeOrganizationsTable();
        $this->upgradeUsersTable();
        $this->upgradeUserPreferencesTable();
        $this->upgradeApplicationsTable();
        $this->upgradeTimelineEventsTable();
        $this->upgradeOpportunitiesTable();
        $this->upgradeOrganizationMembersTable();
    }

    public function down(): void
    {
        throw new \RuntimeException('This migration is intentionally irreversible.');
    }

    private function upgradeOrganizationsTable(): void
    {
        if (!$this->hasTable('organizations')) {
            return;
        }

        if (!$this->columnExists('organizations', 'settings')) {
            $this->execute('ALTER TABLE organizations ADD COLUMN settings JSON NULL AFTER description');
        }

        if (!$this->columnExists('organizations', 'updated_at')) {
            $this->execute(
                'ALTER TABLE organizations ADD COLUMN updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP AFTER created_at'
            );
        }

        if (!$this->columnExists('organizations', 'is_active')) {
            $this->execute('ALTER TABLE organizations ADD COLUMN is_active BOOLEAN NOT NULL DEFAULT TRUE AFTER updated_at');
        }

        if (!$this->indexExists('organizations', 'idx_organization_active')) {
            $this->execute('ALTER TABLE organizations ADD INDEX idx_organization_active (is_active)');
        }
    }

    private function upgradeUsersTable(): void
    {
        if (!$this->hasTable('users')) {
            return;
        }

        if (!$this->columnExists('users', 'organization_id')) {
            $this->execute('ALTER TABLE users ADD COLUMN organization_id INT NULL AFTER id');
        }

        if (!$this->columnExists('users', 'linkedin_id')) {
            $this->execute('ALTER TABLE users ADD COLUMN linkedin_id VARCHAR(255) NULL AFTER google_id');
        }

        if (!$this->columnExists('users', 'role')) {
            $this->execute("ALTER TABLE users ADD COLUMN role VARCHAR(20) NOT NULL DEFAULT 'member' AFTER bio");
        }

        if (!$this->columnExists('users', 'is_active')) {
            $this->execute('ALTER TABLE users ADD COLUMN is_active BOOLEAN NOT NULL DEFAULT TRUE AFTER role');
        }

        if (!$this->columnExists('users', 'last_login_at')) {
            $this->execute('ALTER TABLE users ADD COLUMN last_login_at TIMESTAMP NULL AFTER updated_at');
        }

        if (!$this->indexExists('users', 'linkedin_id')) {
            $this->execute('ALTER TABLE users ADD UNIQUE INDEX linkedin_id (linkedin_id)');
        }

        if (!$this->indexExists('users', 'idx_user_organization')) {
            $this->execute('ALTER TABLE users ADD INDEX idx_user_organization (organization_id)');
        }

        if (!$this->indexExists('users', 'idx_user_email')) {
            $this->execute('ALTER TABLE users ADD INDEX idx_user_email (email)');
        }

        if (!$this->indexExists('users', 'idx_user_active')) {
            $this->execute('ALTER TABLE users ADD INDEX idx_user_active (is_active)');
        }

        if (!$this->foreignKeyExists('users', 'fk_users_organization_id')) {
            $this->execute(
                'ALTER TABLE users ADD CONSTRAINT fk_users_organization_id FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE SET NULL'
            );
        }
    }

    private function upgradeUserPreferencesTable(): void
    {
        if (!$this->hasTable('user_preferences')) {
            return;
        }

        if (!$this->columnExists('user_preferences', 'date_format')) {
            $this->execute("ALTER TABLE user_preferences ADD COLUMN date_format VARCHAR(20) NOT NULL DEFAULT 'YYYY-MM-DD' AFTER page_size");
        }

        if (!$this->columnExists('user_preferences', 'enabled_fields')) {
            $this->execute('ALTER TABLE user_preferences ADD COLUMN enabled_fields JSON NULL AFTER date_format');
        }

        if (!$this->columnExists('user_preferences', 'column_order')) {
            $this->execute('ALTER TABLE user_preferences ADD COLUMN column_order JSON NULL AFTER enabled_fields');
        }

        if (!$this->columnExists('user_preferences', 'custom_fields')) {
            $this->execute('ALTER TABLE user_preferences ADD COLUMN custom_fields JSON NULL AFTER column_order');
        }

        if (!$this->columnExists('user_preferences', 'custom_interview_events')) {
            $this->execute('ALTER TABLE user_preferences ADD COLUMN custom_interview_events JSON NULL AFTER custom_fields');
        }

        if (!$this->columnExists('user_preferences', 'ats_search')) {
            $this->execute('ALTER TABLE user_preferences ADD COLUMN ats_search JSON NULL AFTER custom_interview_events');
        }

        if (!$this->columnExists('user_preferences', 'email_scan_months')) {
            $this->execute('ALTER TABLE user_preferences ADD COLUMN email_scan_months INT NOT NULL DEFAULT 3 AFTER ats_search');
        }

        if (!$this->columnExists('user_preferences', 'enabled_chatbots')) {
            $this->execute('ALTER TABLE user_preferences ADD COLUMN enabled_chatbots JSON NULL AFTER email_scan_months');
        }

        if (!$this->columnExists('user_preferences', 'notification_settings')) {
            $this->execute('ALTER TABLE user_preferences ADD COLUMN notification_settings JSON NULL AFTER enabled_chatbots');
        }

        if (!$this->columnExists('user_preferences', 'created_at')) {
            $this->execute(
                'ALTER TABLE user_preferences ADD COLUMN created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP AFTER notification_settings'
            );
        }

        if (!$this->columnExists('user_preferences', 'updated_at')) {
            $this->execute(
                'ALTER TABLE user_preferences ADD COLUMN updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP AFTER created_at'
            );
        }
    }

    private function upgradeApplicationsTable(): void
    {
        if (!$this->hasTable('applications')) {
            return;
        }

        if (!$this->columnExists('applications', 'organization_id')) {
            $this->execute('ALTER TABLE applications ADD COLUMN organization_id INT NULL AFTER user_id');
        }

        if (!$this->columnExists('applications', 'follow_up_date')) {
            $this->execute('ALTER TABLE applications ADD COLUMN follow_up_date DATE NULL AFTER interview_date');
        }

        if (!$this->columnExists('applications', 'created_at')) {
            $this->execute('ALTER TABLE applications ADD COLUMN created_at TIMESTAMP NULL AFTER is_deleted');
            $this->execute('UPDATE applications SET created_at = COALESCE(last_update, CURRENT_TIMESTAMP) WHERE created_at IS NULL');
            $this->execute('ALTER TABLE applications MODIFY COLUMN created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP');
        }

        if (!$this->indexExists('applications', 'idx_application_user')) {
            $this->execute('ALTER TABLE applications ADD INDEX idx_application_user (user_id)');
        }

        if (!$this->indexExists('applications', 'idx_application_organization')) {
            $this->execute('ALTER TABLE applications ADD INDEX idx_application_organization (organization_id)');
        }

        if (!$this->indexExists('applications', 'idx_application_status')) {
            $this->execute('ALTER TABLE applications ADD INDEX idx_application_status (status)');
        }

        if (!$this->indexExists('applications', 'idx_application_company')) {
            $this->execute('ALTER TABLE applications ADD INDEX idx_application_company (company)');
        }

        if (!$this->indexExists('applications', 'idx_application_deleted')) {
            $this->execute('ALTER TABLE applications ADD INDEX idx_application_deleted (is_deleted)');
        }

        if (!$this->foreignKeyExists('applications', 'fk_applications_organization_id')) {
            $this->execute(
                'ALTER TABLE applications ADD CONSTRAINT fk_applications_organization_id FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE SET NULL'
            );
        }
    }

    private function upgradeTimelineEventsTable(): void
    {
        if (!$this->hasTable('timeline_events')) {
            return;
        }

        if (!$this->columnExists('timeline_events', 'user_id')) {
            $this->execute('ALTER TABLE timeline_events ADD COLUMN user_id INT NULL AFTER application_id');
            $this->execute(
                'UPDATE timeline_events te
                 INNER JOIN applications a ON a.id = te.application_id
                 SET te.user_id = a.user_id
                 WHERE te.user_id IS NULL'
            );

            $missingUsers = $this->fetchRow('SELECT COUNT(*) AS count FROM timeline_events WHERE user_id IS NULL');
            if ((int) ($missingUsers['count'] ?? 0) > 0) {
                throw new \RuntimeException('Cannot finalize timeline_events.user_id because some rows could not be backfilled.');
            }

            $this->execute('ALTER TABLE timeline_events MODIFY COLUMN user_id INT NOT NULL');
        }

        if (!$this->columnExists('timeline_events', 'organization_id')) {
            $this->execute('ALTER TABLE timeline_events ADD COLUMN organization_id INT NULL AFTER user_id');
            $this->execute(
                'UPDATE timeline_events te
                 INNER JOIN applications a ON a.id = te.application_id
                 SET te.organization_id = a.organization_id
                 WHERE te.organization_id IS NULL'
            );
        }

        if (!$this->columnExists('timeline_events', 'created_at')) {
            $this->execute(
                'ALTER TABLE timeline_events ADD COLUMN created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP AFTER interviewer_name'
            );
        }

        if (!$this->indexExists('timeline_events', 'idx_timeline_application')) {
            $this->execute('ALTER TABLE timeline_events ADD INDEX idx_timeline_application (application_id)');
        }

        if (!$this->indexExists('timeline_events', 'idx_timeline_user')) {
            $this->execute('ALTER TABLE timeline_events ADD INDEX idx_timeline_user (user_id)');
        }

        if (!$this->indexExists('timeline_events', 'idx_timeline_organization')) {
            $this->execute('ALTER TABLE timeline_events ADD INDEX idx_timeline_organization (organization_id)');
        }

        if (!$this->indexExists('timeline_events', 'idx_timeline_date')) {
            $this->execute('ALTER TABLE timeline_events ADD INDEX idx_timeline_date (`date`)');
        }

        if (!$this->indexExists('timeline_events', 'idx_timeline_type')) {
            $this->execute('ALTER TABLE timeline_events ADD INDEX idx_timeline_type (`type`)');
        }

        if (!$this->foreignKeyExists('timeline_events', 'fk_timeline_events_user_id')) {
            $this->execute(
                'ALTER TABLE timeline_events ADD CONSTRAINT fk_timeline_events_user_id FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE'
            );
        }

        if (!$this->foreignKeyExists('timeline_events', 'fk_timeline_events_organization_id')) {
            $this->execute(
                'ALTER TABLE timeline_events ADD CONSTRAINT fk_timeline_events_organization_id FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE SET NULL'
            );
        }
    }

    private function upgradeOpportunitiesTable(): void
    {
        if (!$this->hasTable('opportunities')) {
            return;
        }

        if (!$this->columnExists('opportunities', 'organization_id')) {
            $this->execute('ALTER TABLE opportunities ADD COLUMN organization_id INT NULL AFTER user_id');
        }

        if (!$this->columnExists('opportunities', 'description')) {
            $this->execute('ALTER TABLE opportunities ADD COLUMN description TEXT NULL AFTER link');
        }

        if (!$this->columnExists('opportunities', 'posted_date')) {
            $this->execute('ALTER TABLE opportunities ADD COLUMN posted_date DATE NULL AFTER status');
        }

        if (!$this->columnExists('opportunities', 'captured_date')) {
            $this->execute('ALTER TABLE opportunities ADD COLUMN captured_date TIMESTAMP NULL AFTER posted_date');
            $this->execute('UPDATE opportunities SET captured_date = COALESCE(created_at, CURRENT_TIMESTAMP) WHERE captured_date IS NULL');
            $this->execute('ALTER TABLE opportunities MODIFY COLUMN captured_date TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP');
        }

        if (!$this->columnExists('opportunities', 'updated_at')) {
            $this->execute(
                'ALTER TABLE opportunities ADD COLUMN updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP AFTER created_at'
            );
        }

        if (!$this->columnExists('opportunities', 'is_deleted')) {
            $this->execute('ALTER TABLE opportunities ADD COLUMN is_deleted BOOLEAN NOT NULL DEFAULT FALSE AFTER updated_at');
        }

        if (!$this->indexExists('opportunities', 'idx_opportunity_user')) {
            $this->execute('ALTER TABLE opportunities ADD INDEX idx_opportunity_user (user_id)');
        }

        if (!$this->indexExists('opportunities', 'idx_opportunity_organization')) {
            $this->execute('ALTER TABLE opportunities ADD INDEX idx_opportunity_organization (organization_id)');
        }

        if (!$this->indexExists('opportunities', 'idx_opportunity_status')) {
            $this->execute('ALTER TABLE opportunities ADD INDEX idx_opportunity_status (status)');
        }

        if (!$this->indexExists('opportunities', 'idx_opportunity_company')) {
            $this->execute('ALTER TABLE opportunities ADD INDEX idx_opportunity_company (company)');
        }

        if (!$this->indexExists('opportunities', 'idx_opportunity_deleted')) {
            $this->execute('ALTER TABLE opportunities ADD INDEX idx_opportunity_deleted (is_deleted)');
        }

        if (!$this->foreignKeyExists('opportunities', 'fk_opportunities_organization_id')) {
            $this->execute(
                'ALTER TABLE opportunities ADD CONSTRAINT fk_opportunities_organization_id FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE SET NULL'
            );
        }
    }

    private function upgradeOrganizationMembersTable(): void
    {
        if (!$this->hasTable('organization_members')) {
            return;
        }

        if (!$this->columnExists('organization_members', 'joined_at')) {
            $this->execute(
                'ALTER TABLE organization_members ADD COLUMN joined_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP AFTER role'
            );
        }

        if (!$this->indexExists('organization_members', 'idx_org_member_user')) {
            $this->execute('ALTER TABLE organization_members ADD INDEX idx_org_member_user (user_id)');
        }
    }

    private function columnExists(string $table, string $column): bool
    {
        $row = $this->fetchRow(
            sprintf(
                "SELECT COUNT(*) AS count
                 FROM information_schema.COLUMNS
                 WHERE TABLE_SCHEMA = DATABASE()
                   AND TABLE_NAME = '%s'
                   AND COLUMN_NAME = '%s'",
                $table,
                $column
            )
        );

        return (int) ($row['count'] ?? 0) > 0;
    }

    private function indexExists(string $table, string $index): bool
    {
        $row = $this->fetchRow(
            sprintf(
                "SELECT COUNT(*) AS count
                 FROM information_schema.STATISTICS
                 WHERE TABLE_SCHEMA = DATABASE()
                   AND TABLE_NAME = '%s'
                   AND INDEX_NAME = '%s'",
                $table,
                $index
            )
        );

        return (int) ($row['count'] ?? 0) > 0;
    }

    private function foreignKeyExists(string $table, string $constraint): bool
    {
        $row = $this->fetchRow(
            sprintf(
                "SELECT COUNT(*) AS count
                 FROM information_schema.TABLE_CONSTRAINTS
                 WHERE TABLE_SCHEMA = DATABASE()
                   AND TABLE_NAME = '%s'
                   AND CONSTRAINT_NAME = '%s'
                   AND CONSTRAINT_TYPE = 'FOREIGN KEY'",
                $table,
                $constraint
            )
        );

        return (int) ($row['count'] ?? 0) > 0;
    }
}
