# Konfiguracja laptopa odbiorcy (Windows)

Zakładamy, że strony `receiver/` i `caller/` są już wdrożone (np. na GitHub Pages)
i masz gotowy URL do strony receiver.

## 1. Autologowanie do Windows

1. Win+R → `netplwiz`
2. Odznacz "Użytkownicy muszą wpisywać nazwę użytkownika i hasło, aby używać tego komputera"
3. Podaj dane konta, które ma się logować automatycznie

## 2. Wyłącz uśpienie i wygaszacz ekranu

- Ustawienia → System → Zasilanie → "Ekran i uśpienie" → ustaw "Nigdy"
- Ustawienia → Personalizacja → Ekran blokady → wygaszacz ekranu → Brak

## 3. Skrypt startowy

1. Edytuj `kiosk-start.bat` — podmień `<RECEIVER_URL>` na właściwy adres
2. Win+R → `shell:startup`
3. Wklej skrót do `kiosk-start.bat` w tym folderze

## 4. Watchdog (Harmonogram zadań)

1. Otwórz Harmonogram zadań (Task Scheduler)
2. Utwórz nowe zadanie: wyzwalacz co 1 minutę, akcja: uruchom `watchdog.bat`
3. Zaznacz "Uruchom niezależnie od tego, czy użytkownik jest zalogowany" (jeśli wymagane) oraz "Uruchom z najwyższymi uprawnieniami"

## 5. TeamViewer (zdalna administracja)

1. Zainstaluj TeamViewer, skonfiguruj "Unattended Access" (dostęp bez nadzoru)
2. Zapisz sobie ID i hasło do stałego dostępu
3. Możesz łączyć się zdalnie w każdej chwili bez przerywania trwającej rozmowy wideo — TeamViewer działa w tle niezależnie od Chrome

## 6. Test

1. Uruchom ponownie laptop i sprawdź, że po starcie systemu Chrome sam się otwiera w trybie kiosk na stronie receiver
2. Zadzwoń ze strony `caller/` z innego urządzenia i sprawdź, że połączenie odbiera się automatycznie
