#!/usr/bin/env bash

set -e

git fetch
git checkout gh-pages
git pull origin gh-pages

git merge origin/master --commit --stat

webpack -p

cp dist/bundle.js bundle.js

git add bundle.js
git commit

git push origin gh-pages

git checkout -

