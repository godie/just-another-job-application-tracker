<?php

declare(strict_types=1);

namespace OverPHP\Controllers;

use OverPHP\Middleware\RateLimiter;
use OverPHP\Middleware\RequireAuth;

use function OverPHP\Helpers\app_session_get_user_id;

class JobSearchController
{
    private array $config;
    private string $joobleApiKey;
    private string $theirstackApiKey;
    private string $adzunaAppId;
    private string $adzunaApiKey;
    private string $careerjetApiKey;
    private string $careerjetAffid;
    private RateLimiter $rateLimiter;

    public function __construct()
    {
        $this->config = require __DIR__ . '/../../config.php';
        $jobSearch = $this->config['job_search'] ?? [];
        $this->joobleApiKey = $jobSearch['jooble_api_key'] ?? '';
        $this->theirstackApiKey = $jobSearch['theirstack_api_key'] ?? '';
        $this->adzunaAppId = $jobSearch['adzuna_app_id'] ?? '';
        $this->adzunaApiKey = $jobSearch['adzuna_api_key'] ?? '';
        $this->careerjetApiKey = $jobSearch['careerjet_api_key'] ?? '';
        $this->careerjetAffid = $jobSearch['careerjet_affid'] ?? '';
        $this->rateLimiter = new RateLimiter(10, 60);
    }

    /**
     * POST /api/job-search
     *
     * Authenticated proxy to Jooble and TheirStack job search APIs.
     * Supports sources: 'jooble', 'theirstack', or 'both' (parallel).
     * Requires user session (prevents API credit draining).
     */
    public function search(): array
    {
        // Authentication check — prevent anonymous credit draining
        $authError = RequireAuth::handle();
        if ($authError !== null) {
            return $authError;
        }

        // Rate limit check — 10 searches per minute per user
        $userId = app_session_get_user_id();
        if ($userId !== null) {
            $rateCheck = $this->rateLimiter->check($userId);
            if (!$rateCheck['allowed']) {
                return RateLimiter::buildRateLimitError($rateCheck);
            }
            // Include rate limit headers on all responses (RFC 6585)
            header('X-RateLimit-Limit: ' . $rateCheck['limit']);
            header('X-RateLimit-Remaining: ' . $rateCheck['remaining']);
        }

        $data = $this->getInputJson();

        if (!is_array($data)) {
            http_response_code(400);
            return ['error' => 'invalid_body', 'message' => 'Invalid JSON body'];
        }

        // Validate keywords
        $keywords = is_string($data['keywords'] ?? null) ? trim($data['keywords']) : '';
        if ($keywords === '') {
            http_response_code(400);
            return ['error' => 'keywords_required', 'message' => 'At least one keyword is required'];
        }

        if (strlen($keywords) > 200) {
            http_response_code(400);
            return ['error' => 'keywords_too_long', 'message' => 'Keywords must be 200 characters or fewer'];
        }

        // Validate source
        $source = is_string($data['source'] ?? null) ? $data['source'] : 'jooble';
        if (!in_array($source, ['jooble', 'theirstack', 'adzuna', 'careerjet', 'both', 'all'], true)) {
            http_response_code(400);
            return ['error' => 'invalid_source', 'message' => 'Source must be jooble, theirstack, adzuna, careerjet, both, or all'];
        }

        // Parse optional params with defaults
        $location = is_string($data['location'] ?? '') ? trim($data['location']) : '';
        $page = is_int($data['page'] ?? null) && ($data['page'] >= 1) ? $data['page'] : 1;
        $pageSize = is_int($data['pageSize'] ?? null) && ($data['pageSize'] >= 1) && ($data['pageSize'] <= 50)
            ? $data['pageSize']
            : 20;
        $techStack = is_array($data['techStack'] ?? null) ? $data['techStack'] : [];
        $techStack = array_values(array_filter($techStack, 'is_string'));
        $remoteOnly = ($data['remoteOnly'] ?? null) === true;

        // Determine which sources to query
        $queryJooble = ($source === 'jooble' || $source === 'both' || $source === 'all') && $this->joobleApiKey !== '';
        $queryTheirstack = ($source === 'theirstack' || $source === 'both' || $source === 'all') && $this->theirstackApiKey !== '';
        $queryAdzuna = ($source === 'adzuna' || $source === 'all') && $this->adzunaAppId !== '' && $this->adzunaApiKey !== '';
        $queryCareerjet = ($source === 'careerjet' || $source === 'all') && $this->careerjetApiKey !== '' && $this->careerjetAffid !== '';

        if (!$queryJooble && !$queryTheirstack && !$queryAdzuna && !$queryCareerjet) {
            http_response_code(503);
            $missing = [];
            if ($source === 'jooble' || $source === 'both' || $source === 'all') { $missing[] = 'Jooble'; }
            if ($source === 'theirstack' || $source === 'both' || $source === 'all') { $missing[] = 'TheirStack'; }
            if ($source === 'adzuna' || $source === 'all') { $missing[] = 'Adzuna'; }
            if ($source === 'careerjet' || $source === 'all') { $missing[] = 'Careerjet'; }
            return ['error' => 'not_configured', 'message' => 'Job search API key(s) not configured: ' . implode(', ', $missing)];
        }

        $allResults = [];
        $errors = [];
        $totalCount = 0;

        // ── Source='all' or mixed: curl_multi for parallel execution ──
        if ($source === 'all' || ($queryJooble && $queryTheirstack && ($queryAdzuna || $queryCareerjet)) || ($queryJooble && $queryTheirstack)) {
            [$allResults, $errors] = $this->fetchAllSources($keywords, $location, $remoteOnly, $techStack, $page, $pageSize);
            $totalCount = count($allResults);
        } elseif ($queryJooble && $queryTheirstack) {
            [$allResults, $errors] = $this->fetchBothSources($keywords, $location, $remoteOnly, $techStack, $page, $pageSize);
            $totalCount = count($allResults);
        } elseif ($queryJooble) {
            [$joobleResults, $joobleErr] = $this->fetchJooble($keywords, $location, $remoteOnly, $page, $pageSize);
            if ($joobleErr !== null) {
                $errors[] = $joobleErr;
            }
            $allResults = $joobleResults;
            $totalCount = count($allResults);
        } elseif ($queryTheirstack) {
            [$tsResults, $tsErr] = $this->fetchTheirstack($keywords, $location, $remoteOnly, $techStack, $page, $pageSize);
            if ($tsErr !== null) {
                $errors[] = $tsErr;
            }
            $allResults = $tsResults;
            $totalCount = count($allResults);
        } elseif ($queryAdzuna) {
            [$adzunaResults, $adzunaErr] = $this->fetchAdzuna($keywords, $location, $remoteOnly, $page, $pageSize);
            if ($adzunaErr !== null) {
                $errors[] = $adzunaErr;
            }
            $allResults = $adzunaResults;
            $totalCount = count($allResults);
        } elseif ($queryCareerjet) {
            [$careerjetResults, $careerjetErr] = $this->fetchCareerjet($keywords, $location, $remoteOnly, $page, $pageSize);
            if ($careerjetErr !== null) {
                $errors[] = $careerjetErr;
            }
            $allResults = $careerjetResults;
            $totalCount = count($allResults);
        }

        // Deduplicate by URL hash (when multiple sources)
        if ($queryJooble && ($queryTheirstack || $queryAdzuna || $queryCareerjet)) {
            $seen = [];
            $allResults = array_values(array_filter($allResults, function (array $result) use (&$seen): bool {
                $key = $result['id'];
                if (isset($seen[$key])) {
                    return false;
                }
                $seen[$key] = true;
                return true;
            }));
            $totalCount = count($allResults);
        }

        $hasMore = ($page * $pageSize) < $totalCount;

        return [
            'results' => array_slice($allResults, 0, $pageSize),
            'total' => $totalCount,
            'page' => $page,
            'pageSize' => $pageSize,
            'hasMore' => $hasMore,
            'errors' => $errors,
        ];
    }

