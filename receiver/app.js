const RECEIVER_ID = "tereska-receiver";
const CAPTION_HOLD_MS = 6000;

const statusEl = document.getElementById("status");
const timeEl = document.getElementById("time");
const dateEl = document.getElementById("date");
const dayEl = document.getElementById("day");
const videoEl = document.getElementById("remoteVideo");
const captionsEl = document.getElementById("captions");

let captionHideTimer = null;

const dayNames = ["niedziela", "poniedziałek", "wtorek", "środa", "czwartek", "piątek", "sobota"];
const monthNames = ["stycznia", "lutego", "marca", "kwietnia", "maja", "czerwca", 
                    "lipca", "sierpnia", "września", "października", "listopada", "grudnia"];

function updateClock() {
  const now = new Date();
  
  // Godzina i minuta
  const hours = String(now.getHours()).padStart(2, "0");
  const minutes = String(now.getMinutes()).padStart(2, "0");
  timeEl.textContent = `${hours}:${minutes}`;
  
  // Data
  const day = now.getDate();
  const month = monthNames[now.getMonth()];
  const year = now.getFullYear();
  dateEl.textContent = `${day} ${month} ${year}`;
  
  // Dzień tygodnia
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

async function start() {
  const peer = new Peer(RECEIVER_ID);

  peer.on("open", () => {
    updateClock();
    setStatus(true);
    // Aktualizuj zegar co sekundę
    setInterval(updateClock, 1000);
  });

  peer.on("error", (err) => {
    console.error("Peer error:", err);
    setStatus(true);
    timeEl.textContent
