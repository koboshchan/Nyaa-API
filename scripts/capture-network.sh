#!/bin/sh
set -eu
mkdir -p research/network
curl -v --max-time 45 'https://nyaaapi.onrender.com/nyaa?q=ubuntu&category=software&sub_category=applications&sort=seeders&order=desc&page=1' -o research/network/original-search.json 2>research/network/original-search.trace
curl -v --max-time 45 'https://nyaa.si/?f=0&c=6_1&q=ubuntu&s=seeders&o=desc&p=1' -o research/network/upstream-search.html 2>research/network/upstream-search.trace
curl -v --max-time 45 'https://nyaaapi.onrender.com/nyaa?page=abc' -o research/network/original-validation.json 2>research/network/original-validation.trace
curl -v --max-time 45 'https://nyaa.si/?f=0&c=6_1&q=ubuntu&s=seeders&o=desc&p=2' -o research/network/upstream-page2.html 2>research/network/upstream-page2.trace
