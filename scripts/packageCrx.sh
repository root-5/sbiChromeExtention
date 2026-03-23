#!/usr/bin/env bash
set -euo pipefail

scriptDir="$(cd "$(dirname "$0")" && pwd)"
repoRoot="$(cd "$scriptDir/.." && pwd)"
packageName="sbiChromeExtention"
outputDir="$repoRoot/dist"
chromeBin="${CHROME_BIN:-}"

if [[ -z "$chromeBin" ]]; then
    for candidate in google-chrome google-chrome-stable chromium chromium-browser; do
        if command -v "$candidate" >/dev/null 2>&1; then
            chromeBin="$candidate"
            break
        fi
    done
fi

if [[ -z "$chromeBin" ]]; then
    echo "Chrome 系ブラウザが見つかりません。CHROME_BIN 環境変数で実行ファイルを指定してください。" >&2
    exit 1
fi

mkdir -p "$outputDir"

workDir="$(mktemp -d)"
cleanup() {
    rm -rf "$workDir"
}
trap cleanup EXIT

stagingDir="$workDir/$packageName"

# パッケージ対象だけを一時ディレクトリに複製し、生成物や秘密鍵が再帰的に混入しないようにする。
rsync -a \
    --exclude '.git/' \
    --exclude 'dist/' \
    --exclude '.keys/' \
    --exclude '.DS_Store' \
    "$repoRoot/" "$stagingDir/"

"$chromeBin" --no-message-box --pack-extension="$stagingDir"

mv -f "$workDir/$packageName.crx" "$outputDir/$packageName.crx"

echo "CRX を生成しました: $outputDir/$packageName.crx"
