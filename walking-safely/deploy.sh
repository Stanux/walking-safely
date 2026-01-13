#!/bin/bash
# Deploy script for Walking Safely Backend
# Run this on the VPS to update and restart the application

set -e

echo "🚀 Starting deployment..."

# Navigate to project directory
cd /var/www/walking-safely

# Pull latest changes
echo "📥 Pulling latest changes from git..."
git pull origin main

# Install/update composer dependencies
echo "📦 Installing composer dependencies..."
docker exec walking-safely-laravel.test-1 composer install --no-dev --optimize-autoloader

# Run migrations
echo "🗄️ Running database migrations..."
docker exec walking-safely-laravel.test-1 php artisan migrate --force

# Clear and rebuild caches
echo "🧹 Clearing caches..."
docker exec walking-safely-laravel.test-1 php artisan config:clear
docker exec walking-safely-laravel.test-1 php artisan route:clear
docker exec walking-safely-laravel.test-1 php artisan view:clear
docker exec walking-safely-laravel.test-1 php artisan cache:clear

# Rebuild caches for production
echo "⚡ Rebuilding caches..."
docker exec walking-safely-laravel.test-1 php artisan config:cache
docker exec walking-safely-laravel.test-1 php artisan route:cache
docker exec walking-safely-laravel.test-1 php artisan view:cache

echo "✅ Deployment completed successfully!"
