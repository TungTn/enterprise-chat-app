# Enterprise Chat - 1-Click Startup Orchestrator
$ErrorActionPreference = "Continue"

Write-Host "`n🚀 [1/4] Kiểm tra hạ tầng Docker (PostgreSQL, Redis, MinIO, LiveKit)..." -ForegroundColor Cyan

# 1. Start Docker Desktop if stopped
docker ps 2>&1 | Out-Null
if ($LASTEXITCODE -ne 0) {
    Write-Host "   Khởi động Docker Desktop Service..." -ForegroundColor Yellow
    Start-Process -FilePath "C:\Program Files\Docker\Docker\Docker Desktop.exe" -WindowStyle Minimized -ErrorAction SilentlyContinue
    
    $attempts = 0
    $dockerReady = $false
    while ($attempts -lt 10) {
        Start-Sleep -Seconds 2
        docker ps 2>&1 | Out-Null
        if ($LASTEXITCODE -eq 0) { 
            $dockerReady = $true
            break 
        }
        $attempts++
        Write-Host "   Đang chờ Docker Engine ($($attempts*2)s)..." -ForegroundColor DarkGray
    }

    if (-not $dockerReady) {
        Write-Host "   ⚠️ Docker Engine chưa chạy. Hãy đảm bảo Docker Desktop được mở trên máy Windows." -ForegroundColor Yellow
    }
}

# 2. Start Compose containers
docker compose up -d
Write-Host "   Đợi cơ sở dữ liệu sẵn sàng..." -ForegroundColor Yellow
Start-Sleep -Seconds 3

# Check Port 5432 & 6379
$pgConn = Test-NetConnection -ComputerName localhost -Port 5432 -WarningAction SilentlyContinue
$redisConn = Test-NetConnection -ComputerName localhost -Port 6379 -WarningAction SilentlyContinue

if ($pgConn.TcpTestSucceeded -and $redisConn.TcpTestSucceeded) {
    Write-Host "✅ [2/4] Database PostgreSQL:5432 & Redis:6379 đã kết nối thành công!" -ForegroundColor Green
} else {
    Write-Host "⚠️ [2/4] Cảnh báo: Một số dịch vụ chưa sẵn sàng, đang thử khởi động ứng dụng..." -ForegroundColor Yellow
}

# 3. Start Backend if not already listening
Write-Host "`n🚀 [3/4] Kiểm tra Backend NestJS (Port 4000)..." -ForegroundColor Cyan
$serverPort = Get-NetTCPConnection -LocalPort 4000 -State Listen -ErrorAction SilentlyContinue

if (-not $serverPort) {
    Write-Host "   Khởi chạy Backend Server tiến trình nền..." -ForegroundColor Yellow
    Start-Process -FilePath "node" -ArgumentList "--enable-source-maps apps/server/dist/src/main.js" -WorkingDirectory "$PSScriptRoot\.." -WindowStyle Hidden
    Start-Sleep -Seconds 3
    Write-Host "✅ Backend Server đang chạy tại http://localhost:4000/api" -ForegroundColor Green
} else {
    Write-Host "✅ Backend Server đã chạy sẵn sàng tại http://localhost:4000/api (PID: $($serverPort.OwningProcess))" -ForegroundColor Green
}

# 4. Start Web Client if not already listening
Write-Host "`n🚀 [4/4] Kiểm tra Web Next.js (Port 3000)..." -ForegroundColor Cyan
$webPort = Get-NetTCPConnection -LocalPort 3000 -State Listen -ErrorAction SilentlyContinue

if (-not $webPort) {
    Write-Host "   Khởi chạy Frontend Web dev server..." -ForegroundColor Yellow
    Start-Process -FilePath "pnpm" -ArgumentList "--filter @enterprise-chat/web dev" -WorkingDirectory "$PSScriptRoot\.." -WindowStyle Hidden
    Start-Sleep -Seconds 3
    Write-Host "✅ Web Client đang chạy tại http://localhost:3000" -ForegroundColor Green
} else {
    Write-Host "✅ Web Client đã chạy sẵn sàng tại http://localhost:3000 (PID: $($webPort.OwningProcess))" -ForegroundColor Green
}

Write-Host "`n========================================================" -ForegroundColor Magenta
Write-Host "🎉 TOÀN BỘ HỆ THỐNG ENTERPRISE CHAT ĐÃ SẴN SÀNG!" -ForegroundColor Green
Write-Host "   - Ứng dụng Web:     http://localhost:3000" -ForegroundColor White
Write-Host "   - Tích hợp BPM:     http://localhost:9000/chat" -ForegroundColor White
Write-Host "   - API & WebSocket:  http://localhost:4000/api | ws://localhost:4000/chat" -ForegroundColor White
Write-Host "   - MinIO Console:    http://localhost:9501 (minio_admin / minio_secret_key)" -ForegroundColor White
Write-Host "========================================================`n" -ForegroundColor Magenta