    // ────────────────────────────────────────────
    //  Careerjet fetcher
    // ────────────────────────────────────────────

    /**
     * @return array{0: array, 1: array|null}  [results, error]
     */
    private function fetchCareerjet(
        string $keywords,
        string $location,
        bool $remoteOnly,
        int $page,
        int $pageSize
    ): array {
        // Careerjet uses country code in URL path. Default to 'es' (Spain) for LatAm coverage.
        $countryCode = $this->locationToCountryCode($location) ?: 'es';

        $params = [
            'affid' => $this->careerjetAffid,
            'user_ip' => $_SERVER['REMOTE_ADDR'] ?? '127.0.0.1',
            'user_agent' => $_SERVER['HTTP_USER_AGENT'] ?? 'Mozilla/5.0',
            'keywords' => $keywords,
            'page' => (string) $page,
            'results_per_page' => $pageSize,
        ];

        if ($location !== '') {
            $params['location'] = $location;
        }

        if ($remoteOnly) {
            $params['keywords'] = $keywords . ' remote';
        }

        $queryString = http_build_query($params);
        $url = "https://search.api.careerjet.net/v4/query?{$queryString}";

        // Careerjet uses GET with Basic auth: username=api_key, password=''
        $ctx = stream_context_create([
            'http' => [
                'timeout' => 5,
                'header' => "Authorization: Basic " . base64_encode($this->careerjetApiKey . ':') . "\r\n",
            ],
        ]);
        $result = @file_get_contents($url, false, $ctx);

        if ($result === false) {
            return [[], ['source' => 'careerjet', 'message' => 'Careerjet API unavailable']];
        }

        $response = json_decode($result, true);
        if (!is_array($response)) {
            return [[], ['source' => 'careerjet', 'message' => 'Careerjet API unavailable']];
        }

        $jobs = $response['jobs'] ?? [];
        $results = array_map(function (array $job): array {
            $url = is_string($job['url'] ?? null) ? $job['url'] : '';
            $loc = is_string($job['location'] ?? null) ? $job['location'] : null;
            $salary = '';
            if (isset($job['salary_min']) || isset($job['salary_max'])) {
                $min = isset($job['salary_min']) ? '$' . number_format((int) $job['salary_min']) : '';
                $max = isset($job['salary_max']) ? '$' . number_format((int) $job['salary_max']) : '';
                if ($min && $max) { $salary = "{$min} - {$max}"; }
                elseif ($min) { $salary = "From {$min}"; }
                elseif ($max) { $salary = "Up to {$max}"; }
            }
            return [
                'id' => $this->hashId('careerjet', $url),
                'position' => is_string($job['title'] ?? null) ? $job['title'] : 'Unknown Position',
                'company' => is_string($job['company'] ?? null) ? $job['company'] : 'Unknown Company',
                'location' => $loc,
                'remote' => $this->isRemote($loc ?? ''),
                'salary' => $salary ?: null,
                'description' => $this->truncate(is_string($job['description'] ?? null) ? $job['description'] : null, 1000),
                'url' => $url,
                'postedDate' => is_string($job['date_posted'] ?? null) ? $job['date_posted'] : null,
                'source' => 'careerjet',
                'techStack' => [],
            ];
        }, $jobs);

        return [$results, null];
    }

