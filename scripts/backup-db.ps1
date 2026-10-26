<#
.SYNOPSIS
  Automated PostgreSQL & MinIO backup script for Enterprise Chat.
#>
param(
  [string]$BackupDir = "./backups",
  [string]$ContainerName = "enterprise_chat_postgres",
  [string]$DbUser = "chat_admin",
  [string]$DbName = "enterprise_chat"
)

$timestamp = Get-Date -Format "yyyyMMdd_HHmmss"
if (!(Test-Path $BackupDir)) {
  New-Item -ItemType Directory -Path $BackupDir | Out-Null
}

$dumpFile = "$BackupDir/backup_${DbName}_$timestamp.sql.gz"
Write-Host "📦 Starting backup of $DbName to $dumpFile..." -ForegroundColor Cyan

docker exec -t $ContainerName pg_dump -U $DbUser -d $DbName | gzip > $dumpFile

if ($LASTEXITCODE -eq 0) {
  Write-Host "✅ Backup completed successfully: $dumpFile" -ForegroundColor Green
} else {
  Write-Host "❌ Backup failed!" -ForegroundColor Red
}
