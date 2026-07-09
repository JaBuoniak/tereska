@echo off
REM Sprawdza czy Chrome dziala; jesli nie, uruchamia ponownie kiosk-start.bat.
REM Dodaj to zadanie w Harmonogramie Zadan (Task Scheduler), wyzwalacz co 1 minute.

tasklist /FI "IMAGENAME eq chrome.exe" 2>NUL | find /I "chrome.exe" >NUL
if errorlevel 1 (
  call "%~dp0kiosk-start.bat"
)