    // ────────────────────────────────────────────
    //  Jooble fetcher
    // ────────────────────────────────────────────

    /**
     * @return array{0: array, 1: array|null}  [results, error]
     */
    private function fetchJooble(
        string $keywords,
        string $location,
        bool $remoteOnly,
        int $page,
        int $pageSize
    ): array {
        $body = ['keywords' => $keywords, 'page' => (string) $page];
        if ($location !== '') {
            $body['location'] = $location;
        }
        if ($remoteOnly) {
            $body['location'] = trim(($body['location'] ?? '') . ' remote');
        }

        $url = 'https://jooble.org/api/' . $this->joobleApiKey;
        $response = $this->callApi($url, $body);

        if ($response === null) {
            return [[], ['source' => 'jooble', 'message' => 'Jooble API unavailable']];
        }

        $jobs = $response['jobs'] ?? [];
        $results = array_map(function (array $job): array {
            $url = is_string($job['link'] ?? null) ? $job['link'] : '';
            $loc = is_string($job['location'] ?? null) ? $job['location'] : null;
            return [
                'id' => $this->hashId('jooble', $url),
                'position' => is_string($job['title'] ?? null) ? $job['title'] : 'Unknown Position',
                'company' => is_string($job['company'] ?? null) ? $job['company'] : 'Unknown Company',
                'location' => $loc,
                'remote' => $this->isRemote($loc ?? ''),
                'salary' => is_string($job['salary'] ?? null) ? $job['salary'] : null,
                'description' => $this->truncate(is_string($job['snippet'] ?? null) ? $job['snippet'] : null, 1000),
                'url' => $url,
                'postedDate' => is_string($job['updated'] ?? null) ? $job['updated'] : null,
                'source' => 'jooble',
                'techStack' => [],
            ];
        }, $jobs);

        return [$results, null];
    }

    // ────────────────────────────────────────────
    //  All sources fetcher (4-way parallel via curl_multi)
    // ────────────────────────────────────────────

