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

// STARTUJ ZEGAR NIEZALEŻNIE OD PEER
updateClock();
setInterval(updateClock, 1000);

async function start() {
  const peer = new Peer(RECEIVER_ID);

  peer.on("open", () => {
    setStatus(true);
  });

  peer.on("error", (err) => {
    console.error("Peer error:", err);
    timeEl.textContent = "Błąd";
    dateEl.textContent = "Ponawiam...";
    dayEl.textContent = "";
    setTimeout(() => location.reload(), 5000);
  });

  peer.on("call", async (call) => {
    setStatus(false);
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
