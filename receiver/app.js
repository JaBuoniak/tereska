const RECEIVER_ID = "tereska-receiver";
const CAPTION_HOLD_MS = 6000;
const SLIDESHOW_INTERVAL = 30 * 60 * 1000;  // Pokazy co 30 minut
const SLIDE_CHANGE_MS = 10 * 1000;           // 10 sekund na zdjęcie
const SLIDES_PER_SESSION = 30;               // 30 zdjęć per sesja
const SLIDESHOW_START_HOUR = 8;              // Słownie pokazy: od 8 rano
const SLIDESHOW_END_HOUR = 18;               // do 18:00 (6 PM)

const statusEl = document.getElementById("status");
const timeEl = document.getElementById("time");
const dateEl = document.getElementById("date");
const dayEl = document.getElementById("day");
const videoEl = document.getElementById("remoteVideo");
const captionsEl = document.getElementById("captions");
const slideshowEl = document.getElementById("slideshow");
const slideImageEl = document.getElementById("slideImage");
const debugEl = document.getElementById("debug-info");
const debugLogEl = document.getElementById("debug-log");

// Przechwytuj console.log i wszystkie błędy dla debug konsoli
const originalLog = console.log;
console.log = function(...args) {
  originalLog.apply(console, args);
  debugLogEl.textContent = args.join(' ');
};

// Uncaught exceptions
window.onerror = function(message, source, lineno, colno, error) {
  const msg = `ERROR: ${message}`;
  originalLog(msg);
  debugLogEl.textContent = msg;
  return false;
};

// Unhandled promise rejections
window.onunhandledrejection = function(event) {
  const msg = `UNHANDLED: ${event.reason}`;
  originalLog(msg);
  debugLogEl.textContent = msg;
};

let captionHideTimer = null;
let slideshowTimer = null;
let slides = [];
let slideshowEnabled = false;
let isShowingSlideshow = false;
let nextSlideIndex = 0;  // Index następnego zdjęcia do wyświetlenia

const dayNames = ["niedziela", "poniedziałek", "wtorek", "środa", "czwartek", "piątek", "sobota"];
const monthNames = ["stycznia", "lutego", "marca", "kwietnia", "maja", "czerwca",
                    "lipca", "sierpnia", "września", "października", "listopada", "grudnia"];

function updateClock() {
  const now = new Date();

  const hours = String(now.getHours()).padStart(2, "0");
  const minutes = String(now.getMinutes()).padStart(2, "0");
  timeEl.textContent = `${hours}:${minutes}`;

  const day = now.getDate();
  const month = monthNames[now.getMonth()];
  const year = now.getFullYear();
  dateEl.textContent = `${day} ${month} ${year}`;

  const dayName = dayNames[now.getDay()];
  dayEl.textContent = dayName;
}

function showCaption(text) {
  captionsEl.textContent = text;
  captionsEl.classList.add("visible");
  clearTimeout(captionHideTimer);
  captionHideTimer = setTimeout(() => {
    captionsEl.classList.remove("visible");
  }, CAPTION_HOLD_MS);
}

function setStatus(show) {
  statusEl.style.display = show ? "flex" : "none";
}

async function loadSlides(retryCount = 0) {
  try {
    const response = await fetch("http://localhost:8000/api/images", { timeout: 3000 });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    slides = await response.json();

    if (slides.length > 0) {
      console.log(`Loaded ${slides.length} images`);
      nextSlideIndex = 0;
      debugEl.textContent = `${nextSlideIndex + 1}/${slides.length}`;
      const sessionDuration = SLIDES_PER_SESSION * (SLIDE_CHANGE_MS / 1000);
      console.log(`Session ~${Math.round(sessionDuration / 60)}min (${SLIDES_PER_SESSION} slides @ ${SLIDE_CHANGE_MS / 1000}s)`);
      slideshowEnabled = true;
    } else {
      console.warn("No images in directory");
      debugEl.textContent = '0';
      slideshowEnabled = false;
    }
  } catch (err) {
    console.error(`Load error (attempt ${retryCount + 1}/3): ${err.message}`);
    debugEl.textContent = '!';

    if (retryCount < 2) {
      setTimeout(() => loadSlides(retryCount + 1), 5000);
    } else {
      console.error("Load failed - slideshow disabled");
      slideshowEnabled = false;
    }
  }
}

function isWithinSlideshowHours() {
  const now = new Date();
  return now.getHours() >= SLIDESHOW_START_HOUR && now.getHours() < SLIDESHOW_END_HOUR;
}

function nextSlide() {
  if (slides.length === 0) {
    console.log("nextSlide: no slides");
    return;
  }

  try {
    slideImageEl.src = slides[nextSlideIndex];
    debugEl.textContent = `${nextSlideIndex + 1}/${slides.length}`;
    nextSlideIndex = (nextSlideIndex + 1) % slides.length;
  } catch (e) {
    console.log(`nextSlide error: ${e.message}`);
  }
}

