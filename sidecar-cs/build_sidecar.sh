#!/usr/bin/env bash
set -euo pipefail

# Auto-detect RID for the current platform
case "$(uname -s)" in
    Darwin)
        case "$(uname -m)" in
            arm64) RID="osx-arm64" ;;
            *)     RID="osx-x64" ;;
        esac
        ;;
    Linux)
        case "$(uname -m)" in
            aarch64) RID="linux-arm64" ;;
            *)       RID="linux-x64" ;;
        esac
        ;;
    MINGW*|MSYS*|CYGWIN*)
        RID="win-x64"
        ;;
    *)
        echo "Unsupported platform: $(uname -s)" >&2
        exit 1
        ;;
esac

echo "Building C# sidecar for ${RID}..."

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$SCRIPT_DIR"

dotnet publish \
    -c Release \
    -r "$RID" \
    --self-contained \
    -p:PublishAot=true \
    -o dist/

# Report the built binary
if [ -f "dist/easyimagegrid-sidecar.exe" ]; then
    BINARY="dist/easyimagegrid-sidecar.exe"
else
    BINARY="dist/easyimagegrid-sidecar"
fi

echo "Build complete: ${BINARY}"
ls -lh "$BINARY"
