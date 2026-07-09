const RECEIVER_ID = "tereska-receiver";
const CAPTION_HOLD_MS = 6000;

const statusEl = document.getElementById("status");
const videoEl = document.getElementById("remoteVideo");
const captionsEl = document.getElementById("captions");

let captionHideTimer = null;

function showCaption(text) {
  captionsEl.textContent = text;
  captionsEl.classList.add("visible");
  clearTimeout(captionHideTimer);
  captionHideTimer = setTimeout(() => {
    captionsEl.classList.remove("visible");
  }, CAPTION_HOLD_MS);
}

function setStatus(text) {
  statusEl.textContent = text;
  statusEl.style.display = text ? "block" : "none";
}

async function start() {
  const peer = new Peer(RECEIVER_ID);

  peer.on("open", () => {
    setStatus("Czekam na połączenie...");
  });

  peer.on("error", (err) => {
    console.error("Peer error:", err);
    setStatus("Błąd połączenia, ponawiam...");
    setTimeout(() => location.reload(), 5000);
  });

  peer.on("call", async (call) => {
    setStatus("");
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
      setStatus("Czekam na połączenie...");
    });

    call.on("error", (err) => {
      console.error("Call error:", err);
      videoEl.srcObject = null;
      setStatus("Czekam na połączenie...");
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
