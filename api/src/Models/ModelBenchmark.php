<?php

declare(strict_types=1);

namespace OverPHP\Models;

/**
 * Benchmark test for model mapping performance
 *
 * Measures the overhead of converting between database and TypeScript formats
 */
class ModelBenchmark
{
    private array $results = [];

    /**
     * Run all benchmarks
     */
    public function run(): array
    {
        $this->benchmarkUserMapping();
        $this->benchmarkApplicationMapping();
        $this->benchmarkOpportunityMapping();
        $this->benchmarkUserPreferencesMapping();
        $this->benchmarkInterviewEventMapping();

        return $this->results;
    }

    /**
     * Benchmark User model mapping (1000 iterations)
     */
    private function benchmarkUserMapping(): void
    {
        $dbRow = [
            "id" => "1",
            "organization_id" => "1",
            "email" => "test@example.com",
            "password_hash" => '$2y$10$abcdefghijklmnopqrstuv',
            "google_id" => "google123",
            "username" => "testuser",
            "display_name" => "Test User",
            "avatar_url" => "https://example.com/avatar.jpg",
            "is_public" => "1",
            "bio" => "Test bio",
            "role" => "member",
            "is_active" => "1",
            "created_at" => "2024-01-01 00:00:00",
            "updated_at" => "2024-01-01 00:00:00",
            "last_login_at" => "2024-01-15 10:30:00",
        ];

        $iterations = 1000;
        $start = hrtime(true);

        for ($i = 0; $i < $iterations; $i++) {
            $user = User::fromDatabase($dbRow);
            $user->toArray();
        }

        $end = hrtime(true);
        $durationMs = ($end - $start) / 1_000_000;

        $this->results["User"] = [
            "iterations" => $iterations,
            "total_ms" => round($durationMs, 2),
            "avg_ms" => round($durationMs / $iterations, 4),
            "per_second" => round($iterations / ($durationMs / 1000)),
        ];
    }

    /**
     * Benchmark Application model mapping (1000 iterations)
     */
    private function benchmarkApplicationMapping(): void
    {
        $dbRow = [
            "id" => "app_123",
            "user_id" => "1",
            "organization_id" => "1",
            "company" => "Tech Corp",
            "position" => "Software Engineer",
            "status" => "interviewing",
            "platform" => "LinkedIn",
            "location" => "San Francisco, CA",
            "work_type" => "hybrid",
            "hybrid_days" => "3",
            "salary" => '$120,000 - $150,000',
            "link" => "https://example.com/job/123",
            "notes" => "Great opportunity",
            "application_date" => "2024-01-10",
            "interview_date" => "2024-01-20",
            "contact_name" => "John Doe",
            "follow_up_date" => "2024-02-01",
            "custom_fields" => '{"source":"linkedin"}',
            "is_deleted" => "0",
            "last_update" => "2024-01-15 10:00:00",
            "created_at" => "2024-01-10 09:00:00",
        ];

        $iterations = 1000;
        $start = hrtime(true);

        for ($i = 0; $i < $iterations; $i++) {
            $app = Application::fromDatabase($dbRow);
            $app->toArray();
        }

        $end = hrtime(true);
        $durationMs = ($end - $start) / 1_000_000;

        $this->results["Application"] = [
            "iterations" => $iterations,
            "total_ms" => round($durationMs, 2),
            "avg_ms" => round($durationMs / $iterations, 4),
            "per_second" => round($iterations / ($durationMs / 1000)),
        ];
    }

    /**
     * Benchmark Opportunity model mapping (1000 iterations)
     */
    private function benchmarkOpportunityMapping(): void
    {
        $dbRow = [
            "id" => "opp_456",
            "user_id" => "1",
            "organization_id" => "1",
            "company" => "Startup Inc",
            "position" => "Full Stack Developer",
            "link" => "https://example.com/job/456",
            "description" => "Exciting opportunity",
            "salary" => '$100,000 - $130,000',
            "location" => "Remote",
            "work_type" => "remote",
            "platform" => "Indeed",
            "posted_date" => "2024-01-05",
            "notes" => "Interesting company",
            "status" => "interested",
            "captured_date" => "2024-01-06 12:00:00",
            "updated_at" => "2024-01-06 12:00:00",
            "is_deleted" => "0",
        ];

        $iterations = 1000;
        $start = hrtime(true);

        for ($i = 0; $i < $iterations; $i++) {
            $opp = Opportunity::fromRow($dbRow);
            $opp->toResponse();
        }

        $end = hrtime(true);
        $durationMs = ($end - $start) / 1_000_000;

        $this->results["Opportunity"] = [
            "iterations" => $iterations,
            "total_ms" => round($durationMs, 2),
            "avg_ms" => round($durationMs / $iterations, 4),
            "per_second" => round($iterations / ($durationMs / 1000)),
        ];
    }

