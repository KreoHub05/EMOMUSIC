// Frontend script: camera capture, animation, send to backend, show recommendations
const webcam = document.getElementById("webcam");
const startCamBtn = document.getElementById("startCamBtn");
const stopCamBtn = document.getElementById("stopCamBtn");
const captureBtn = document.getElementById("captureBtn");
const detectBtn = document.getElementById("detectBtn");
const preview = document.getElementById("preview");
const emotionText = document.getElementById("emotionText");
const songsList = document.getElementById("songsList");
const scanAnimation = document.getElementById("scanAnimation");
const canvas = document.getElementById("canvas");

let cameraStream = null;
let capturedBlob = null;

// Change this to your backend endpoint (adjust host/port as needed)
const API_DETECT_URL = "http://127.0.0.1:5000/detect";

function showScan(){ scanAnimation.style.display = "flex"; }
function hideScan(){ scanAnimation.style.display = "none"; }

// Start camera stream
startCamBtn.addEventListener("click", async () => {
  try{
    cameraStream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' }, audio: false });
    webcam.srcObject = cameraStream;
  }catch(err){
    alert('Camera access denied or not available. ' + (err.message || err));
    console.error(err);
  }
});

// Stop camera stream
stopCamBtn.addEventListener("click", () => {
  if(cameraStream){
    const tracks = cameraStream.getTracks();
    tracks.forEach(t => t.stop());
    cameraStream = null;
    webcam.srcObject = null;
  }
});

// Capture frame into blob and preview
captureBtn.addEventListener("click", () => {
  if(!cameraStream){
    alert('Start the camera first!');
    return;
  }
  const w = webcam.videoWidth || 640;
  const h = webcam.videoHeight || 480;
  canvas.width = w; canvas.height = h;
  const ctx = canvas.getContext('2d');
  ctx.drawImage(webcam, 0, 0, w, h);
  canvas.toBlob((blob) => {
    capturedBlob = blob;
    preview.innerHTML = `<img src="${URL.createObjectURL(blob)}" alt="capture">`;
  }, 'image/jpeg', 0.9);
});

// Detect emotion: send image blob to backend
detectBtn.addEventListener("click", async () => {
  if(!capturedBlob){
    alert('Please capture a photo first!');
    return;
  }

  const formData = new FormData();
  formData.append('image', capturedBlob, 'capture.jpg');

  try{
    showScan();
    emotionText.textContent = '--';
    songsList.innerHTML = '';

    const resp = await fetch(API_DETECT_URL, { method: 'POST', body: formData });
    if(!resp.ok) throw new Error('Server returned ' + resp.status);
    const data = await resp.json();
    hideScan();

    // Expecting { emotion: "happy", songs: [ {title, artist, url?}, ... ] }
    const emotion = (data.emotion || '').toString();
    emotionText.textContent = emotion ? emotion.toUpperCase() : 'UNKNOWN';

    if(Array.isArray(data.songs)){
      songsList.innerHTML = '';
      data.songs.forEach(s => {
        const urlPart = s.url ? `<a href="${s.url}" target="_blank" rel="noopener noreferrer">Listen</a>` : '';
        const artist = s.artist ? s.artist : '';
        songsList.insertAdjacentHTML('beforeend', `
          <div class="song-card">
            <h4>${s.title || 'Untitled'}</h4>
            <p>${artist}</p>
            ${urlPart}
          </div>
        `);
      });
    } else {
      songsList.innerHTML = '<p style="color:#9aa4b2">No songs returned by server.</p>';
    }

  }catch(err){
    hideScan();
    alert('Error detecting emotion: ' + (err.message || err));
    console.error(err);
  }
});