    /**
     * Fetch Jooble, TheirStack, Adzuna, and Careerjet in parallel via curl_multi.
     *
     * @return array{0: array, 1: array}  [merged results, errors]
     */
    private function fetchAllSources(
        string $keywords,
        string $location,
        bool $remoteOnly,
        array $techStack,
        int $page,
        int $pageSize
    ): array {
        if (!function_exists('curl_multi_init')) {
            // Fallback to sequential
            [$joobleResults, $joobleErr] = $this->fetchJooble($keywords, $location, $remoteOnly, $page, $pageSize);
            [$tsResults, $tsErr] = $this->fetchTheirstack($keywords, $location, $remoteOnly, $techStack, $page, $pageSize);
            [$azResults, $azErr] = $this->fetchAdzuna($keywords, $location, $remoteOnly, $page, $pageSize);
            [$cjResults, $cjErr] = $this->fetchCareerjet($keywords, $location, $remoteOnly, $page, $pageSize);
            $errors = [];
            if ($joobleErr !== null) { $errors[] = $joobleErr; }
            if ($tsErr !== null) { $errors[] = $tsErr; }
            if ($azErr !== null) { $errors[] = $azErr; }
            if ($cjErr !== null) { $errors[] = $cjErr; }
            return [array_merge($joobleResults, $tsResults, $azResults, $cjResults), $errors];
        }

        $mh = curl_multi_init();
        $handles = [];
        $sources = [];

        // ── Jooble ──
        if ($this->joobleApiKey !== '') {
            $joobleBody = ['keywords' => $keywords, 'page' => (string) $page];
            if ($location !== '') { $joobleBody['location'] = $location; }
            if ($remoteOnly) { $joobleBody['location'] = trim(($joobleBody['location'] ?? '') . ' remote'); }
            $ch = curl_init('https://jooble.org/api/' . $this->joobleApiKey);
            curl_setopt_array($ch, [
                CURLOPT_POST => true,
                CURLOPT_POSTFIELDS => json_encode($joobleBody),
                CURLOPT_HTTPHEADER => ['Content-Type: application/json'],
                CURLOPT_RETURNTRANSFER => true,
                CURLOPT_TIMEOUT => 5,
            ]);
            curl_multi_add_handle($mh, $ch);
            $handles['jooble'] = $ch;
            $sources[] = 'jooble';
        }

        // ── TheirStack ──
        if ($this->theirstackApiKey !== '') {
            $tsBody = [
                'page' => $page - 1,
                'limit' => $pageSize,
                'job_title_or' => [$keywords],
                'order_by' => [['field' => 'date_posted', 'desc' => true]],
                'posted_at_max_age_days' => 30,
            ];
            $countryCode = $this->locationToCountryCode($location);
            if ($countryCode !== null) { $tsBody['job_country_code_or'] = [$countryCode]; }
            if ($remoteOnly) { $tsBody['remote'] = true; }
            if (count($techStack) > 0) { $tsBody['technology_slug_or'] = $techStack; }
            $ch = curl_init('https://api.theirstack.com/v1/jobs/search');
            curl_setopt_array($ch, [
                CURLOPT_POST => true,
                CURLOPT_POSTFIELDS => json_encode($tsBody),
                CURLOPT_HTTPHEADER => [
                    'Content-Type: application/json',
                    'Authorization: Bearer ' . $this->theirstackApiKey,
                    'Accept: application/json',
                ],
                CURLOPT_RETURNTRANSFER => true,
                CURLOPT_TIMEOUT => 5,
            ]);
            curl_multi_add_handle($mh, $ch);
            $handles['theirstack'] = $ch;
            $sources[] = 'theirstack';
        }

        // ── Adzuna ──
        if ($this->adzunaAppId !== '' && $this->adzunaApiKey !== '') {
            $countryCode = $this->locationToCountryCode($location) ?: 'us';
            $where = $location !== '' ? $location : '';
            $what = $remoteOnly ? $keywords . ' remote' : $keywords;
            $queryParams = http_build_query([
                'app_id' => $this->adzunaAppId,
                'app_key' => $this->adzunaApiKey,
                'what' => $what,
                'where' => $where,
                'results_per_page' => $pageSize,
                'page' => $page,
                'content-type' => 'application/json',
            ]);
            $ch = curl_init("https://api.adzuna.com/v1/api/jobs/{$countryCode}/search/{$page}?{$queryParams}");
            curl_setopt_array($ch, [
                CURLOPT_RETURNTRANSFER => true,
                CURLOPT_TIMEOUT => 5,
            ]);
            curl_multi_add_handle($mh, $ch);
            $handles['adzuna'] = $ch;
            $sources[] = 'adzuna';
        }

        // ── Careerjet ──
        if ($this->careerjetApiKey !== '' && $this->careerjetAffid !== '') {
            $countryCode = $this->locationToCountryCode($location) ?: 'es';
            $cjParams = [
                'affid' => $this->careerjetAffid,
                'user_ip' => $_SERVER['REMOTE_ADDR'] ?? '127.0.0.1',
                'user_agent' => $_SERVER['HTTP_USER_AGENT'] ?? 'Mozilla/5.0',
                'keywords' => $remoteOnly ? $keywords . ' remote' : $keywords,
                'location' => $location !== '' ? $location : '',
                'page' => (string) $page,
                'results_per_page' => $pageSize,
            ];
            $queryString = http_build_query(array_filter($cjParams, fn($v) => $v !== ''));
            $ch = curl_init("https://search.api.careerjet.net/v4/query?{$queryString}");
            curl_setopt_array($ch, [
                CURLOPT_RETURNTRANSFER => true,
                CURLOPT_TIMEOUT => 5,
                CURLOPT_HTTPHEADER => ['Authorization: Basic ' . base64_encode($this->careerjetApiKey . ':')],
            ]);
            curl_multi_add_handle($mh, $ch);
            $handles['careerjet'] = $ch;
            $sources[] = 'careerjet';
        }

        // Execute all in parallel
        $running = 0;
        do {
            curl_multi_exec($mh, $running);
            curl_multi_select($mh, 1);
        } while ($running > 0);

        // Collect results
        $results = [];
        $errors = [];

        foreach ($handles as $source => $ch) {
            $raw = curl_multi_getcontent($ch);
            curl_multi_remove_handle($mh, $ch);
            curl_close($ch);

            if ($raw === false) {
                $errors[] = ['source' => $source, 'message' => ucfirst($source) . ' API unavailable'];
                continue;
            }

            $data = json_decode($raw, true);

            if ($source === 'jooble') {
                if (is_array($data) && isset($data['jobs'])) {
                    foreach ($data['jobs'] as $job) {
                        $url = is_string($job['link'] ?? null) ? $job['link'] : '';
                        $loc = is_string($job['location'] ?? null) ? $job['location'] : null;
                        $results[] = [
                            'id' => $this->hashId('jooble', $url),
                            'position' => is_string($job['title'] ?? null) ? $job['title'] : 'Unknown Position',
                            'company' => is_string($job['company'] ?? null) ? $job['company'] : 'Unknown Company',
                            'location' => $loc,
                            'remote' => $this->isRemote($loc ?? ''),
                            'salary' => is_string($job['salary'] ?? null) ? $job['salary'] : null,
                            'description' => $this->truncate(is_string($job['snippet'] ?? null) ? $job['snippet'] : null, 1000),
                            'url' => $url,
                            'postedDate' => is_string($job['updated'] ?? null) ? $job['updated'] : null,
                            'source' => 'jooble',
                            'techStack' => [],
                        ];
                    }
                } else {
                    $errors[] = ['source' => 'jooble', 'message' => 'Jooble API unavailable'];
                }
            } elseif ($source === 'theirstack') {
                if (is_array($data) && isset($data['data'])) {
                    $tsJobs = is_array($data['data']) ? $data['data'] : [];
                    foreach ($tsJobs as $job) {
                        $url = is_string($job['url'] ?? null) ? $job['url'] : '';
                        $loc = is_string($job['location'] ?? null) ? $job['location'] : null;
                        $tech = is_array($job['technology_slugs'] ?? null) ? $job['technology_slugs'] : [];
                        $results[] = [
                            'id' => $this->hashId('theirstack', $url),
                            'position' => is_string($job['job_title'] ?? $job['title'] ?? null) ? ($job['job_title'] ?? $job['title']) : 'Unknown Position',
                            'company' => is_string($job['company_name'] ?? $job['company'] ?? null) ? ($job['company_name'] ?? $job['company']) : 'Unknown Company',
                            'location' => $loc,
                            'remote' => $this->isRemote($loc ?? '') || ($job['remote'] ?? false) === true,
                            'salary' => is_string($job['salary'] ?? null) ? $job['salary'] : null,
                            'description' => $this->truncate(is_string($job['description'] ?? $job['snippet'] ?? null) ? ($job['description'] ?? $job['snippet']) : null, 1000),
                            'url' => $url,
                            'postedDate' => is_string($job['date_posted'] ?? null) ? $job['date_posted'] : null,
                            'source' => 'theirstack',
                            'techStack' => array_slice($tech, 0, 10),
                        ];
                    }
                } else {
                    $errors[] = ['source' => 'theirstack', 'message' => 'TheirStack API unavailable'];
                }
            } elseif ($source === 'adzuna') {
                if (is_array($data) && isset($data['results'])) {
                    foreach ($data['results'] as $job) {
                        $url = is_string($job['redirect_url'] ?? null) ? $job['redirect_url'] : '';
                        $loc = is_string($job['location'] ?? null) ? $job['location'] : null;
                        $salary = '';
                        if (isset($job['salary_min']) || isset($job['salary_max'])) {
                            $min = isset($job['salary_min']) ? '$' . number_format((int) $job['salary_min']) : '';
                            $max = isset($job['salary_max']) ? '$' . number_format((int) $job['salary_max']) : '';
                            if ($min && $max) { $salary = "{$min} - {$max}"; }
                            elseif ($min) { $salary = "From {$min}"; }
                            elseif ($max) { $salary = "Up to {$max}"; }
                        }
                        $results[] = [
                            'id' => $this->hashId('adzuna', $url),
                            'position' => is_string($job['title'] ?? null) ? $job['title'] : 'Unknown Position',
                            'company' => is_string($job['company'] ?? null) ? $job['company'] : 'Unknown Company',
                            'location' => $loc,
                            'remote' => $this->isRemote($loc ?? ''),
                            'salary' => $salary ?: null,
                            'description' => $this->truncate(is_string($job['description'] ?? null) ? $job['description'] : null, 1000),
                            'url' => $url,
                            'postedDate' => is_string($job['date_published'] ?? null) ? $job['date_published'] : null,
                            'source' => 'adzuna',
                            'techStack' => [],
                        ];
                    }
                } else {
                    $errors[] = ['source' => 'adzuna', 'message' => 'Adzuna API unavailable'];
                }
            } elseif ($source === 'careerjet') {
                if (is_array($data) && isset($data['jobs'])) {
                    foreach ($data['jobs'] as $job) {
                        $url = is_string($job['url'] ?? null) ? $job['url'] : '';
                        $loc = is_string($job['location'] ?? null) ? $job['location'] : null;
                        $salary = '';
                        if (isset($job['salary_min']) || isset($job['salary_max'])) {
                            $min = isset($job['salary_min']) ? '$' . number_format((int) $job['salary_min']) : '';
                            $max = isset($job['salary_max']) ? '$' . number_format((int) $job['salary_max']) : '';
                            if ($min && $max) { $salary = "{$min} - {$max}"; }
                            elseif ($min) { $salary = "From {$min}"; }
                            elseif ($max) { $salary = "Up to {$max}"; }
                        }
                        $results[] = [
                            'id' => $this->hashId('careerjet', $url),
                            'position' => is_string($job['title'] ?? null) ? $job['title'] : 'Unknown Position',
                            'company' => is_string($job['company'] ?? null) ? $job['company'] : 'Unknown Company',
                            'location' => $loc,
                            'remote' => $this->isRemote($loc ?? ''),
                            'salary' => $salary ?: null,
                            'description' => $this->truncate(is_string($job['description'] ?? null) ? $job['description'] : null, 1000),
                            'url' => $url,
                            'postedDate' => is_string($job['date_posted'] ?? null) ? $job['date_posted'] : null,
                            'source' => 'careerjet',
                            'techStack' => [],
                        ];
                    }
                } else {
                    $errors[] = ['source' => 'careerjet', 'message' => 'Careerjet API unavailable'];
                }
            }
        }

        curl_multi_close($mh);

        return [$results, $errors];
    }

