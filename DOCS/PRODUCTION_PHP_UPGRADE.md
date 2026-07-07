# Production Server PHP Upgrade Runbook (v2.6.19 GATE)

> **When to use this runbook.** You are here because the `## [2.6.19]` `CHANGELOG.md` entry's `PRODUCTION SERVER UPGRADE GATE` is open, and a deploy of `v2.6.19+` to a production server that is still on PHP 8.2.x would trigger **fatal runtime errors on the first HTTP request**. The deploy workflow is already on PHP 8.4 (CI is green), but the production server's PHP version is set out-of-band by the infrastructure operator (i.e., you). This runbook is the procedure.

## Why this upgrade is required

The `v2.6.19` `CHANGELOG.md` entry's `PRODUCTION SERVER UPGRADE GATE` note is the source of truth; the short version is:

- `api/composer.json` was bumped to `php: ^8.4.1` (from the v2.6.19 release's `^8.1` floor).
- `symfony/http-client: ^8.1` (the HTTP client the API uses for OAuth + Google Sheets sync) **hard-requires** `php >=8.4.1`. This is not a suggestion — `composer install` against PHP 8.2.x will refuse to resolve it.
- The `v2.6.2` entry pinned the production server at PHP 8.2.31. That pin is now obsolete; the runtime requirement has moved.
- Shipping `v2.6.19+` to a PHP 8.2.x production server produces a fatal error on the first web request (HTTP 500), because the first `require 'vendor/autoload.php'` in the deployed artifact tries to load `symfony/http-client 8.x`, which autoloads code that uses PHP 8.4 syntax (`readonly class` amendments, asymmetric visibility, etc.). The CI build runs on PHP 8.4 and ships a `dist/api/vendor/` tree that was compiled against the 8.4 ABI; the production server's PHP 8.2 runtime cannot execute it.

The fix is to upgrade the production server's PHP to **8.4.1 or newer** before the next deploy. The CI build itself does not need to change — it has been on PHP 8.4 since v2.6.19.

## Phase 0 — Discovery & Pre-flight

**Before touching anything**, capture the current state of the production server. The commands below are safe (read-only).

### OS detection

```bash
cat /etc/os-release
```

Identify the `ID=` line. The two most common production server OSs for this kind of `rsync` deploy are:

- **Ubuntu** (`ID=ubuntu`, e.g. `22.04`, `24.04`) or **Debian** (`ID=debian`, e.g. `11`, `12`) — package manager: `apt`. **Use the Ubuntu/Debian section below.**
- **RHEL** (`ID=rhel`, e.g. `9`), **AlmaLinux** (`ID=almalinux`, e.g. `8`, `9`), **Rocky** (`ID=rocky`, e.g. `8`, `9`), or **CentOS Stream** (`ID=centos`) — package manager: `dnf` (or `yum` on 8.x). **Use the RHEL family section below.**

If you are on something else (Alpine, Amazon Linux, etc.), the same shape applies but the package names + repos will differ; the [Phase 0 discovery](#phase-0--discovery--pre-flight), [Phase 3 verification](#phase-3--verification), and [rollback plan](#rollback-plan) sections still apply unchanged.

### SAPI detection (PHP-FPM vs Apache mod_php)

```bash
# Is PHP-FPM installed and running?
systemctl list-units --type=service --all | grep -E 'php.*-fpm'

# Is Apache mod_php loaded?
apachectl -M 2>/dev/null | grep -i php || httpd -M 2>/dev/null | grep -i php
```

Pick the matching **Phase 2 SAPI swap** section below based on what you see. Many production deployments are Apache + `mod_php` (common for older Ubuntu LTS servers) or Nginx + `php-fpm` (common for newer setups). If both are present, you have a hybrid — pick the SAPI the web traffic actually goes through and disable the other.

### Capture the current PHP + extension list

```bash
php -v
php -m > /tmp/php-extensions-pre-upgrade.txt
cat /tmp/php-extensions-pre-upgrade.txt
```

The extension list is your rollback reference — after the upgrade, `diff /tmp/php-extensions-pre-upgrade.txt <(php -m)` should be empty (same set of extensions, just on the new PHP version).

### Define shell variables for the rest of the runbook

```bash
export OLD_PHP="8.2"
export NEW_PHP="8.4"
```

These are used in the commands below. Adjust `NEW_PHP` if you want 8.5 (the codebase is on 8.4.1+, so anything >= 8.4.1 works; 8.5+ requires no further codebase changes).

### Backup (defensive)

The PHP upgrade does not touch the application code or the database, but a snapshot is cheap insurance:

- **Database** — the API connects to a MySQL/PostgreSQL/SQLite database (driver is `DB_DRIVER` env-driven; check the current `dist/api/config.php` for the active value). Take a dump before the upgrade window.
- **Application config** — back up `dist/api/config.php` + `dist/api/.env` (the two files the operator injects at deploy time). The deploy workflow regenerates both from secrets, but a local copy is useful for rollback.
- **PHP-FPM pool config** — `/etc/php/{OLD_PHP}-fpm/pool.d/www.conf` (or equivalent). The new version's pool config may have new defaults; the old one is the rollback reference.

## Phase 1 — Package installation

Pick the section that matches your OS from [Phase 0](#phase-0--discovery--pre-flight).

### Ubuntu / Debian (apt + Ondřej Surý PPA)

The `ondrej/php` PPA is the de-facto source for up-to-date PHP versions on Ubuntu LTS and Debian. It is maintained by the Debian PHP maintainer and tracks upstream PHP releases within days.

```bash
# 1. Add the PPA (idempotent — safe to re-run)
sudo apt install -y software-properties-common ca-certificates lsb-release apt-transport-https
sudo add-apt-repository -y ppa:ondrej/php

# 2. Refresh the package index
sudo apt update

# 3. Install the new PHP CLI + the SAME extension set as the old PHP
#    (the awk+sed dance preserves the extension list — adjust if you want to drop/add extensions)
sudo apt install -y php${NEW_PHP} php${NEW_PHP}-cli php${NEW_PHP}-fpm php${NEW_PHP}-common

# Install the same extensions as on the old PHP, mapped to the new version
# (this is a best-effort: review the resulting package list before confirming)
sudo apt install -y $(dpkg -l | awk '/^ii  php'"${OLD_PHP}"'-/ {print $2}' | sed "s/php${OLD_PHP}/php${NEW_PHP}/g")

# 4. Verify the new CLI is installed
php${NEW_PHP} -v
```

For Apache `mod_php` on Ubuntu/Debian, also install the Apache module:

```bash
sudo apt install -y libapache2-mod-php${NEW_PHP}
```

### RHEL / Alma / Rocky (dnf + Remi repo)

The Remi repository is the de-facto source for up-to-date PHP versions on RHEL-family distributions. The `remi-${NEW_PHP}` module stream provides the new PHP version alongside any system packages.

```bash
# 1. Add the Remi repo (idempotent — adjust the URL for your OS version)
#    Alma/Rocky 9:
sudo dnf install -y https://rpms.remirepo.net/enterprise/remi-release-9.rpm
#    Alma/Rocky 8 / RHEL 8:
# sudo dnf install -y https://rpms.remirepo.net/enterprise/remi-release-8.rpm
#    RHEL 9:
# sudo dnf install -y https://rpms.remirepo.net/enterprise/remi-release-9.rpm

# 2. Reset the PHP module and enable the new Remi stream
sudo dnf module reset php
sudo dnf module enable php:remi-${NEW_PHP}

# 3. Update the PHP packages (this preserves installed extensions, swapping them onto the new ABI)
sudo dnf update "php*" -y

# 4. Verify the new CLI is installed
php -v
```

For Apache `mod_php` on RHEL family, the package is bundled with `php`'s SAPI; no separate module install is required.

## Phase 2 — SAPI swap

Pick the section that matches the SAPI you identified in [Phase 0](#phase-0--discovery--pre-flight).

### Apache mod_php (Ubuntu/Debian)

```bash
# 1. Disable the old PHP module
sudo a2dismod php${OLD_PHP}

# 2. Enable the new PHP module
sudo a2enmod php${NEW_PHP}

# 3. Reload Apache
sudo systemctl restart apache2
```

**Gotcha**: `a2dismod` + `a2enmod` is idempotent. If Apache was already on the new PHP version (e.g., a previous attempt), the commands succeed with a no-op message.

### PHP-FPM (Nginx or Apache)

```bash
# 1. Stop + disable the old FPM pool
sudo systemctl disable --now php${OLD_PHP}-fpm

# 2. Start + enable the new FPM pool
sudo systemctl enable --now php${NEW_PHP}-fpm

# 3. CRITICAL: if the web server config hardcodes the FPM socket path,
#    update it from /run/php/php${OLD_PHP}-fpm.sock to /run/php/php${NEW_PHP}-fpm.sock
#    Common locations:
#      /etc/nginx/sites-enabled/*     (look for "fastcgi_pass unix:")
#      /etc/apache2/sites-enabled/*   (look for "SetHandler proxy:unix:")
#    Then reload:
sudo systemctl reload nginx     # or: sudo systemctl reload apache2
```

**Gotcha**: the default Debian/Ubuntu socket path (`/run/php/php${NEW_PHP}-fpm.sock`) is symlinked by the `php${NEW_PHP}-fpm` package, so most configs "just work" if they use the unversioned path. RHEL family and Nginx configs that hardcode the versioned path need the explicit update.

## Phase 3 — Verification

Confirm the upgrade succeeded **before** re-running the deploy workflow.

### CLI verification

```bash
php -v
# Expect: PHP 8.4.x (cli) ... — must be >= 8.4.1
```

If `php -v` still reports the old version, the new PHP is installed but the `php` command in `$PATH` is still the old one. Fix the alternatives:

```bash
# Ubuntu/Debian: re-link /usr/bin/php to the new version
sudo update-alternatives --set php /usr/bin/php${NEW_PHP}

# RHEL family: the dnf module swap should have updated /usr/bin/php; if not:
sudo ln -sf /usr/bin/php${NEW_PHP} /usr/bin/php
```

### Extension verification

```bash
php -m | sort > /tmp/php-extensions-post-upgrade.txt
diff /tmp/php-extensions-pre-upgrade.txt /tmp/php-extensions-post-upgrade.txt
```

The diff should be empty (same extension set). If a required extension is missing, install it (`apt install php${NEW_PHP}-{name}` or `dnf install php-{name}`) and re-verify. The codebase's `composer.json` `require` section lists the required extensions transitively (via `symfony/http-client`, `open-telemetry/sdk`, `php-http/curl-client`); the most commonly needed set is:

- `curl` (HTTP client)
- `json` (PHP 8+ standard)
- `mbstring` (composer + most web libs)
- `xml` + `dom` (OpenTelemetry SDK + Symfony)
- `openssl` (HTTPS to Google OAuth)
- `pdo` + the matching `pdo_mysql` / `pdo_pgsql` / `pdo_sqlite` driver (database)
- `tokenizer` (PHP 8+ standard)
- `fileinfo` (composer + MIME detection)
- `intl` (optional but recommended for internationalization)
- `bcmath` (optional, needed by some libraries)

### Web verification (PHP-FPM only)

For PHP-FPM, confirm the web request path serves the new PHP version. **Delete the file immediately after the test** — it leaks server configuration to anyone who requests it.

```bash
# 1. Create a temporary info file
echo '<?php echo "PHP " . phpversion();' | sudo tee /var/www/html/info.php

# 2. Curl it from the production server itself
curl -s http://localhost/info.php
# Expect: PHP 8.4.x

# 3. Curl it from your laptop (substitute the production hostname)
curl -s https://<your-production-hostname>/info.php
# Expect: PHP 8.4.x

# 4. DELETE the file — DO NOT leave it on the production server
sudo rm /var/www/html/info.php
```

If the curl reports PHP 8.2.x or returns a 502/503, the SAPI swap in [Phase 2](#phase-2--sapi-swap) didn't take. Re-check the socket path and the web server's reload.

## Phase 4 — Re-run the deploy

The production server's PHP is now on 8.4.1+. Re-run the existing GitHub Actions `Deploy` workflow (or push a commit to `main` to trigger the `on: push: branches: [main]` trigger). Watch the `build:` job's `composer install --no-dev --optimize-autoloader` step — it should succeed against the new PHP (it was already succeeding on the CI runner; the artifact that gets rsync'd to the production server is the same).

The first HTTP request to the freshly-deployed production server is the moment of truth. Smoke-test the critical paths:

- `GET /api/health` (or whatever the health-check endpoint is — see `api/src/Controllers/` for the available controllers)
- `POST /api/auth/login` (the auth flow, exercises the `symfony/http-client` + OpenTelemetry stack)
- One representative business endpoint (e.g., `GET /api/job-applications`)

If any of these returns HTTP 500, **immediately rollback** (see below) and inspect the production server's PHP error log (`/var/log/php${NEW_PHP}-fpm.log` or `/var/log/apache2/error.log`).

## Common failure modes

A short list of the issues that have bitten prior PHP upgrades in production environments, with the corresponding fix.

### 1. Missing extension → FPM returns HTTP 500

**Symptom**: every web request returns 500; the PHP error log shows `Class 'X' not found` (where `X` is a Symfony / OTel / curl class). The CLI (`php -v` + `php -m`) is fine, but the FPM process is missing an extension.

**Root cause**: FPM processes are long-lived; a `php -m` check uses the CLI which may have a different `php.ini`. Check `php-fpm${NEW_PHP} -i | grep -i "loaded configuration"` for the FPM-specific ini path and verify the extension is enabled there.

**Fix**: install the missing extension for the new PHP version (`apt install php${NEW_PHP}-{name}` / `dnf install php-{name}`) and restart the FPM service.

### 2. Socket path not updated → 502 Bad Gateway

**Symptom**: Nginx returns 502; Apache returns 503; the FPM log shows "connection refused" on the old socket path.

**Fix**: update the web server config to point to `/run/php/php${NEW_PHP}-fpm.sock` (or the equivalent for your distro), then `systemctl reload nginx` (or apache2).

### 3. Apache still serving `mod_php` 8.2

**Symptom**: PHP-FPM is on 8.4 but the web requests still report PHP 8.2 (e.g., the `info.php` test from [Phase 3](#phase-3--verification) shows 8.2 even though `php -v` shows 8.4).

**Fix**: `a2dismod php${OLD_PHP} && a2enmod php${NEW_PHP} && systemctl restart apache2`. The `mod_php` and `php-fpm` SAPIs can both be installed at once; Apache picks `mod_php` first unless it's disabled.

### 4. `php-fpm` not restarted after the package install

**Symptom**: `systemctl status php${NEW_PHP}-fpm` shows "active (running)" but the FPM processes are still the old ones (or the new package install did not auto-start the service).

**Fix**: `sudo systemctl restart php${NEW_PHP}-fpm` (a restart, not a reload — the FPM master process needs to spawn new workers with the new binary).

### 5. `symfony/options-resolver` 8.x transitive conflict

**Symptom**: `composer install --dry-run --no-dev` fails with `Your lock file does not contain a compatible set of packages` or `requires php >=8.4.1`.

**Fix**: this is the v2.6.0 + v2.6.2 + v2.6.19 documented issue. The lockfile should already be on the correct version (per v2.6.19). If it isn't, re-resolve: `cd dist/api && composer update symfony/options-resolver --with-dependencies` (but this is a CI-side concern, not a runtime concern — the lockfile is regenerated by the Actions build, not by the production server).

### 6. OpenTelemetry SDK graceful-degradation not triggered

**Symptom**: the production server's logs show `Class "OpenTelemetry\\SDK\\Common\\Attribute\\Attributes" not found` (the OTel SDK was not installed with the new PHP). Per the v2.5.1 graceful-degradation fix, the `LogfireTelemetry` bootstrap should fall back to `ResourceInfoFactory::defaultResource()` and not crash.

**Fix**: if the graceful-degradation is not working (e.g., the FPM process is crashing on init rather than logging the fallback), check that the `open-telemetry/sdk` package is installed: `php -r 'require "/path/to/dist/api/vendor/autoload.php"; var_dump(class_exists("OpenTelemetry\\SDK\\Common\\Attribute\\Attributes"));'` — should print `true`. If it prints `false`, the package was not installed; re-run `composer install --no-dev --optimize-autoloader` on the server (or re-trigger the deploy).

## Rollback plan

If the upgrade causes a regression that cannot be hot-fixed in production, the rollback is the reverse of [Phase 2](#phase-2--sapi-swap). The old PHP packages are still installed (the upgrade does not remove them).

### Apache mod_php rollback

```bash
sudo a2dismod php${NEW_PHP}
sudo a2enmod php${OLD_PHP}
sudo systemctl restart apache2
```

### PHP-FPM rollback

```bash
sudo systemctl disable --now php${NEW_PHP}-fpm
sudo systemctl enable --now php${OLD_PHP}-fpm
# (also revert the socket path in the web server config if it was updated)
sudo systemctl reload nginx    # or apache2
```

### Full rollback to a previous deploy

If the PHP upgrade itself is fine but a `v2.6.19+` deploy triggers a runtime error, the fix is to **revert to the last pre-v2.6.19 tag** (the last deploy that was PHP 8.2-compatible). The deploy workflow's `dist.tar.gz` artifact is the unit of deploy — re-run the workflow against the previous tag to get a PHP 8.2-compatible build.

> **Note**: do NOT downgrade `composer.json` + `composer.lock` to the v2.6.18 floor while keeping the production server on PHP 8.2.19/8.4.1+ — the lockfile is independent of the server's PHP version, but the deploy workflow runs the CI build on PHP 8.4, and the resulting `dist/api/vendor/` is compiled for the 8.4 ABI. The lockfile downgrade is a separate PATCH that would need its own PR.

## References

- **`CHANGELOG.md` `## [2.6.19]` entry** — the GATE note ("Operators MUST upgrade the production server to PHP 8.4.1 or newer BEFORE this release is deployed"). This runbook is the operational answer to that note.
- **`CHANGELOG.md` `## [2.6.2]` entry** — the v2.6.2 composer.json `php: ^8.1` constraint + the `symfony/options-resolver >=8` conflict block. The conflict block was removed in v2.6.19 once the production server was supposed to move to PHP 8.4.
- **`api/composer.json`** — `php: ^8.4.1`, `symfony/http-client: ^8.1` (hard requires PHP 8.4.1), `open-telemetry/sdk: ^1.14` (PHP 8.2+), `open-telemetry/exporter-otlp: ^1.4`, `php-http/curl-client: ^2.4`, `nyholm/psr7: ^1.8`.
- **`.github/workflows/deploy.yml`** — the `build:` job runs on `shivammathur/setup-php@2.37.2` with `php-version: "8.4"`. The deploy artifact is `dist.tar.gz` (a tarball of `dist/api/` with `vendor/` pre-installed). The PHP runtime on the production server is what executes the artifact; the CI build only compiles it.
- **`AGENTS.md` "Contribution Workflow" section** — the "All changes land via a pull request" rule does NOT apply to production server operations. The server is a separate environment; this runbook is the operator's playbook.
- **v2.5.1 `LogfireTelemetry` graceful-degradation fix** — if the OTel SDK is missing on the new PHP install, the bootstrap falls back to `ResourceInfoFactory::defaultResource()` instead of crashing. See `api/src/Telemetry/LogfireTelemetry.php` for the `class_exists(Attributes::class)` gate.
- **PHP 8.4 release notes** — https://www.php.net/releases/8.4/en.php — the deprecations + behavior changes to review before the upgrade (most relevant: implicit nullable parameter deprecation, `E_STRICT` deprecation, `mt_rand` seed behavior, `bcmath` extension changes).

---

**After the upgrade succeeds, update the `## [2.6.19]` CHANGELOG entry with a "GATE CLOSED" cross-reference** — or, more correctly, add a new `## [2.6.X]` PATCH entry (per the AGENTS.md "Do not retroactively edit past entries" rule) that says "production server upgraded to PHP 8.4.X on YYYY-MM-DD per `DOCS/PRODUCTION_PHP_UPGRADE.md`". The CHANGELOG is the audit trail; the runbook is the procedure.
