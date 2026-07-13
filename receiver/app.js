const RECEIVER_ID = "tereska-receiver";
const CAPTION_HOLD_MS = 6000;
const SLIDESHOW_INTERVAL = 30 * 60 * 1000; // 30 minut
const SLIDESHOW_DURATION = 5 * 60 * 1000;  // 5 minut
const SLIDE_CHANGE_MS = 3000;               // zmiana zdjęcia co 3 sekundy

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

async function loadSlides() {
  try {
    const response = await fetch("http://localhost:8000/Obrazy/");
    const html = await response.text();
    
    // Parsuj HTML directory listing
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, "text/html");
    const links = doc.querySelectorAll("a");
    
    slides = [];
    links.forEach(link => {
      const href = link.getAttribute("href");
      if (href && /\.(jpg|jpeg|png|gif|webp)$/i.test(href) && !href.startsWith("?")) {
        slides.push(`http://localhost:8000/Obrazy/${href}`);
      }
    });
    
    console.log(`Załadowano ${slides.length} zdjęć`);
  } catch (err) {
    console.error("Nie można załadować zdjęć:", err);
    slides = [];
  }
}

function nextSlide() {
  if (slides.length === 0) return;
  
  slideImageEl.src = slides[currentSlideIndex];
  currentSlideIndex = (currentSlideIndex + 1) % slides.length;
}

function startSlideshow() {
  if (slides.length === 0) return;
  
  statusEl.style.display = "none";
  slideshowEl.style.display = "flex";
  currentSlideIndex = 0;
  nextSlide();
  
  slideshowTimer = setInterval(nextSlide, SLIDE_CHANGE_MS);
  
  // Zatrzymaj slideshow po 5 minutach
  setTimeout(stopSlideshow, SLIDESHOW_DURATION);
}

function stopSlideshow() {
  clearInterval(slideshowTimer);
  slideshowEl.style.display = "none";
  statusEl.style.display = "flex";
  
  // Zaplanuj następny slideshow za 30 minut
  setTimeout(startSlideshow, SLIDESHOW_INTERVAL);
}

function setStatus(show) {
  statusEl.style.display = show ? "flex" : "none";
}

// STARTUJ ZEGAR NIEZALEŻNIE
updateClock();
setInterval(updateClock, 1000);

// Załaduj zdjęcia i zaplanuj slideshow
loadSlides();
setTimeout(startSlideshow, SLIDESHOW_INTERVAL);

async function start() {
  const peer = new Peer(RECEIVER_ID);

  peer.on("open", () => {
    setStatus(true);
  });

  peer.on("error", (err) => {
    console.error("Peer error:", err);
    // Nie pokazuj błędu - zostaw zegar
  });

  peer.on("call", async (call) => {
    setStatus(false);
    clearInterval(slideshowTimer);
    slideshowEl.style.display = "none";
    
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
      setTimeout(startSlideshow, SLIDESHOW_INTERVAL);
    });

    call.on("error", (err) => {
      console.error("Call error:", err);
      videoEl.srcObject = null;
      setStatus(true);
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
