# RBAMS API Test Script

Write-Host "=========================================" -ForegroundColor Cyan
Write-Host "RBAMS - API Test Script" -ForegroundColor Cyan
Write-Host "=========================================" -ForegroundColor Cyan
Write-Host ""

$BASE_URL = "http://localhost:3000"

# Test 1: Health Check
Write-Host "1. Testing Health Endpoint..." -ForegroundColor Yellow
$response = Invoke-WebRequest -Uri "$BASE_URL/health" -Method Get -UseBasicParsing
Write-Host "✓ Status: " $response.StatusCode -ForegroundColor Green
Write-Host $response.Content | ConvertFrom-Json | ConvertTo-Json
Write-Host ""

# Test 2: Login
Write-Host "2. Testing Login..." -ForegroundColor Yellow
$loginBody = @{
    email = "admin@example.com"
    password = "admin123"
} | ConvertTo-Json

$loginResponse = Invoke-WebRequest -Uri "$BASE_URL/api/user/login" -Method Post -Body $loginBody -ContentType "application/json" -UseBasicParsing
$loginData = $loginResponse.Content | ConvertFrom-Json
Write-Host "✓ Status: " $loginResponse.StatusCode -ForegroundColor Green
Write-Host "Token: " $loginData.data.token.Substring(0, 20) "..." -ForegroundColor Green
Write-Host ""

# Save token for next requests
$TOKEN = $loginData.data.token

# Test 3: Get current user
Write-Host "3. Testing Get Current User..." -ForegroundColor Yellow
$headers = @{
    "Authorization" = "Bearer $TOKEN"
}
$userResponse = Invoke-WebRequest -Uri "$BASE_URL/api/user/me" -Method Get -Headers $headers -UseBasicParsing
Write-Host "✓ Status: " $userResponse.StatusCode -ForegroundColor Green
$userResponse.Content | ConvertFrom-Json | ConvertTo-Json
Write-Host ""

# Test 4: Get all users (admin)
Write-Host "4. Testing Get All Users (Admin Endpoint)..." -ForegroundColor Yellow
$headers = @{
    "Authorization" = "Bearer $TOKEN"
    "X-Required-Role" = "admin"
}
$usersResponse = Invoke-WebRequest -Uri "$BASE_URL/api/admin/users" -Method Get -Headers $headers -UseBasicParsing
Write-Host "✓ Status: " $usersResponse.StatusCode -ForegroundColor Green
$usersData = $usersResponse.Content | ConvertFrom-Json
Write-Host "Total Users: " $usersData.data.pagination.total -ForegroundColor Green
Write-Host ""

# Test 5: Get Dashboard Stats
Write-Host "5. Testing Dashboard Stats..." -ForegroundColor Yellow
$dashboardResponse = Invoke-WebRequest -Uri "$BASE_URL/api/admin/dashboard" -Method Get -Headers $headers -UseBasicParsing
Write-Host "✓ Status: " $dashboardResponse.StatusCode -ForegroundColor Green
$dashboardResponse.Content | ConvertFrom-Json | ConvertTo-Json
Write-Host ""

Write-Host "=========================================" -ForegroundColor Green
Write-Host "✓ All tests completed successfully!" -ForegroundColor Green
Write-Host "=========================================" -ForegroundColor Green
