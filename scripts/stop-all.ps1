# Enterprise Chat - 1-Click Shutdown Script
$ErrorActionPreference = "Continue"

Write-Host "`n🛑 [1/2] Dừng các tiến trình Node (Port 3000 & 4000)..." -ForegroundColor Yellow

$p4000 = Get-NetTCPConnection -LocalPort 4000 -State Listen -ErrorAction SilentlyContinue
if ($p4000) {
    Stop-Process -Id $p4000.OwningProcess -Force -ErrorAction SilentlyContinue
    Write-Host "   Đã dừng Backend Server (PID $($p4000.OwningProcess))" -ForegroundColor Green
}

$p3000 = Get-NetTCPConnection -LocalPort 3000 -State Listen -ErrorAction SilentlyContinue
if ($p3000) {
    Stop-Process -Id $p3000.OwningProcess -Force -ErrorAction SilentlyContinue
    Write-Host "   Đã dừng Web Client (PID $($p3000.OwningProcess))" -ForegroundColor Green
}

Write-Host "`n🛑 [2/2] Dừng các container Docker..." -ForegroundColor Yellow
docker compose down
Write-Host "✅ Toàn bộ hệ thống Enterprise Chat đã được dừng an toàn.`n" -ForegroundColor Green
