#!/bin/sh
set -eu

cd "$(dirname "$0")/.."

rm -rf dist
mkdir -p dist

for item in *.html *.css *.js CNAME robots.txt sitemap.xml favicon.ico manifest.webmanifest; do
  if [ -e "$item" ]; then
    cp "$item" dist/
  fi
done

if [ -d assets ]; then
  cp -R assets dist/assets
  find dist -name '.DS_Store' -exec rm -f {} +
fi

touch dist/.nojekyll
