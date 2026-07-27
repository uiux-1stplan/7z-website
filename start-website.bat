@echo off
cd /d "%~dp0"
powershell -NoProfile -ExecutionPolicy Bypass -Command "$port = Get-NetTCPConnection -LocalPort 4173 -ErrorAction SilentlyContinue; if (-not $port) { Start-Process -FilePath 'node' -ArgumentList 'local-server.mjs' -WorkingDirectory '%~dp0' -WindowStyle Hidden }; Start-Sleep -Seconds 1; Start-Process 'http://localhost:4173'"

