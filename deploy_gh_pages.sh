#!/usr/bin/env bash

set -e

git fetch
git checkout gh-pages
git pull origin gh-pages

git merge origin/master --commit --stat

npm run build

git add bundle.js
git commit

git push origin gh-pages

git checkout -