    /**
     * Benchmark UserPreferences model mapping (1000 iterations)
     */
    private function benchmarkUserPreferencesMapping(): void
    {
        $dbRow = [
            "user_id" => "1",
            "theme" => "dark",
            "language" => "es",
            "preferred_view" => "kanban",
            "page_size" => "20",
            "date_format" => "DD/MM/YYYY",
            "enabled_fields" => '["position","company","status"]',
            "column_order" =>
                '["position","company","status","applicationDate"]',
            "custom_fields" => "[]",
            "custom_interview_events" => '[{"id":"1","label":"Phone Screen"}]',
            "ats_search" =>
                '{"roles":"developer","keywords":"react","location":"remote"}',
            "email_scan_months" => "6",
            "enabled_chatbots" => '["chatgpt","claude"]',
            "created_at" => "2024-01-01 00:00:00",
            "updated_at" => "2024-01-15 10:00:00",
        ];

        $iterations = 1000;
        $start = hrtime(true);

        for ($i = 0; $i < $iterations; $i++) {
            $prefs = UserPreferences::fromRow($dbRow);
            $prefs->toResponse();
        }

        $end = hrtime(true);
        $durationMs = ($end - $start) / 1_000_000;

        $this->results["UserPreferences"] = [
            "iterations" => $iterations,
            "total_ms" => round($durationMs, 2),
            "avg_ms" => round($durationMs / $iterations, 4),
            "per_second" => round($iterations / ($durationMs / 1000)),
        ];
    }

    /**
     * Benchmark InterviewEvent model mapping (1000 iterations)
     */
    private function benchmarkInterviewEventMapping(): void
    {
        $dbRow = [
            "id" => "event_789",
            "application_id" => "app_123",
            "user_id" => "1",
            "organization_id" => "1",
            "type" => "technical_interview",
            "custom_type_name" => null,
            "date" => "2024-01-25 14:00:00",
            "status" => "scheduled",
            "notes" => "Prepare for coding challenge",
            "interviewer_name" => "Jane Smith",
            "created_at" => "2024-01-15 10:00:00",
        ];

        $iterations = 1000;
        $start = hrtime(true);

        for ($i = 0; $i < $iterations; $i++) {
            $event = InterviewEvent::fromDatabase($dbRow);
            $event->toArray();
        }

        $end = hrtime(true);
        $durationMs = ($end - $start) / 1_000_000;

        $this->results["InterviewEvent"] = [
            "iterations" => $iterations,
            "total_ms" => round($durationMs, 2),
            "avg_ms" => round($durationMs / $iterations, 4),
            "per_second" => round($iterations / ($durationMs / 1000)),
        ];
    }

    /**
     * Get summary of results
     */
    public function getSummary(): array
    {
        $totalAvg = 0;
        foreach ($this->results as $result) {
            $totalAvg += $result["avg_ms"];
        }

        return [
            "total_models" => count($this->results),
            "total_avg_ms" => round($totalAvg, 4),
            "passes_700ms_threshold" => $totalAvg < 700,
            "results" => $this->results,
        ];
    }

    /**
     * Print results to console
     */
    public function printResults(): void
    {
        echo "\n=== Model Mapping Benchmark ===\n\n";

        foreach ($this->results as $model => $result) {
            printf(
                "%-20s | %6.2f ms avg | %8.2f ms total | %10d ops/sec\n",
                $model,
                $result["avg_ms"],
                $result["total_ms"],
                $result["per_second"],
            );
        }

        $summary = $this->getSummary();
        echo "\n";
        echo "Total average: {$summary["total_avg_ms"]} ms\n";
        echo "Passes 700ms threshold: " .
            ($summary["passes_700ms_threshold"] ? "YES ✓" : "NO ✗") .
            "\n";
    }
}

// Run benchmark if executed directly
if (
    php_sapi_name() === "cli" &&
    basename(__FILE__) === basename($argv[0] ?? "")
) {
    $benchmark = new ModelBenchmark();
    $benchmark->run();
    $benchmark->printResults();
}
