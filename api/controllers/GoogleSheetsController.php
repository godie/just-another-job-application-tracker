<?php
/**
 * Google Sheets API proxy. Requires auth cookie.
 * Uses resolved token (refresh if expired) so Google APIs get a valid access token.
 * POST body: { "action": "create_sheet"|"sync_data"|"get_sheet_info", ... }
 */
class GoogleSheetsController
{
    private const MAX_BODY_BYTES = 5_000_000;
    private const MAX_APPLICATIONS = 1_000;
    private const MAX_TIMELINE_EVENTS = 100;

    private array $config;

    public function __construct()
    {
        $this->config = require __DIR__ . '/../config.php';
    }

    /** POST /google-sheets - Dispatches by action in body */
    public function index(): array
    {
        $accessToken = $this->getAccessToken();
        if ($accessToken === null || $accessToken === '') {
            http_response_code(401);
            return [
                'success' => false,
                'error' => 'Authentication required. Please log in with Google.',
            ];
        }

        $data = $this->getInputJson();
        if (!is_array($data)) {
            http_response_code(400);
            return ['success' => false, 'error' => 'Invalid JSON body.'];
        }
        $data = $this->sanitizeInput($data);
        $action = $data['action'] ?? '';

        try {
            switch ($action) {
                case 'create_sheet':
                    return $this->createSheet($accessToken, $data);
                case 'sync_data':
                    return $this->syncData($accessToken, $data);
                case 'get_sheet_info':
                    return $this->getSheetInfo($accessToken, $data);
                default:
                    http_response_code(400);
                    return [
                        'success' => false,
                        'error' => 'Invalid action. Supported actions: create_sheet, sync_data, get_sheet_info',
                    ];
            }
        } catch (Exception $e) {
            error_log('[GoogleSheetsController] request failed: ' . $e->getMessage());
            http_response_code(500);
            return [
                'success' => false,
                'error' => 'Unable to process Google Sheets request.',
            ];
        }
    }

    private function getAccessToken(): ?string
    {
        require_once __DIR__ . '/../helpers/auth.php';
        return get_valid_access_token($this->config);
    }

    private function getInputJson(): mixed
    {
        $json = file_get_contents('php://input', false, null, 0, self::MAX_BODY_BYTES + 1);
        if ($json === false || $json === '' || strlen($json) > self::MAX_BODY_BYTES) {
            return null;
        }

        try {
            return json_decode($json, true, 32, JSON_THROW_ON_ERROR);
        } catch (Throwable) {
            return null;
        }
    }

    private function sanitizeInput(array $data): array
    {
        // Slicer: Sanitize on output, not on input when sending to an API.
        // Munging data with htmlspecialchars() here will corrupt data in Google Sheets.
        // We still ensure types are correct.
        return $data;
    }

    private function createSheet(string $accessToken, array $data): array
    {
        $title = $data['title'] ?? 'Job Application Tracker';
        if ($title === '' || !is_string($title) || strlen($title) > 100) {
            throw new Exception('Invalid or missing spreadsheet title.');
        }

        $spreadsheetData = [
            'properties' => ['title' => $title],
            'sheets' => [
                [
                    'properties' => [
                        'title' => 'Applications',
                        'gridProperties' => ['frozenRowCount' => 1],
                    ],
                    'data' => [
                        [
                            'rowData' => [
                                [
                                    'values' => [
                                        ['userEnteredValue' => ['stringValue' => 'ID']],
                                        ['userEnteredValue' => ['stringValue' => 'Position']],
                                        ['userEnteredValue' => ['stringValue' => 'Company']],
                                        ['userEnteredValue' => ['stringValue' => 'Salary']],
                                        ['userEnteredValue' => ['stringValue' => 'Status']],
                                        ['userEnteredValue' => ['stringValue' => 'Application Date']],
                                        ['userEnteredValue' => ['stringValue' => 'Interview Date']],
                                        ['userEnteredValue' => ['stringValue' => 'Platform']],
                                        ['userEnteredValue' => ['stringValue' => 'Contact Name']],
                                        ['userEnteredValue' => ['stringValue' => 'Follow-up Date']],
                                        ['userEnteredValue' => ['stringValue' => 'Link']],
                                        ['userEnteredValue' => ['stringValue' => 'Notes']],
                                        ['userEnteredValue' => ['stringValue' => 'Timeline Events']],
                                    ],
                                ],
                            ],
                        ],
                    ],
                ],
            ],
        ];

        $url = 'https://sheets.googleapis.com/v4/spreadsheets';
        $response = $this->makeGoogleApiRequest($url, $accessToken, 'POST', $spreadsheetData);

        if (!$response || !isset($response['spreadsheetId'])) {
            throw new Exception('Failed to create spreadsheet: ' . json_encode($response));
        }

        $spreadsheetId = $response['spreadsheetId'];
        $sheetId = $response['sheets'][0]['properties']['sheetId'] ?? 0;
        $this->formatHeaderRow($accessToken, $spreadsheetId, $sheetId);

        return [
            'success' => true,
            'spreadsheetId' => $spreadsheetId,
            'spreadsheetUrl' => $response['spreadsheetUrl'] ?? "https://docs.google.com/spreadsheets/d/{$spreadsheetId}",
            'message' => 'Spreadsheet created successfully',
        ];
    }

