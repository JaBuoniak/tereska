const RECEIVER_ID = "tereska-receiver";

const callBtn = document.getElementById("callBtn");
const hangupBtn = document.getElementById("hangupBtn");
const statusEl = document.getElementById("status");
const localVideoEl = document.getElementById("localVideo");
const remoteVideoEl = document.getElementById("remoteVideo");
const messageBar = document.getElementById("messageBar");
const messageInput = document.getElementById("messageInput");
const sendBtn = document.getElementById("sendBtn");

let peer = null;
let dataConn = null;
let recognition = null;
let activeCall = null;
let localStream = null;
let recognizedText = "";
let autoSendTimer = null;

const AUTO_SEND_DELAY_MS = 3000;

function scheduleAutoSend() {
  clearTimeout(autoSendTimer);
  autoSendTimer = setTimeout(sendMessage, AUTO_SEND_DELAY_MS);
}

function cancelAutoSend() {
  clearTimeout(autoSendTimer);
  autoSendTimer = null;
}

function setStatus(text) {
  statusEl.textContent = text;
}

function startSpeechRecognition() {
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SpeechRecognition) {
    console.warn("SpeechRecognition nie jest wsparte w tej przeglądarce — napisy nie będą wysyłane.");
    return;
  }

  recognition = new SpeechRecognition();
  recognition.lang = "pl-PL";
  recognition.continuous = true;
  recognition.interimResults = true;

  recognition.onresult = (event) => {
    const last = event.results[event.results.length - 1];
    const text = last[0].transcript.trim();

    // Only auto-fill if the user hasn't started editing the field themselves.
    const userEdited = messageInput.value !== recognizedText;
    if (!userEdited) {
      messageInput.value = text;
    }
    recognizedText = text;

    if (!userEdited && last.isFinal) {
      // Full sentence recognized and untouched by the user — send right away.
      cancelAutoSend();
      sendMessage();
    } else {
      // Give the user a few seconds to correct before it goes out automatically.
      scheduleAutoSend();
    }
  };

  recognition.onerror = (event) => {
    console.error("Speech recognition error:", event.error);
  };

  recognition.onend = () => {
    if (dataConn && dataConn.open) {
      recognition.start();
    }
  };

  recognition.start();
}

function stopSpeechRecognition() {
  if (recognition) {
    recognition.onend = null;
    recognition.stop();
    recognition = null;
  }
  cancelAutoSend();
}

function sendMessage() {
  cancelAutoSend();
  const text = messageInput.value.trim();
  if (text && dataConn && dataConn.open) {
    dataConn.send(text);
  }
  messageInput.value = "";
  recognizedText = "";
}

async function startCall() {
  callBtn.disabled = true;
  setStatus("Łączenie...");

  try {
    localStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
  } catch (err) {
    setStatus("Brak dostępu do kamery/mikrofonu.");
    callBtn.disabled = false;
    return;
  }

  localVideoEl.srcObject = localStream;
  hangupBtn.hidden = false;
  messageBar.hidden = false;

  peer = new Peer();

  peer.on("open", () => {
    dataConn = peer.connect(RECEIVER_ID);
    dataConn.on("open", () => {
      startSpeechRecognition();
    });

    activeCall = peer.call(RECEIVER_ID, localStream);
    setStatus("Dzwonię...");

    activeCall.on("stream", (remoteStream) => {
      remoteVideoEl.srcObject = remoteStream;
      setStatus("Połączono");
    });

    activeCall.on("close", () => {
      endCall();
    });

    activeCall.on("error", (err) => {
      console.error("Call error:", err);
      setStatus("Błąd połączenia.");
      endCall();
    });
  });

  peer.on("error", (err) => {
    console.error("Peer error:", err);
    setStatus("Błąd połączenia.");
    endCall();
  });
}

function endCall() {
  stopSpeechRecognition();

  if (activeCall) {
    activeCall.close();
    activeCall = null;
  }
  if (peer) {
    peer.destroy();
    peer = null;
  }
  dataConn = null;

  if (localStream) {
    localStream.getTracks().forEach((track) => track.stop());
    localStream = null;
  }
  localVideoEl.srcObject = null;
  remoteVideoEl.srcObject = null;

  callBtn.disabled = false;
  hangupBtn.hidden = true;
  messageBar.hidden = true;
  messageInput.value = "";
  recognizedText = "";
  setStatus("Rozmowa zakończona.");
}

callBtn.addEventListener("click", startCall);
hangupBtn.addEventListener("click", endCall);
sendBtn.addEventListener("click", sendMessage);
messageInput.addEventListener("keydown", (event) => {
  if (event.key === "Enter") {
    event.preventDefault();
    sendMessage();
  }
});
messageInput.addEventListener("input", () => {
  scheduleAutoSend();
});
