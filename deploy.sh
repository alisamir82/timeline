#!/bin/bash
set -e

echo "Building production assets..."
cd /root/projects/timeline
npm run build

echo "Deploying to /var/www/timeline..."
rm -rf /var/www/timeline/*
cp -r dist/* /var/www/timeline/

echo "Reloading nginx..."
systemctl reload nginx

echo "Done! App is live."
