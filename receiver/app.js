const RECEIVER_ID = "tereska-receiver";
const CAPTION_HOLD_MS = 6000;
const SLIDESHOW_INTERVAL = 60 * 60 * 1000;  // Co godzinę
const SLIDE_CHANGE_MS = 3000;                // 3 sekundy na zdjęcie = ~30 min dla 600 zdjęć

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
      const totalSeconds = slides.length * (SLIDE_CHANGE_MS / 1000);
      const minutes = Math.round(totalSeconds / 60);
      console.log(`✓ Pokaz potrwa ~${minutes} minut`);
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

function nextSlide() {
  if (slides.length === 0) return;
  
  slideImageEl.src = slides[currentSlideIndex];
  currentSlideIndex = (currentSlideIndex + 1) % slides.length;
}

function startSlideshow() {
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
  
  // Zmienia zdjęcia co 3 sekundy
  slideshowTimer = setInterval(nextSlide, SLIDE_CHANGE_MS);
  
  // Po przesunięciu wszystkich zdjęć (~30 minut) - stop
  const totalDuration = slides.length * SLIDE_CHANGE_MS;
  setTimeout(stopSlideshow, totalDuration);
}

function stopSlideshow() {
  clearInterval(slideshowTimer);
  slideshowEl.style.display = "none";
  statusEl.style.display = "flex";
  isShowingSlideshow = false;
  
  console.log("⏹ Slideshow STOP - zegar wraca");
  
  // Zaplanuj następny slideshow za godzinę
  setTimeout(startSlideshow, SLIDESHOW_INTERVAL);
}

// STARTUJ ZEGAR NIEZALEŻNIE
updateClock();
setInterval(updateClock, 1000);

// Załaduj zdjęcia z retry logiką
loadSlides();

// Spróbuj załadować zdjęcia co godzinę (na wypadek dodania nowych)
setInterval(() => loadSlides(), 60 * 60 * 1000);

// Zaplanuj pierwszy slideshow za godzinę
setTimeout(startSlideshow, SLIDESHOW_INTERVAL);

async function start() {
  const peer = new Peer(RECEIVER_ID);

  peer.on("open", () => {
    setStatus(true);
  });

  peer.on("error", (err) => {
    console.error("Peer error:", err);
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
