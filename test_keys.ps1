# Test API script to check setPublicKey endpoint
$ErrorActionPreference = "Continue"

# First, register a new test user
$registerBody = @{
    fullName = "API Test User"
    email = "apikeytest" + (Get-Random) + "@test.com"
    number = "9800000009"
    dateOfBirth = "2000-01-01"
    gender = "male"
    password = "test123"
} | ConvertTo-Json

Write-Host "Testing registration..."
try {
    $registerResponse = Invoke-RestMethod -Method Post -Uri "http://localhost:8000/api/signup" -ContentType "application/json" -Body $registerBody
    Write-Host "Registration successful. User ID: $($registerResponse.userId)"
    $token = $registerResponse.token
    $userId = $registerResponse.userId
    
    # Now test setting public key directly
    Write-Host "Testing setPublicKey..."
    $keyBody = @{
        publicKey = "test-public-key-data-12345"
    } | ConvertTo-Json
    
    $keyResponse = Invoke-RestMethod -Method Put -Uri "http://localhost:8000/api/users/$userId/keys" -ContentType "application/json" -Body $keyBody -Headers @{"Authorization"="Bearer $token"}
    Write-Host "Key set response: $($keyResponse | ConvertTo-Json)"
    
    # Verify
    Write-Host "Verifying public key..."
    $verifyResponse = Invoke-RestMethod -Method Get -Uri "http://localhost:8000/api/users/public-key/$userId"
    Write-Host "Public key: $($verifyResponse.publicKey)"
    
} catch {
    Write-Host "Error: $_"
    Write-Host "Details: $($_.Exception.Response)"
}
