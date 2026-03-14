# Memory Recording: Directory Traversal Fix in PHP Router

## Context
The PHP Router was vulnerable to directory traversal through common prefix attacks. If a validation check only ensured that a path started with a certain prefix (e.g., `/app/controllers`), an attacker could potentially access sibling directories with the same prefix (e.g., `/app/controllers_backup/SecretController.php`).

## Implementation
- **Absolute Path Resolution:** Used `realpath()` to resolve the absolute path of the controllers directory.
- **Trailing Separator:** Appended `DIRECTORY_SEPARATOR` to the base path (`resolvedClientPath`) before validation.
- **Prefix Validation:** Verified that the resolved controller file path starts with the `resolvedClientPath` using `strpos(...) === 0`.
- **Convention:** Added a `// Slicer: ...` comment to document the security fix.

## Code Snippet
```php
$controllersDir = realpath(__DIR__ . '/controllers');
$resolvedClientPath = $controllersDir . DIRECTORY_SEPARATOR;
$controllerFile = realpath(__DIR__ . "/controllers/$controllerName.php");

if ($controllerFile !== false && strpos($controllerFile, $resolvedClientPath) === 0) {
    // Safe to require and execute
}
```