    private function syncData(string $accessToken, array $data): array
    {
        $spreadsheetId = $data['spreadsheetId'] ?? null;
        $applications = $data['applications'] ?? [];

        if (!$spreadsheetId || !is_string($spreadsheetId) || !preg_match('/^[a-zA-Z0-9\-_]+$/', $spreadsheetId)) {
            throw new Exception('Valid Spreadsheet ID is required.');
        }
        if (!is_array($applications) || count($applications) > self::MAX_APPLICATIONS) {
            throw new Exception('Applications must contain at most 1000 items.');
        }
        foreach ($applications as $app) {
            if (!is_array($app)) {
                throw new Exception('Applications must contain objects.');
            }
            if (isset($app['timeline']) && (!is_array($app['timeline']) || count($app['timeline']) > self::MAX_TIMELINE_EVENTS)) {
                throw new Exception('Timeline must contain at most 100 items.');
            }
        }

        $values = array_map(function (array $app): array {
            $timelineStr = '';
            if (isset($app['timeline']) && is_array($app['timeline'])) {
                $events = array_map(function (array $event): string {
                    $type = $event['type'] ?? 'unknown';
                    $date = $event['date'] ?? '';
                    $status = $event['status'] ?? '';
                    $customType = $event['customTypeName'] ?? '';
                    $interviewer = $event['interviewerName'] ?? '';
                    $notes = $event['notes'] ?? '';
                    $eventStr = $customType ?: $type;
                    if ($interviewer) {
                        $eventStr .= " with {$interviewer}";
                    }
                    $eventStr .= " ({$status}) - {$date}";
                    if ($notes) {
                        $eventStr .= ": {$notes}";
                    }
                    return $eventStr;
                }, $app['timeline']);
                $timelineStr = implode('; ', $events);
            }
            return [
                $app['id'] ?? '',
                $app['position'] ?? '',
                $app['company'] ?? '',
                $app['salary'] ?? '',
                $app['status'] ?? '',
                $app['applicationDate'] ?? '',
                $app['interviewDate'] ?? '',
                $app['platform'] ?? '',
                $app['contactName'] ?? '',
                $app['followUpDate'] ?? '',
                $app['link'] ?? '',
                $app['notes'] ?? '',
                $timelineStr,
            ];
        }, $applications);

        $range = 'Applications!A2:M1000';
        $clearUrl = "https://sheets.googleapis.com/v4/spreadsheets/{$spreadsheetId}/values/" . urlencode($range) . ":clear";
        $this->makeGoogleApiRequest($clearUrl, $accessToken, 'POST', new stdClass());

        if (!empty($values)) {
            $updateData = [
                'valueInputOption' => 'USER_ENTERED',
                'data' => [['range' => 'Applications!A2', 'values' => $values]],
            ];
            $updateUrl = "https://sheets.googleapis.com/v4/spreadsheets/{$spreadsheetId}/values:batchUpdate";
            $response = $this->makeGoogleApiRequest($updateUrl, $accessToken, 'POST', $updateData);
            if (!$response || !isset($response['responses'])) {
                throw new Exception('Failed to sync data: ' . json_encode($response));
            }
            return [
                'success' => true,
                'rowsSynced' => count($values),
                'message' => 'Data synced successfully',
            ];
        }

        return [
            'success' => true,
            'rowsSynced' => 0,
            'message' => 'No data to sync',
        ];
    }

    private function getSheetInfo(string $accessToken, array $data): array
    {
        $spreadsheetId = $data['spreadsheetId'] ?? null;
        if (!$spreadsheetId || !is_string($spreadsheetId) || !preg_match('/^[a-zA-Z0-9\-_]+$/', $spreadsheetId)) {
            throw new Exception('Valid Spreadsheet ID is required.');
        }

        $url = "https://sheets.googleapis.com/v4/spreadsheets/{$spreadsheetId}";
        $response = $this->makeGoogleApiRequest($url, $accessToken, 'GET');
        if (!$response) {
            throw new Exception('Failed to get spreadsheet info');
        }
        return [
            'success' => true,
            'spreadsheet' => $response,
        ];
    }

    private function formatHeaderRow(string $accessToken, string $spreadsheetId, int $sheetId = 0): void
    {
        $formatData = [
            'requests' => [
                [
                    'repeatCell' => [
                        'range' => [
                            'sheetId' => $sheetId,
                            'startRowIndex' => 0,
                            'endRowIndex' => 1,
                        ],
                        'cell' => [
                            'userEnteredFormat' => [
                                'textFormat' => ['bold' => true],
                                'backgroundColor' => ['red' => 0.9, 'green' => 0.9, 'blue' => 0.9],
                            ],
                        ],
                        'fields' => 'userEnteredFormat(textFormat,backgroundColor)',
                    ],
                ],
            ],
        ];
        $url = "https://sheets.googleapis.com/v4/spreadsheets/{$spreadsheetId}:batchUpdate";
        $this->makeGoogleApiRequest($url, $accessToken, 'POST', $formatData);
    }

    private function makeGoogleApiRequest(string $url, string $accessToken, string $method = 'GET', array|object|null $data = null): ?array
    {
        $ch = curl_init($url);
        $headers = [
            'Authorization: Bearer ' . $accessToken,
            'Content-Type: application/json',
        ];

        curl_setopt_array($ch, [
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_HTTPHEADER => $headers,
            CURLOPT_CUSTOMREQUEST => $method,
        ]);

        if ($method === 'POST' && $data !== null) {
            curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($data));
        }

        $response = curl_exec($ch);
        $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        $error = curl_error($ch);
        curl_close($ch);

        if ($error !== '') {
            throw new Exception('Google API request failed.');
        }
        if ($httpCode >= 400) {
            throw new Exception("Google API request failed with HTTP {$httpCode}.");
        }

        return json_decode($response, true);
    }
}