    // ────────────────────────────────────────────
    //  Adzuna fetcher
    // ────────────────────────────────────────────

    /**
     * @return array{0: array, 1: array|null}  [results, error]
     */
    private function fetchAdzuna(
        string $keywords,
        string $location,
        bool $remoteOnly,
        int $page,
        int $pageSize
    ): array {
        // Adzuna uses country code in URL path. Default to US.
        $countryCode = $this->locationToCountryCode($location) ?: 'us';

        $params = [
            'app_id' => $this->adzunaAppId,
            'app_key' => $this->adzunaApiKey,
            'what' => $keywords,
            'results_per_page' => $pageSize,
            'page' => $page,
            'content-type' => 'application/json',
        ];

        if ($location !== '') {
            $params['where'] = $location;
        }

        if ($remoteOnly) {
            $params['what'] = $keywords . ' remote';
        }

        $queryString = http_build_query($params);
        $url = "https://api.adzuna.com/v1/api/jobs/{$countryCode}/search/{$page}?{$queryString}";

        // Adzuna uses GET — use file_get_contents with 5s timeout
        $ctx = stream_context_create(['http' => ['timeout' => 5]]);
        $result = @file_get_contents($url, false, $ctx);

        if ($result === false) {
            return [[], ['source' => 'adzuna', 'message' => 'Adzuna API unavailable']];
        }

        $response = json_decode($result, true);
        if (!is_array($response)) {
            return [[], ['source' => 'adzuna', 'message' => 'Adzuna API unavailable']];
        }

        $jobs = $response['results'] ?? [];
        $results = array_map(function (array $job): array {
            $url = is_string($job['redirect_url'] ?? null) ? $job['redirect_url'] : '';
            $location = is_string($job['location'] ?? null) ? $job['location'] : null;
            $salary = '';
            if (isset($job['salary_min']) || isset($job['salary_max'])) {
                $min = isset($job['salary_min']) ? '$' . number_format((int) $job['salary_min']) : '';
                $max = isset($job['salary_max']) ? '$' . number_format((int) $job['salary_max']) : '';
                if ($min && $max) { $salary = "{$min} - {$max}"; }
                elseif ($min) { $salary = "From {$min}"; }
                elseif ($max) { $salary = "Up to {$max}"; }
            }
            return [
                'id' => $this->hashId('adzuna', $url),
                'position' => is_string($job['title'] ?? null) ? $job['title'] : 'Unknown Position',
                'company' => is_string($job['company'] ?? null) ? $job['company'] : 'Unknown Company',
                'location' => $location,
                'remote' => $this->isRemote($location ?? ''),
                'salary' => $salary ?: null,
                'description' => $this->truncate(is_string($job['description'] ?? null) ? $job['description'] : null, 1000),
                'url' => $url,
                'postedDate' => is_string($job['date_published'] ?? null) ? $job['date_published'] : null,
                'source' => 'adzuna',
                'techStack' => [],
            ];
        }, $jobs);

        return [$results, null];
    }

