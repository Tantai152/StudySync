const startBtn = document.getElementById("startBtn");
const callBtn = document.getElementById("callBtn");
const applyBtn = document.getElementById("applyBtn");

const localSdp = document.getElementById("localSdp");
const remoteSdp = document.getElementById("remoteSdp");
const remoteAudio = document.getElementById("remoteAudio");
const statusText = document.getElementById("status");

let localStream = null;
let peerConnection = null;

const configuration = {
  iceServers: [
    {
      urls: "stun:stun.l.google.com:19302",
    },
  ],
};

function updateStatus(message) {
  statusText.textContent = message;
  console.log(message);
}

function createPeerConnection() {
  if (peerConnection) {
    return peerConnection;
  }

  peerConnection = new RTCPeerConnection(configuration);

  // Gửi microphone của browser hiện tại sang browser còn lại
  localStream.getTracks().forEach((track) => {
    peerConnection.addTrack(track, localStream);
  });

  // Khi nhận audio từ browser còn lại
  peerConnection.ontrack = (event) => {
    remoteAudio.srcObject = event.streams[0];
    updateStatus("Remote audio received");
  };

  peerConnection.onconnectionstatechange = () => {
    updateStatus(
      `Connection state: ${peerConnection.connectionState}`
    );
  };

  peerConnection.oniceconnectionstatechange = () => {
    console.log(
      "ICE state:",
      peerConnection.iceConnectionState
    );
  };

  return peerConnection;
}

// Đợi browser tìm ICE candidate xong rồi mới copy SDP
function waitForIceGatheringComplete(pc) {
  return new Promise((resolve) => {
    if (pc.iceGatheringState === "complete") {
      resolve();
      return;
    }

    const checkState = () => {
      if (pc.iceGatheringState === "complete") {
        pc.removeEventListener(
          "icegatheringstatechange",
          checkState
        );

        resolve();
      }
    };

    pc.addEventListener(
      "icegatheringstatechange",
      checkState
    );
  });
}

// BƯỚC 1: xin quyền microphone
startBtn.addEventListener("click", async () => {
  try {
    updateStatus("Requesting microphone...");

    localStream = await navigator.mediaDevices.getUserMedia({
      audio: true,
      video: false,
    });

    updateStatus("Microphone ready");

    startBtn.disabled = true;
    callBtn.disabled = false;
  } catch (error) {
    console.error(error);
    updateStatus(`Microphone error: ${error.message}`);
  }
});

// BƯỚC 2: Browser A tạo Offer
callBtn.addEventListener("click", async () => {
  try {
    const pc = createPeerConnection();

    updateStatus("Creating offer...");

    const offer = await pc.createOffer();

    await pc.setLocalDescription(offer);

    updateStatus("Gathering ICE candidates...");

    await waitForIceGatheringComplete(pc);

    localSdp.value = JSON.stringify(
      pc.localDescription,
      null,
      2
    );

    updateStatus(
      "Offer ready - copy Local SDP to Browser B"
    );
  } catch (error) {
    console.error(error);
    updateStatus(`Offer error: ${error.message}`);
  }
});

// Browser B paste Offer vào Remote SDP
// Sau đó Apply -> tự tạo Answer
//
// Browser A paste Answer vào Remote SDP
// Sau đó Apply -> kết nối hoàn tất
applyBtn.addEventListener("click", async () => {
  try {
    if (!localStream) {
      updateStatus("Start microphone first");
      return;
    }

    if (!remoteSdp.value.trim()) {
      updateStatus("Remote SDP is empty");
      return;
    }

    const remoteDescription = JSON.parse(
      remoteSdp.value
    );

    const pc = createPeerConnection();

    await pc.setRemoteDescription(
      remoteDescription
    );

    // Nếu nhận Offer -> đây là Browser B
    if (remoteDescription.type === "offer") {
      updateStatus(
        "Offer received - creating answer..."
      );

      const answer = await pc.createAnswer();

      await pc.setLocalDescription(answer);

      updateStatus("Gathering ICE candidates...");

      await waitForIceGatheringComplete(pc);

      localSdp.value = JSON.stringify(
        pc.localDescription,
        null,
        2
      );

      updateStatus(
        "Answer ready - copy Local SDP back to Browser A"
      );
    }

    // Nếu nhận Answer -> Browser A hoàn tất handshake
    if (remoteDescription.type === "answer") {
      updateStatus(
        "Answer applied - waiting for connection..."
      );
    }
  } catch (error) {
    console.error(error);

    updateStatus(
      `Remote SDP error: ${error.message}`
    );
  }
});