function startSlideshow() {
  if (!isWithinSlideshowHours()) {
    const now = new Date();
    const nextStart = new Date();
    if (now.getHours() >= SLIDESHOW_END_HOUR) {
      // Następny dzień
      nextStart.setDate(nextStart.getDate() + 1);
    }
    nextStart.setHours(SLIDESHOW_START_HOUR, 0, 0, 0);
    const timeUntilStart = nextStart - now;
    console.log(`Outside hours (${SLIDESHOW_START_HOUR}:00-${SLIDESHOW_END_HOUR}:00). Next: ${nextStart.toLocaleTimeString('pl-PL')}`);
    setTimeout(startSlideshow, timeUntilStart);
    return;
  }

  if (!slideshowEnabled || slides.length === 0) {
    console.warn("Slideshow unavailable");
    setTimeout(startSlideshow, SLIDESHOW_INTERVAL);
    return;
  }

  console.log("Slideshow START");
  isShowingSlideshow = true;
  statusEl.style.display = "none";
  slideshowEl.style.display = "flex";
  nextSlide();

  // Zmienia zdjęcia co SLIDE_CHANGE_MS (tylko podczas slideshow)
  if (slideshowTimer) clearInterval(slideshowTimer);
  slideshowTimer = setInterval(nextSlide, SLIDE_CHANGE_MS);

  // Po wyświetleniu SLIDES_PER_SESSION zdjęć - stop (i czekaj 30 minut)
  const sessionDuration = SLIDES_PER_SESSION * SLIDE_CHANGE_MS;
  setTimeout(stopSlideshow, sessionDuration);
}

function stopSlideshow() {
  clearInterval(slideshowTimer);
  slideshowEl.style.display = "none";
  statusEl.style.display = "flex";
  isShowingSlideshow = false;
  debugEl.textContent = `${nextSlideIndex + 1}/${slides.length}`;

  console.log(`Slideshow STOP - next: ${nextSlideIndex + 1}/${slides.length}`);

  // Zaplanuj następny pokaz na następny slot (co 30 minut)
  const nextShowTime = calculateNextSlideshowTime();
  const now = new Date();
  const delayMs = nextShowTime - now;
  console.log(`Next show at ${nextShowTime.toLocaleTimeString('pl-PL')} (${Math.round(delayMs / (60 * 1000))}min)`);

  setTimeout(startSlideshow, delayMs);
}

function calculateNextSlideshowTime() {
  const now = new Date();

  // Poza godzinami pokazu (przed 8 lub od 18)
  if (now.getHours() < SLIDESHOW_START_HOUR || now.getHours() >= SLIDESHOW_END_HOUR) {
    const nextDay = new Date(now);
    nextDay.setDate(nextDay.getDate() + 1);
    nextDay.setHours(SLIDESHOW_START_HOUR, 0, 0, 0);
    return nextDay;
  }

  // W godzinach pokazu (8-17:59)
  // Sloty: :00 i :30 każdej godziny
  let nextShow = new Date(now);

  if (now.getMinutes() < 30) {
    nextShow.setMinutes(30, 0, 0);
  } else {
    nextShow.setHours(nextShow.getHours() + 1, 0, 0, 0);
  }

  // Jeśli następna godzina >= 18, pokaz jutro o 8:00
  if (nextShow.getHours() >= SLIDESHOW_END_HOUR) {
    const nextDay = new Date(now);
    nextDay.setDate(nextDay.getDate() + 1);
    nextDay.setHours(SLIDESHOW_START_HOUR, 0, 0, 0);
    return nextDay;
  }

  return nextShow;
}

// STARTUJ ZEGAR NIEZALEŻNIE
updateClock();
setInterval(updateClock, 1000);

// Załaduj zdjęcia z retry logiką
loadSlides();

// Spróbuj załadować zdjęcia co godzinę (na wypadek dodania nowych)
setInterval(() => loadSlides(), 60 * 60 * 1000);

// Zaplanuj pierwszy slideshow na następny slot (8:00, 8:30, 9:00, itd.)
const firstShowTime = calculateNextSlideshowTime();
const now = new Date();
const delayMs = firstShowTime - now;
console.log(`First show at ${firstShowTime.toLocaleTimeString('pl-PL')}`);
setTimeout(startSlideshow, delayMs);

async function createPeer(id) {
  try {
    const resp = await fetch('https://tereska-turn.pjablonski-elk.workers.dev');
    const { iceServers } = await resp.json();
    return new Peer(id, { config: { iceServers } });
  } catch (err) {
    console.warn(`TURN fetch failed: ${err.message}`);
  }
  return new Peer(id);
}

async function start() {
  const peer = await createPeer(RECEIVER_ID);

  peer.on("open", () => {
    setStatus("Czekam na połączenie...");
  });

  peer.on("error", (err) => {
    console.error(`Peer error: ${err.message}`);
    setStatus("Błąd połączenia, ponawiam...");
    setTimeout(() => location.reload(), 5000);
  });

  peer.on("call", async (call) => {
    setStatus(false);

    // Stop slideshow jeśli trwa
    if (isShowingSlideshow) {
      clearInterval(slideshowTimer);
      slideshowEl.style.display = "none";
    }

    let localStream;
    try {
      localStream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true,
      });
    } catch (err) {
      console.error(`Camera/mic error: ${err.message}`);
      localStream = new MediaStream();
    }

    call.answer(localStream);

    call.on("stream", (remoteStream) => {
      videoEl.srcObject = remoteStream;
    });

    call.on("close", () => {
      videoEl.srcObject = null;
      setStatus(true);
      isShowingSlideshow = false;
      // Zaplanuj slideshow za godzinę od końca połączenia
      setTimeout(startSlideshow, SLIDESHOW_INTERVAL);
    });

    call.on("error", (err) => {
      console.error(`Call error: ${err.message}`);
      videoEl.srcObject = null;
      setStatus(true);
      isShowingSlideshow = false;
    });

    call.on("connection", () => {});
  });

  peer.on("connection", (conn) => {
    conn.on("data", (data) => {
      if (typeof data === "string" && data.trim().length > 0) {
        showCaption(data);
      }
    });
  });
}

start();