    // ────────────────────────────────────────────
    //  TheirStack fetcher
    // ────────────────────────────────────────────

    /**
     * @return array{0: array, 1: array|null}  [results, error]
     */
    private function fetchTheirstack(
        string $keywords,
        string $location,
        bool $remoteOnly,
        array $techStack,
        int $page,
        int $pageSize
    ): array {
        $body = [
            'page' => $page - 1,  // TheirStack is 0-based
            'limit' => $pageSize,
            'job_title_or' => [$keywords],  // Full phrase as single element for better relevance
            'order_by' => [['field' => 'date_posted', 'desc' => true]],
            'posted_at_max_age_days' => 30,
        ];

        if ($location !== '') {
            // TheirStack uses country codes, but we try location as keyword/company filter
            // Fallback: use job_country_code_or for common country names
            $countryCode = $this->locationToCountryCode($location);
            if ($countryCode !== null) {
                $body['job_country_code_or'] = [$countryCode];
            }
        }

        if ($remoteOnly) {
            $body['remote'] = true;
        }

        if (count($techStack) > 0) {
            $body['technology_slug_or'] = $techStack;
        }

        $url = 'https://api.theirstack.com/v1/jobs/search';
        $headers = [
            'Content-Type: application/json',
            'Authorization: Bearer ' . $this->theirstackApiKey,
            'Accept: application/json',
        ];
        $response = $this->callApiWithHeaders($url, $body, $headers);

        if ($response === null) {
            return [[], ['source' => 'theirstack', 'message' => 'TheirStack API unavailable']];
        }

        // TheirStack response: { data: [...], meta: { total?: number, ... } }
        $jobs = $response['data'] ?? [];
        if (!is_array($jobs)) {
            $jobs = [];
        }

        $results = array_map(function (array $job): array {
            $url = is_string($job['url'] ?? null) ? $job['url'] : '';
            $location = is_string($job['location'] ?? null) ? $job['location'] : null;
            $techStack = is_array($job['technology_slugs'] ?? null) ? $job['technology_slugs'] : [];
            return [
                'id' => $this->hashId('theirstack', $url),
                'position' => is_string($job['job_title'] ?? $job['title'] ?? null) ? ($job['job_title'] ?? $job['title']) : 'Unknown Position',
                'company' => is_string($job['company_name'] ?? $job['company'] ?? null) ? ($job['company_name'] ?? $job['company']) : 'Unknown Company',
                'location' => $location,
                'remote' => $this->isRemote($location ?? '') || ($job['remote'] ?? false) === true,
                'salary' => is_string($job['salary'] ?? null) ? $job['salary'] : null,
                'description' => $this->truncate(is_string($job['description'] ?? $job['snippet'] ?? null) ? ($job['description'] ?? $job['snippet']) : null, 1000),
                'url' => $url,
                'postedDate' => is_string($job['date_posted'] ?? null) ? $job['date_posted'] : null,
                'source' => 'theirstack',
                'techStack' => array_slice($techStack, 0, 10),
            ];
        }, $jobs);

        return [$results, null];
    }

    // ────────────────────────────────────────────
    //  Parallel fetcher (curl_multi_exec)
    // ────────────────────────────────────────────

