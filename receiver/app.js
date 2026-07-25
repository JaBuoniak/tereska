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

let captionHideTimer = null;
let slideshowTimer = null;
let currentSlideIndex = 0;
let slides = [];
let slideshowEnabled = false;
let isShowingSlideshow = false;
let currentSession = 0;

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
      console.log(`✓ Załadowano ${slides.length} zdjęć`);
      const sessionDuration = SLIDES_PER_SESSION * (SLIDE_CHANGE_MS / 1000);
      console.log(`✓ Sesja potrwa ~${Math.round(sessionDuration / 60)} minut (${SLIDES_PER_SESSION} zdjęć po ${SLIDE_CHANGE_MS / 1000}s)`);
      slideshowEnabled = true;
    } else {
      console.warn("⚠ Brak zdjęć w /Obrazy/");
      slideshowEnabled = false;
    }
  } catch (err) {
    console.error(`✗ Błąd ładowania zdjęć (próba ${retryCount + 1}/3):`, err);

    if (retryCount < 2) {
      setTimeout(() => loadSlides(retryCount + 1), 5000);
    } else {
      console.error("✗ Nie udało się załadować zdjęć - slideshow wyłączony");
      slideshowEnabled = false;
    }
  }
}

function isWithinSlideshowHours() {
  const now = new Date();
  return now.getHours() >= SLIDESHOW_START_HOUR && now.getHours() < SLIDESHOW_END_HOUR;
}

function nextSlide() {
  if (slides.length === 0) return;

  const totalSessions = Math.ceil(slides.length / SLIDES_PER_SESSION);
  const sessionIndex = currentSession % totalSessions;
  const startIndex = sessionIndex * SLIDES_PER_SESSION;
  const slideIndex = startIndex + currentSlideIndex;

  slideImageEl.src = slides[slideIndex];
  currentSlideIndex = (currentSlideIndex + 1) % SLIDES_PER_SESSION;
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
    console.log(`⏰ Poza godzinami pokazu (${SLIDESHOW_START_HOUR}:00-${SLIDESHOW_END_HOUR}:00). Nastę pny pokaz o ${nextStart.toLocaleTimeString('pl-PL')}`);
    setTimeout(startSlideshow, timeUntilStart);
    return;
  }

  if (!slideshowEnabled || slides.length === 0) {
    console.warn("⚠ Slideshow niedostępne");
    setTimeout(startSlideshow, SLIDESHOW_INTERVAL);
    return;
  }

  console.log("▶ Slideshow START");
  isShowingSlideshow = true;
  statusEl.style.display = "none";
  slideshowEl.style.display = "flex";
  currentSlideIndex = 0;
  nextSlide();

  // Zmienia zdjęcia co SLIDE_CHANGE_MS
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

  const totalSessions = Math.ceil(slides.length / SLIDES_PER_SESSION);
  console.log(`⏹ Slideshow STOP - sesja ${currentSession + 1}/${totalSessions}`);

  currentSession++;

  // Zaplanuj następny pokaz na następny slot (co 30 minut)
  const nextShowTime = calculateNextSlideshowTime();
  const now = new Date();
  const delayMs = nextShowTime - now;
  console.log(`⏰ Następny pokaz o ${nextShowTime.toLocaleTimeString('pl-PL')} (za ${Math.round(delayMs / (60 * 1000))} minut)`);

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
console.log(`⏰ Pierwszy pokaz o ${firstShowTime.toLocaleTimeString('pl-PL')}`);
setTimeout(startSlideshow, delayMs);

async function createPeer(id) {
  try {
    const resp = await fetch('https://tereska-turn.pjablonski-elk.workers.dev');
    const { iceServers } = await resp.json();
    return new Peer(id, { config: { iceServers } });
  } catch (err) {
    console.warn('Failed to fetch TURN credentials, using default config:', err);
  }
  return new Peer(id);
}

async function start() {
  const peer = await createPeer(RECEIVER_ID);

  peer.on("open", () => {
    setStatus("Czekam na połączenie...");
  });

  peer.on("error", (err) => {
    console.error("Peer error:", err);
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
      console.error("Nie udało się uzyskać kamery/mikrofonu:", err);
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
      console.error("Call error:", err);
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
