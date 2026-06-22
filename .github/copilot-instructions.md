## CVE Lite CLI

Run `cve-lite . --json` in the project root. The results are saved to `cve-lite-scan-<timestamp>.json` in the current directory.

### Getting scan data

Key fields in each finding:

- `package`, `version` — the vulnerable package
- `severity` — `critical | high | medium | low | unknown`
- `relationship` — `direct | transitive`
- `firstFixedVersion` — minimum safe version, if known
- `runnableFixCommand` — exact install command to run, if available
- `recommendedAction` — human-readable fix guidance
- `cves` — CVE IDs
- `dependencyPaths` — chains showing how the package is pulled in
- `usage.imported` — whether the package is actually imported in source files

Top-level `suggestedFixCommands` contains grouped, copy-ready fix commands.

### Prioritization

1. Critical before high before medium before low
2. Direct dependencies before transitive
3. If `usage.imported === false`, flag as lower practical risk but do not dismiss
4. If `runnableFixCommand` is present, that is the exact command to run — prefer it over manual guidance

### Codebase analysis

- Cross-reference vulnerable packages against source file imports to confirm reachability
- Check `package.json` version constraints for direct dependency findings
- Use `dependencyPaths` to trace transitive chains and identify which parent package to upgrade
- Look for patterns: a single parent responsible for multiple transitive findings (fixing the parent clears all of them)

### Output

Produce:
- A prioritized list of findings with their fix commands
- For each finding: severity, direct/transitive, imported/unused, recommended action
- Any patterns worth highlighting (one parent causing multiple transitive issues)
- A summary of what remains after the suggested fix commands are applied
