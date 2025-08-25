#!/bin/bash

# TruePal Deployment Verification Script
# Run this on your VPS to verify everything is working

echo "🔍 TruePal Deployment Verification"
echo "=================================="

VPS_HOST="157.180.116.88"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

print_check() {
    if [ $2 -eq 0 ]; then
        echo -e "${GREEN}✅ $1${NC}"
    else
        echo -e "${RED}❌ $1${NC}"
    fi
}

print_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

echo ""
echo "🗂️  DIRECTORY STRUCTURE:"
echo "========================"
print_info "Backend directory:"
ls -la /opt/truepal/backend/ 2>/dev/null || echo "❌ /opt/truepal/backend/ not found"

print_info "Frontend directory:"
ls -la /var/www/truepal/dist/ | head -5 2>/dev/null || echo "❌ /var/www/truepal/dist/ not found"

print_info "Log directory:"
ls -la /var/log/truepal/ 2>/dev/null || echo "❌ /var/log/truepal/ not found"

echo ""
echo "🔧 PROCESSES:"
echo "============="
print_info "Java processes:"
ps aux | grep java | grep -v grep || echo "No Java processes running"

print_info "Nginx status:"
sudo systemctl is-active nginx
print_check "Nginx service active" $?

echo ""
echo "🌐 NETWORK TESTS:"
echo "=================="

# Test frontend
curl -s -o /dev/null -w "%{http_code}" http://localhost/ > /tmp/frontend_status
FRONTEND_STATUS=$(cat /tmp/frontend_status)
print_check "Frontend accessible (HTTP $FRONTEND_STATUS)" $([ "$FRONTEND_STATUS" = "200" ] && echo 0 || echo 1)

# Test nginx health
curl -s -o /dev/null -w "%{http_code}" http://localhost/health > /tmp/health_status
HEALTH_STATUS=$(cat /tmp/health_status)
print_check "Health endpoint (HTTP $HEALTH_STATUS)" $([ "$HEALTH_STATUS" = "200" ] && echo 0 || echo 1)

# Test backend API
curl -s -o /dev/null -w "%{http_code}" http://localhost:8080/health > /tmp/api_status
API_STATUS=$(cat /tmp/api_status)
print_check "Backend API (HTTP $API_STATUS)" $([ "$API_STATUS" = "200" ] && echo 0 || echo 1)

# Test backend through nginx proxy
curl -s -o /dev/null -w "%{http_code}" http://localhost/api/health > /tmp/proxy_status
PROXY_STATUS=$(cat /tmp/proxy_status)
print_check "Backend through nginx proxy (HTTP $PROXY_STATUS)" $([ "$PROXY_STATUS" = "200" ] && echo 0 || echo 1)

echo ""
echo "📄 CONFIGURATION:"
echo "=================="

print_info "Nginx configuration test:"
sudo nginx -t
print_check "Nginx configuration valid" $?

print_info "Active nginx sites:"
ls -la /etc/nginx/sites-enabled/

echo ""
echo "📊 SYSTEM STATUS:"
echo "=================="

print_info "Disk usage of deployment directories:"
du -sh /opt/truepal/ /var/www/truepal/ /var/log/truepal/ 2>/dev/null

print_info "Memory usage:"
free -h | head -2

echo ""
echo "🔗 ACCESS URLS:"
echo "==============="
echo "🌐 Frontend:     http://$VPS_HOST"
echo "🔗 Backend API:  http://$VPS_HOST/api"
echo "❤️  Health:      http://$VPS_HOST/health"
echo "📊 API Health:   http://$VPS_HOST/api/health"

echo ""
echo "🧪 QUICK TESTS:"
echo "==============="
echo "Run these commands to test your deployment:"
echo "  curl http://$VPS_HOST/health"
echo "  curl http://$VPS_HOST/api/health"
echo "  curl http://$VPS_HOST/"

echo ""
echo "📝 LOGS:"
echo "========"
print_info "Recent backend logs (last 5 lines):"
tail -5 /var/log/truepal/backend.log 2>/dev/null || echo "No backend logs found"

print_info "Recent nginx error logs (last 3 lines):"
sudo tail -3 /var/log/nginx/error.log 2>/dev/null || echo "No nginx error logs"

echo ""
echo "🎯 DEPLOYMENT STATUS SUMMARY:"
echo "=============================="

# Overall status
if [ "$FRONTEND_STATUS" = "200" ] && [ "$API_STATUS" = "200" ] && [ "$HEALTH_STATUS" = "200" ]; then
    echo -e "${GREEN}🎉 DEPLOYMENT SUCCESSFUL! All services are running properly.${NC}"
elif [ "$FRONTEND_STATUS" = "200" ] && [ "$HEALTH_STATUS" = "200" ]; then
    echo -e "${YELLOW}⚠️  PARTIAL SUCCESS: Frontend working, backend needs attention.${NC}"
elif [ "$HEALTH_STATUS" = "200" ]; then
    echo -e "${YELLOW}⚠️  PARTIAL SUCCESS: Basic health check working, apps need attention.${NC}"
else
    echo -e "${RED}❌ DEPLOYMENT ISSUES: Multiple services not responding.${NC}"
fi

# Cleanup
rm -f /tmp/frontend_status /tmp/health_status /tmp/api_status /tmp/proxy_status