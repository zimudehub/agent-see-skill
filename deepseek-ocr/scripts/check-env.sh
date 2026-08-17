#!/usr/bin/env sh
# agent-see-skill environment check
# Detects Python 3 (needed by skill-installer) and Node.js >= 18 (needed to run
# scripts/ocr.mjs). Prints per-OS install guidance for missing tools.
# Exit code 0 when all checks pass, 1 when anything is missing.

set -u

pass=0
fail=0

say_pass() { printf '[PASS] %s\n' "$1"; }
say_fail() { printf '[FAIL] %s\n' "$1"; }

detect_os() {
  case "$(uname -s)" in
    Darwin) echo macos ;;
    Linux) echo linux ;;
    MINGW*|MSYS*|CYGWIN*) echo windows ;;
    *) echo other ;;
  esac
}

os=$(detect_os)

echo "=== agent-see-skill environment check ==="
echo

# --- Python 3 (installation only) ---
if command -v python3 >/dev/null 2>&1; then
  py_ver=$(python3 --version 2>&1 | sed -E 's/^Python //')
  say_pass "python3: $py_ver"
  pass=$((pass + 1))
else
  say_fail "python3: not found (needed by skill-installer)"
  fail=$((fail + 1))
fi

# --- Node.js >= 18 (runtime) ---
if command -v node >/dev/null 2>&1; then
  node_ver=$(node --version 2>&1 | sed 's/^v//')
  node_major=$(printf '%s' "$node_ver" | cut -d. -f1)
  if [ "${node_major:-0}" -ge 18 ] 2>/dev/null; then
    say_pass "node: v$node_ver (>= 18 required)"
    pass=$((pass + 1))
  else
    say_fail "node: v$node_ver (need >= 18, current is too old)"
    fail=$((fail + 1))
  fi
else
  say_fail "node: not found (needed by scripts/ocr.mjs)"
  fail=$((fail + 1))
fi

echo
if [ "$fail" -eq 0 ]; then
  echo "All required tools are installed. Ready to run. ($pass/$pass checks passed)"
  exit 0
fi

echo "Missing tools. Install them first:"
echo
case "$os" in
  macos)
    echo "## macOS (Homebrew)"
    echo "  brew install node          # Node.js >= 18"
    echo "  brew install python@3      # Python 3 (or: xcode-select --install)"
    ;;
  linux)
    echo "## Linux (Debian/Ubuntu)"
    echo "  sudo apt-get update && sudo apt-get install -y python3"
    echo "  curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash - && sudo apt-get install -y nodejs"
    echo "## Linux (Fedora/RHEL)"
    echo "  sudo dnf install -y python3 nodejs"
    ;;
  windows)
    echo "## Windows (winget, run in PowerShell)"
    echo "  winget install Python.Python.3.12"
    echo "  winget install OpenJS.NodeJS.LTS"
    echo "Alternative: download installers from https://nodejs.org and https://www.python.org/downloads/"
    echo "Note: in PowerShell the Python command is usually 'python' (not 'python3')."
    ;;
  *)
    echo "Install Node.js >= 18 and Python 3 from https://nodejs.org and https://www.python.org/downloads/"
    ;;
esac
echo
echo "After installing, re-run this check: bash $0"
exit 1
