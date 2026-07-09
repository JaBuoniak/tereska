# Tereska

Prosty komunikator wideo z automatycznym odbieraniem połączeń i napisami na żywo,
zaprojektowany dla osoby, która nie obsługuje technologii i nie słyszy — nie wymaga
żadnej interakcji po stronie odbiorcy.

## Jak to działa

- **`receiver/`** — strona na laptopie odbiorcy. Automatycznie odbiera przychodzące
  połączenia (bez klikania), wyświetla obraz na pełnym ekranie i pokazuje napisy
  otrzymane od rozmówcy.
- **`caller/`** — strona dla osób dzwoniących. Jeden przycisk "Zadzwoń", rozpoznaje
  mowę lokalnie (Web Speech API, `pl-PL`) i wysyła transkrypcję do odbiorcy przez
  WebRTC data channel — dlatego napisy pojawiają się bez żadnego obciążenia po
  stronie słabego laptopa odbiorcy.
- Łączenie (signaling) korzysta z darmowego publicznego brokera PeerJS
  (`0.peerjs.com`) — brak własnego serwera do utrzymania.

## Wdrożenie

1. Wypchnij zawartość repo na GitHub, włącz GitHub Pages (branch `main`, root)
2. Strony będą dostępne pod `https://<user>.github.io/tereska/receiver/` i
   `.../caller/`
3. Podmień `<RECEIVER_URL>` w `windows-setup/kiosk-start.bat` na adres receiver
4. Skonfiguruj laptop odbiorcy według `windows-setup/README.md`

## Zmiana ID odbiorcy

Stały identyfikator peera (`tereska-receiver`) jest zdefiniowany na początku
`receiver/app.js` i `caller/app.js` — zmień w obu plikach, jeśli chcesz uruchomić
więcej niż jednego odbiorcę (np. różne ID dla różnych osób).

## Test lokalny

Otwórz `receiver/index.html` i `caller/index.html` w dwóch kartach przeglądarki
(przez lokalny serwer HTTP, np. `npx serve .` — WebRTC/mikrofon wymaga `http://localhost`
albo `https`, nie działa z `file://`). Kliknij "Zadzwoń do babci" w karcie caller i
sprawdź, że karta receiver odbiera połączenie automatycznie oraz że mówiąc po polsku
w karcie caller, tekst pojawia się jako napisy w karcie receiver.
