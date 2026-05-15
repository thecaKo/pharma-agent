#!/usr/bin/env sh
set -eu

ROOT_DIR="$(CDPATH= cd -- "$(dirname -- "$0")/../.." && pwd)"
OUT_DIR="${1:-$ROOT_DIR/packaging/windows/transfer}"

rm -rf "$OUT_DIR"
mkdir -p "$OUT_DIR"

cp -R "$ROOT_DIR/package.json" "$OUT_DIR/"
cp -R "$ROOT_DIR/package-lock.json" "$OUT_DIR/"
cp -R "$ROOT_DIR/tsconfig.json" "$OUT_DIR/"
cp -R "$ROOT_DIR/src" "$OUT_DIR/"
cp -R "$ROOT_DIR/README.md" "$OUT_DIR/"
cp -R "$ROOT_DIR/packaging" "$OUT_DIR/"

if [ -f "$ROOT_DIR/dist/index.js" ]; then
  mkdir -p "$OUT_DIR/dist"
  cp -R "$ROOT_DIR/dist/." "$OUT_DIR/dist/"
fi

cat > "$OUT_DIR/BUILD-WINDOWS.txt" <<'EOF'
Windows build steps:
1. Put WinSW.exe in packaging/windows/bin/WinSW.exe
2. Open PowerShell in this folder
3. Run: npm ci --omit=dev
4. Run: npm run build
5. Run: powershell -ExecutionPolicy Bypass -File packaging/windows/build.ps1
6. Compile packaging/windows/inno/pharma-agent.iss in Inno Setup
EOF

printf '%s\n' "Transfer package created at: $OUT_DIR"

