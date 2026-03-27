#!/bin/bash

# RBAMS API Demo Script
# This script demonstrates how to use the RBAMS API

BASE_URL="http://localhost:3000"
ADMIN_TOKEN=""
USER_TOKEN=""

echo "========================================="
echo "RBAMS - API Demo Script"
echo "========================================="
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to print section
print_section() {
    echo -e "\n${YELLOW}>>> $1${NC}\n"
}

# Check if server is running
print_section "Health Check"
curl -s "$BASE_URL/health" | jq '.' || echo "Server is not running. Start it with: npm start"

# Note: The following endpoints require authentication
print_section "Notes:"
echo "1. Create admin user first via database seeding or direct API call"
echo "2. Login to get JWT token"
echo "3. Use token in Authorization header for all requests"
echo "4. Use X-Required-Role header for role-based access control"
echo ""

echo "========================================="
echo "Example Requests:"
echo "========================================="
echo ""

echo "1. GET /api/admin/users (list all users)"
echo "   curl -X GET http://localhost:3000/api/admin/users \\"
echo "     -H \"Authorization: Bearer <JWT_TOKEN>\" \\"
echo "     -H \"X-Required-Role: admin\""
echo ""

echo "2. POST /api/admin/users (create user)"
echo "   curl -X POST http://localhost:3000/api/admin/users \\"
echo "     -H \"Authorization: Bearer <JWT_TOKEN>\" \\"
echo "     -H \"Content-Type: application/json\" \\"
echo "     -d '{\"name\":\"John\",\"email\":\"john@example.com\",\"password\":\"123456\",\"role\":\"user\"}'"
echo ""

echo "3. GET /api/user/me (get current user)"
echo "   curl -X GET http://localhost:3000/api/user/me \\"
echo "     -H \"Authorization: Bearer <JWT_TOKEN>\""
echo ""

echo "4. PUT /api/user/me (update profile)"
echo "   curl -X PUT http://localhost:3000/api/user/me \\"
echo "     -H \"Authorization: Bearer <JWT_TOKEN>\" \\"
echo "     -H \"Content-Type: application/json\" \\"
echo "     -d '{\"name\":\"John Doe\"}'"
echo ""

echo "========================================="
