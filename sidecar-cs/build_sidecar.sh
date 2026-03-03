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

# --- macOS: bundle libtiff and its dependencies ---
if [[ "$RID" == osx-* ]]; then
    echo ""
    echo "Bundling libtiff and dependencies for macOS..."

    DYLIBS=(
        "libtiff.6.dylib"
        "libzstd.1.dylib"
        "liblzma.5.dylib"
        "libjpeg.8.dylib"
    )

    # Find Homebrew lib directory
    BREW_LIB=""
    for candidate in /opt/homebrew/lib /usr/local/lib; do
        if [ -f "$candidate/libtiff.6.dylib" ]; then
            BREW_LIB="$candidate"
            break
        fi
    done

    if [ -z "$BREW_LIB" ]; then
        echo "Warning: Homebrew libtiff not found — TIFF support will rely on system libs at runtime"
    else
        echo "Found Homebrew libs in: $BREW_LIB"

        for dylib in "${DYLIBS[@]}"; do
            src="$BREW_LIB/$dylib"
            if [ ! -f "$src" ]; then
                echo "  Warning: $src not found, skipping"
                continue
            fi
            cp "$src" "dist/$dylib"
            echo "  Copied $dylib"
        done

        # Rewrite libtiff's references to its dependencies to use @loader_path
        if [ -f "dist/libtiff.6.dylib" ]; then
            # Fix the install name of libtiff itself
            install_name_tool -id "@loader_path/libtiff.6.dylib" "dist/libtiff.6.dylib"

            # Rewrite references to dependencies
            for dep in libzstd.1.dylib liblzma.5.dylib libjpeg.8.dylib; do
                # Find the current reference path (could be Homebrew absolute path)
                current=$(otool -L "dist/libtiff.6.dylib" | grep "$dep" | awk '{print $1}' || true)
                if [ -n "$current" ] && [ "$current" != "@loader_path/$dep" ]; then
                    install_name_tool -change "$current" "@loader_path/$dep" "dist/libtiff.6.dylib"
                    echo "  Rewrote libtiff ref: $dep"
                fi
            done

            # Fix install names for the dependency dylibs themselves
            for dep in libzstd.1.dylib liblzma.5.dylib libjpeg.8.dylib; do
                if [ -f "dist/$dep" ]; then
                    install_name_tool -id "@loader_path/$dep" "dist/$dep"
                fi
            done
        fi

        # Ad-hoc codesign all bundled dylibs
        for dylib in "${DYLIBS[@]}"; do
            if [ -f "dist/$dylib" ]; then
                codesign --force --sign - "dist/$dylib"
                echo "  Signed $dylib"
            fi
        done

        echo "libtiff bundling complete."
    fi
fi