    /**
     * Fetch both Jooble and TheirStack in parallel using curl_multi.
     * Falls back to sequential if curl_multi is unavailable.
     *
     * @return array{0: array, 1: array}  [merged results, errors]
     */
    private function fetchBothSources(
        string $keywords,
        string $location,
        bool $remoteOnly,
        array $techStack,
        int $page,
        int $pageSize
    ): array {
        if (!function_exists('curl_multi_init')) {
            // Fallback to sequential
            [$joobleResults, $joobleErr] = $this->fetchJooble($keywords, $location, $remoteOnly, $page, $pageSize);
            [$tsResults, $tsErr] = $this->fetchTheirstack($keywords, $location, $remoteOnly, $techStack, $page, $pageSize);
            $errors = [];
            if ($joobleErr !== null) { $errors[] = $joobleErr; }
            if ($tsErr !== null) { $errors[] = $tsErr; }
            return [array_merge($joobleResults, $tsResults), $errors];
        }

        // Build Jooble request
        $joobleBody = ['keywords' => $keywords, 'page' => (string) $page];
        if ($location !== '') { $joobleBody['location'] = $location; }
        if ($remoteOnly) { $joobleBody['location'] = trim(($joobleBody['location'] ?? '') . ' remote'); }
        $joobleUrl = 'https://jooble.org/api/' . $this->joobleApiKey;
        $joobleJson = json_encode($joobleBody);

        // Build TheirStack request
        $tsBody = [
            'page' => $page - 1,
            'limit' => $pageSize,
            'job_title_or' => [$keywords],  // Full phrase
            'order_by' => [['field' => 'date_posted', 'desc' => true]],
            'posted_at_max_age_days' => 30,
        ];
        $countryCode = $this->locationToCountryCode($location);
        if ($countryCode !== null) { $tsBody['job_country_code_or'] = [$countryCode]; }
        if ($remoteOnly) { $tsBody['remote'] = true; }
        if (count($techStack) > 0) { $tsBody['technology_slug_or'] = $techStack; }
        $tsUrl = 'https://api.theirstack.com/v1/jobs/search';
        $tsJson = json_encode($tsBody);

        if ($joobleJson === false || $tsJson === false) {
            return [[], [['source' => 'proxy', 'message' => 'Failed to encode request body']]];
        }

        $mh = curl_multi_init();

        // Jooble handle
        $chJooble = curl_init($joobleUrl);
        curl_setopt_array($chJooble, [
            CURLOPT_POST => true,
            CURLOPT_POSTFIELDS => $joobleJson,
            CURLOPT_HTTPHEADER => ['Content-Type: application/json'],
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_TIMEOUT => 5,
        ]);
        curl_multi_add_handle($mh, $chJooble);

        // TheirStack handle
        $chTs = curl_init($tsUrl);
        curl_setopt_array($chTs, [
            CURLOPT_POST => true,
            CURLOPT_POSTFIELDS => $tsJson,
            CURLOPT_HTTPHEADER => [
                'Content-Type: application/json',
                'Authorization: Bearer ' . $this->theirstackApiKey,
                'Accept: application/json',
            ],
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_TIMEOUT => 5,
        ]);
        curl_multi_add_handle($mh, $chTs);

        // Execute parallel
        $running = 0;
        do {
            curl_multi_exec($mh, $running);
            curl_multi_select($mh, 1);
        } while ($running > 0);

        $joobleRaw = curl_multi_getcontent($chJooble);
        $tsRaw = curl_multi_getcontent($chTs);

        curl_multi_remove_handle($mh, $chJooble);
        curl_multi_remove_handle($mh, $chTs);
        curl_multi_close($mh);
        curl_close($chJooble);
        curl_close($chTs);

        // Parse results
        $results = [];
        $errors = [];

        if ($joobleRaw !== false) {
            $joobleData = json_decode($joobleRaw, true);
            if (is_array($joobleData) && isset($joobleData['jobs'])) {
                foreach ($joobleData['jobs'] as $job) {
                    $url = is_string($job['link'] ?? null) ? $job['link'] : '';
                    $loc = is_string($job['location'] ?? null) ? $job['location'] : null;
                    $results[] = [
                        'id' => $this->hashId('jooble', $url),
                        'position' => is_string($job['title'] ?? null) ? $job['title'] : 'Unknown Position',
                        'company' => is_string($job['company'] ?? null) ? $job['company'] : 'Unknown Company',
                        'location' => $loc,
                        'remote' => $this->isRemote($loc ?? ''),
                        'salary' => is_string($job['salary'] ?? null) ? $job['salary'] : null,
                        'description' => $this->truncate(is_string($job['snippet'] ?? null) ? $job['snippet'] : null, 1000),
                        'url' => $url,
                        'postedDate' => is_string($job['updated'] ?? null) ? $job['updated'] : null,
                        'source' => 'jooble',
                        'techStack' => [],
                    ];
                }
            } else {
                $errors[] = ['source' => 'jooble', 'message' => 'Jooble API unavailable'];
            }
        } else {
            $errors[] = ['source' => 'jooble', 'message' => 'Jooble API unavailable'];
        }

        if ($tsRaw !== false) {
            $tsData = json_decode($tsRaw, true);
            if (is_array($tsData) && isset($tsData['data'])) {
                $tsJobs = is_array($tsData['data']) ? $tsData['data'] : [];
                foreach ($tsJobs as $job) {
                    $url = is_string($job['url'] ?? null) ? $job['url'] : '';
                    $loc = is_string($job['location'] ?? null) ? $job['location'] : null;
                    $tech = is_array($job['technology_slugs'] ?? null) ? $job['technology_slugs'] : [];
                    $results[] = [
                        'id' => $this->hashId('theirstack', $url),
                        'position' => is_string($job['job_title'] ?? $job['title'] ?? null) ? ($job['job_title'] ?? $job['title']) : 'Unknown Position',
                        'company' => is_string($job['company_name'] ?? $job['company'] ?? null) ? ($job['company_name'] ?? $job['company']) : 'Unknown Company',
                        'location' => $loc,
                        'remote' => $this->isRemote($loc ?? '') || ($job['remote'] ?? false) === true,
                        'salary' => is_string($job['salary'] ?? null) ? $job['salary'] : null,
                        'description' => $this->truncate(is_string($job['description'] ?? $job['snippet'] ?? null) ? ($job['description'] ?? $job['snippet']) : null, 1000),
                        'url' => $url,
                        'postedDate' => is_string($job['date_posted'] ?? null) ? $job['date_posted'] : null,
                        'source' => 'theirstack',
                        'techStack' => array_slice($tech, 0, 10),
                    ];
                }
            } else {
                $errors[] = ['source' => 'theirstack', 'message' => 'TheirStack API unavailable'];
            }
        } else {
            $errors[] = ['source' => 'theirstack', 'message' => 'TheirStack API unavailable'];
        }

        return [$results, $errors];
    }

    // ────────────────────────────────────────────
    //  Shared helpers
    // ────────────────────────────────────────────

    /**
     * Generate a deterministic hash-based ID for deduplication.
     */
    private function hashId(string $source, string $url): string
    {
        return $source . '_' . substr(hash('sha256', $this->normalizeUrl($url)), 0, 12);
    }

