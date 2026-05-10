#!/bin/bash
#
# Setup script for Git pre-commit hook
# This script installs the pre-commit hook that runs ESLint before each commit
#
SECONDS=0
set -e

echo "🔧 Setting up Git pre-commit hook..."

# Get the directory where this script is located
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
HOOK_DIR="$SCRIPT_DIR/.git/hooks"
HOOK_FILE="$HOOK_DIR/pre-commit"

# Check if .git directory exists
if [ ! -d "$SCRIPT_DIR/.git" ]; then
    echo "❌ Error: .git directory not found. Are you in a Git repository?"
    exit 1
fi

# Create hooks directory if it doesn't exist
if [ ! -d "$HOOK_DIR" ]; then
    echo "📁 Creating .git/hooks directory..."
    mkdir -p "$HOOK_DIR"
fi

# Create the pre-commit hook
cat > "$HOOK_FILE" << 'EOF'
#!/bin/sh
#
# Pre-commit hook to run secret scan, ESLint, build, and tests before committing
# This ensures code quality and prevents build errors and secret leaks in production
#
SECONDS=0
echo "🔐 Scanning for secrets in staged files..."

# Run secret scanner
if [ -f "scripts/scan-secrets.sh" ]; then
  bash scripts/scan-secrets.sh
  SCAN_EXIT_CODE=$?
else
  echo "⚠️  Secret scanner script not found. Skipping secret scan."
  SCAN_EXIT_CODE=0
fi

if [ $SCAN_EXIT_CODE -ne 0 ]; then
  echo ""
  echo "❌ Secret scan failed. Please remove exposed secrets before committing."
  exit 1
fi

echo "✅ Secret scan passed!"
echo ""
echo "🔍 Running ESLint before commit..."

# Run ESLint
npm run lint
ESLINT_EXIT_CODE=$?

if [ $ESLINT_EXIT_CODE -ne 0 ]; then
  echo ""
  echo "❌ ESLint found errors. Please fix them before committing."
  echo "💡 Tip: Run 'npm run lint:fix' to automatically fix some issues."
  exit 1
fi

echo "✅ ESLint passed!"
echo ""
echo "🔨 Running build..."

# Run build
npm run build
BUILD_EXIT_CODE=$?

if [ $BUILD_EXIT_CODE -ne 0 ]; then
  echo ""
  echo "❌ Build failed. Please fix the errors before committing."
  exit 1
fi

echo "✅ Build passed!"
echo ""
echo "🧹 Cleaning dist folder..."

# Remove dist folder (just to verify build works)
if [ -d "dist" ]; then
  rm -rf dist
  echo "✅ Dist folder removed."
else
  echo "⚠️  Dist folder not found (this is okay)."
fi

echo ""
echo "🧪 Running tests..."

# Run tests
npm run test
TEST_EXIT_CODE=$?

if [ $TEST_EXIT_CODE -ne 0 ]; then
  echo ""
  echo "❌ Tests failed. Please fix the failing tests before committing."
  exit 1
fi

echo ""
echo "✅ All checks passed! Proceeding with commit..."

seconds=$SECONDS
ELAPSED="Elapsed: $(($seconds / 3600))hrs $((($seconds / 60) % 60))min $(($seconds % 60))sec"

echo "✅ Pre-commit checks completed in $ELAPSED!"
exit 0
EOF

# Make the hook executable
chmod +x "$HOOK_FILE"

echo "✅ Pre-commit hook installed successfully!"
echo ""
echo "📝 The hook will now run the following before each commit:"
echo "   1. ESLint (code quality)"
echo "   2. Build (verify compilation)"
echo "   3. Clean dist folder"
echo "   4. Tests (verify functionality)"
echo ""
echo "💡 To bypass the hook (not recommended), use: git commit --no-verify"
echo ""

seconds=$SECONDS
ELAPSED="Elapsed: $(($seconds / 3600))hrs $((($seconds / 60) % 60))min $(($seconds % 60))sec"

echo "✅ Hook setup completed in $ELAPSED!"
echo "🚀 Ready to code with confidence!"
