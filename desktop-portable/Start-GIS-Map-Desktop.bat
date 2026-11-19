@echo off
title GIS Map - Algeria Geo-Intelligence 2030 (Portable Desktop)
set "APP_FILE=%~dp0GIS-Map-Algeria-2030-Portable.html"
set "URL_FILE=file:///%APP_FILE:\=/%"

:: Launch in dedicated App Window (no browser tabs/address bar) using Edge or Chrome if available
if exist "%ProgramFiles(x86)%\Microsoft\Edge\Application\msedge.exe" (
  start "" "%ProgramFiles(x86)%\Microsoft\Edge\Application\msedge.exe" --app="%URL_FILE%" --window-size=1440,920
  exit /b
)
if exist "%ProgramFiles%\Microsoft\Edge\Application\msedge.exe" (
  start "" "%ProgramFiles%\Microsoft\Edge\Application\msedge.exe" --app="%URL_FILE%" --window-size=1440,920
  exit /b
)
if exist "%ProgramFiles%\Google\Chrome\Application\chrome.exe" (
  start "" "%ProgramFiles%\Google\Chrome\Application\chrome.exe" --app="%URL_FILE%" --window-size=1440,920
  exit /b
)
if exist "%LocalAppData%\Google\Chrome\Application\chrome.exe" (
  start "" "%LocalAppData%\Google\Chrome\Application\chrome.exe" --app="%URL_FILE%" --window-size=1440,920
  exit /b
)

:: Fallback to default browser
start "" "%APP_FILE%"
