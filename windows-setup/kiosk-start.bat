@echo off
REM Uruchamia Chrome w trybie kiosk na stronie odbiorcy (receiver).
REM Umiesc skrot do tego skryptu w folderze Windows Startup: shell:startup
REM Podmien <RECEIVER_URL> na adres strony receiver po wdrozeniu (np. GitHub Pages).

set RECEIVER_URL=https://<twoj-github-pages-url>/receiver/

start "" "C:\Program Files\Google\Chrome\Application\chrome.exe" ^
  --kiosk "%RECEIVER_URL%" ^
  --autoplay-policy=no-user-gesture-required ^
  --disable-session-crashed-bubble ^
  --disable-infobars ^
  --noerrdialogs
