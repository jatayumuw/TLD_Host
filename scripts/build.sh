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
  mkdir -p dist/assets
  grep -rohE 'assets/[A-Za-z0-9_./-]+' dist/*.html dist/*.css dist/*.js \
    | sort -u \
    | while IFS= read -r rel_path; do
        if [ -f "$rel_path" ]; then
          cp "$rel_path" "dist/$rel_path"
        fi
      done
fi

if [ -d team ]; then
  cp -R team dist/team
  find dist/team -name '.DS_Store' -exec rm -f {} +
fi

touch dist/.nojekyll