    /**
     * Make an HTTP POST call to an external API with JSON body.
     * Returns decoded JSON response or null on failure/timeout.
     */
    private function callApi(string $url, array $body): ?array
    {
        $jsonBody = json_encode($body);
        if ($jsonBody === false) {
            return null;
        }

        $opts = [
            'http' => [
                'method' => 'POST',
                'header' => "Content-Type: application/json\r\n",
                'content' => $jsonBody,
                'timeout' => 5,
                'ignore_errors' => true,
            ],
        ];

        $ctx = stream_context_create($opts);
        $result = @file_get_contents($url, false, $ctx);

        if ($result === false) {
            return null;
        }

        $decoded = json_decode($result, true);
        return is_array($decoded) ? $decoded : null;
    }

    /**
     * Make an HTTP POST call with custom headers (e.g., Bearer auth).
     */
    private function callApiWithHeaders(string $url, array $body, array $headers): ?array
    {
        $jsonBody = json_encode($body);
        if ($jsonBody === false) {
            return null;
        }

        $headerString = implode("\r\n", $headers) . "\r\n";

        $opts = [
            'http' => [
                'method' => 'POST',
                'header' => $headerString,
                'content' => $jsonBody,
                'timeout' => 5,
                'ignore_errors' => true,
            ],
        ];

        $ctx = stream_context_create($opts);
        $result = @file_get_contents($url, false, $ctx);

        if ($result === false) {
            return null;
        }

        $decoded = json_decode($result, true);
        return is_array($decoded) ? $decoded : null;
    }

    /**
     * Convert a location string to ISO 3166-1 alpha-2 country code.
     */
    private function locationToCountryCode(string $location): ?string
    {
        $map = [
            'us' => 'US', 'usa' => 'US', 'united states' => 'US', 'united states of america' => 'US',
            'uk' => 'GB', 'united kingdom' => 'GB', 'england' => 'GB', 'britain' => 'GB',
            'ca' => 'CA', 'canada' => 'CA',
            'de' => 'DE', 'germany' => 'DE', 'alemania' => 'DE',
            'fr' => 'FR', 'france' => 'FR', 'francia' => 'FR',
            'es' => 'ES', 'spain' => 'ES', 'españa' => 'ES', 'espana' => 'ES',
            'mx' => 'MX', 'mexico' => 'MX', 'méxico' => 'MX',
            'ar' => 'AR', 'argentina' => 'AR',
            'co' => 'CO', 'colombia' => 'CO',
            'cl' => 'CL', 'chile' => 'CL',
            'pe' => 'PE', 'peru' => 'PE', 'perú' => 'PE',
            'br' => 'BR', 'brazil' => 'BR', 'brasil' => 'BR',
            'nl' => 'NL', 'netherlands' => 'NL', 'holland' => 'NL', 'países bajos' => 'NL',
            'ie' => 'IE', 'ireland' => 'IE', 'irlanda' => 'IE',
            'au' => 'AU', 'australia' => 'AU',
            'nz' => 'NZ', 'new zealand' => 'NZ', 'nueva zelanda' => 'NZ',
            'sg' => 'SG', 'singapore' => 'SG', 'singapur' => 'SG',
            'jp' => 'JP', 'japan' => 'JP', 'japón' => 'JP', 'japon' => 'JP',
            'in' => 'IN', 'india' => 'IN',
        ];

        $lower = mb_strtolower(trim($location));

        // Try exact match first
        if (isset($map[$lower])) {
            return $map[$lower];
        }

        // Try partial match (e.g., "London, UK")
        foreach ($map as $key => $code) {
            if (strpos($lower, $key) !== false) {
                return $code;
            }
        }

        return null;
    }

    /**
     * Normalize a URL for deduplication:
     * - Lowercase scheme + host
     * - Strip www.
     * - Strip trailing slash
     * - Strip most query params (keep ?jk= for LinkedIn)
     */
    private function normalizeUrl(string $url): string
    {
        $url = trim($url);
        if ($url === '') {
            return '';
        }

        $parsed = parse_url($url);
        if ($parsed === false || !isset($parsed['host'])) {
            return mb_strtolower($url);
        }

        $host = mb_strtolower($parsed['host']);
        $host = preg_replace('/^www\./', '', $host);

        $path = ($parsed['path'] ?? '');
        $path = rtrim($path, '/');

        $normalized = $host . $path;

        // Keep only ?jk= param (LinkedIn job ID)
        if (isset($parsed['query'])) {
            parse_str($parsed['query'], $params);
            if (isset($params['jk'])) {
                $normalized .= '?jk=' . $params['jk'];
            }
        }

        return $normalized;
    }

    /**
     * Detect if a location string indicates remote work.
     */
    private function isRemote(string $location): bool
    {
        $lower = mb_strtolower($location);
        $remoteKeywords = ['remote', 'remoto', 'work from home', 'teletrabajo', 'anywhere'];
        foreach ($remoteKeywords as $keyword) {
            if (strpos($lower, $keyword) !== false) {
                return true;
            }
        }
        return false;
    }

    /**
     * Truncate a string to max length, appending "…" if truncated.
     */
    private function truncate(?string $text, int $maxLength): ?string
    {
        if ($text === null) {
            return null;
        }

        if (mb_strlen($text) <= $maxLength) {
            return $text;
        }

        return mb_substr($text, 0, $maxLength) . '…';
    }

    /**
     * Parse JSON request body.
     */
    private function getInputJson(): array
    {
        $json = file_get_contents('php://input') ?: '{}';
        return json_decode($json, true) ?? [];
    }
}
