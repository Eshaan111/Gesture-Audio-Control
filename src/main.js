import {
    HandLandmarker,
    FilesetResolver
} from "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.0";


/* ============================================
   STATUS & HEADER ELEMENTS
   ============================================ */

const statusText = document.getElementById('status-text');
const statusBadge = document.querySelector('.status-badge'); // Class, not ID
const fpsDisplay = document.getElementById('fps');

/* ============================================
   VIDEO & HAND TRACKING ELEMENTS
   ============================================ */

const webcam = document.getElementById('webcam');
const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d'); // Canvas 2D context
const cameraMessage = document.getElementById('camera-message');
const videoOverlay = document.querySelector('.video-overlay'); // Class, not ID

// Hand info displays
const handPosition = document.getElementById('hand-position');
const gestureDisplay = document.getElementById('gesture');

/* ============================================
   AUDIO CONTROL ELEMENTS
   ============================================ */

// Audio upload
const audioUpload = document.getElementById('audio-upload');

// Audio info displays
const audioInfo = document.getElementById('audio-info');
const audioTitle = document.getElementById('audio-title');
const audioDuration = document.getElementById('audio-duration');

// Waveform canvas
const waveformCanvas = document.getElementById('waveform');
const waveformCtx = waveformCanvas.getContext('2d');

// Playback control buttons
const playBtn = document.getElementById('play-btn');
const pauseBtn = document.getElementById('pause-btn');
const stopBtn = document.getElementById('stop-btn');
const resetBtn = document.getElementById('reset-btn');

// Progress bar elements
const progressFill = document.getElementById('progress-fill');
const progressHandle = document.getElementById('progress-handle');

/* ============================================
   EFFECTS PANEL ELEMENTS
   ============================================ */

// Effects toggle button
const effectsToggle = document.getElementById('effects-toggle');

// Volume effect
const volumeValue = document.getElementById('volume-value');
const volumeMeter = document.getElementById('volume-meter');

// Pitch effect
const pitchValue = document.getElementById('pitch-value');
const pitchMeter = document.getElementById('pitch-meter');

// Speed effect
const speedValue = document.getElementById('speed-value');
const speedMeter = document.getElementById('speed-meter');

// Bass effect
const bassValue = document.getElementById('bass-value');
const bassMeter = document.getElementById('bass-meter');

// Filter effect
const filterValue = document.getElementById('filter-value');
const filterMeter = document.getElementById('filter-meter');

// Spectrum analyzer canvas
const spectrumCanvas = document.getElementById('spectrum');
const spectrumCtx = spectrumCanvas.getContext('2d');

/* ============================================
   FOOTER ELEMENTS
   ============================================ */

const latencyDisplay = document.getElementById('latency');

const video = document.getElementById('webcam');
const canvasCtx = canvas.getContext('2d');

let handLandmarker = undefined;
let runningMode = "VIDEO";
let webcamRunning = false;

const createHandLandmarker = async () => {
    try {
        statusText.textContent = 'Loading MediaPipe model...';
        const vision = await FilesetResolver.forVisionTasks(
            "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.0/wasm"
        );
        handLandmarker = await HandLandmarker.createFromOptions(vision, {
            baseOptions: {
                modelAssetPath: `https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task`,
                delegate: "GPU"
            },
            runningMode: runningMode,
            numHands: 2,
            minHandDetectionConfidence: 0.5,
            minHandPresenceConfidence: 0.5,
            minTrackingConfidence: 0.5
        });
        console.log('✅ MediaPipe initialized');
        statusText.textContent = 'MediaPipe ready';
        return true;

    }
    catch (error) {
        console.error('❌ MediaPipe initialization failed:', error);
        statusText.textContent = 'MediaPipe failed to load';
        return false;
    }
};

async function initializeWebcam() {
    try {
        console.log('trying to start webcam')
        statusText.textContent = 'Requesting camera access...';

        const stream = await navigator.mediaDevices.getUserMedia({
            video: {
                width: 640,
                height: 480,
                facingMode: 'user'
            }
        });

        video.srcObject = stream;

        // Wait for video to load
        await new Promise((resolve) => {
            video.onloadedmetadata = () => {
                video.play();
                resolve();
            };
        });
        video.style.transform = 'scaleX(-1)';
        canvas.style.transform = 'scaleX(-1)';

        // Set canvas size to match video
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;

        console.log('✅ Webcam initialized');
        statusText.textContent = 'Camera active';
        document.querySelector('.status-badge').classList.add('active');
        document.querySelector('.video-overlay').classList.add('hidden');

        return true;

    } catch (error) {
        console.error('❌ Webcam access denied:', error);
        statusText.textContent = 'Camera access denied';
        return false;
    }
}

function drawHandLandmarks(results) {
    if (!results.landmarks || results.landmarks.length === 0) return;

    for (let i = 0; i < results.landmarks.length; i++) {
        const landmarks = results.landmarks[i];
        const handedness = results.handednesses[i]?.[0]?.categoryName; // 'Left' or 'Right'

        // Draw connections (hand skeleton)
        drawConnections(landmarks);
        // Draw landmark points
        drawLandmarkPoints(landmarks);


        // Draw hand label
        const wrist = landmarks[0];
        canvasCtx.fillStyle = '#00ff88';
        canvasCtx.font = '16px Arial';
        canvasCtx.fillText(
            `${handedness} Hand`,
            wrist.x * canvas.width,
            wrist.y * canvas.height - 10
        );
    }
    let temp1 = [results.landmarks[0][8].x, results.landmarks[0][8].y]
    let temp2 = [results.landmarks[0][4].x, results.landmarks[0][4].y]
    // console.log(calcDist(temp1, temp2))
}

// Draw connections between landmarks (hand skeleton)
function drawConnections(landmarks) {
    const connections = [
        [0, 1], [1, 2], [2, 3], [3, 4],           // Thumb
        [0, 5], [5, 6], [6, 7], [7, 8],           // Index finger
        [0, 9], [9, 10], [10, 11], [11, 12],      // Middle finger
        [0, 13], [13, 14], [14, 15], [15, 16],    // Ring finger
        [0, 17], [17, 18], [18, 19], [19, 20],    // Pinky
        [5, 9], [9, 13], [13, 17]                 // Palm
    ];

    canvasCtx.strokeStyle = '#00ff88';
    canvasCtx.lineWidth = 2;

    connections.forEach(([start, end]) => {
        const startPoint = landmarks[start];
        const endPoint = landmarks[end];

        canvasCtx.beginPath();
        canvasCtx.moveTo(startPoint.x * canvas.width, startPoint.y * canvas.height);
        canvasCtx.lineTo(endPoint.x * canvas.width, endPoint.y * canvas.height);
        canvasCtx.stroke();
    });
}

// Draw landmark points
function drawLandmarkPoints(landmarks) {
    let tip_cords = []; // tipcords = [[x,y],[x,y]],tips = 4,8,12,16,20
    landmarks.forEach((landmark, index) => {
        const x = landmark.x * canvas.width;
        const y = landmark.y * canvas.height;

        // Different colors for fingertips
        if ([4, 8, 12, 16, 20].includes(index)) {
            canvasCtx.fillStyle = '#00ccff'; // Fingertips
            tip_cords[tip_cords.length] = [landmark.x, landmark.y]
        } else {
            canvasCtx.fillStyle = '#00ff88'; // Other points
        }


        canvasCtx.beginPath();
        canvasCtx.arc(x, y, 5, 0, 2 * Math.PI);
        canvasCtx.fill();

        // Add glow effect
        canvasCtx.shadowBlur = 10;
        canvasCtx.shadowColor = canvasCtx.fillStyle;
        canvasCtx.fill();
        canvasCtx.shadowBlur = 0;
    });
    // console.log(tip_cords)

    let timestamp = performance.now();
    let cooldown = 600;

    let tap_occurs = checkTap(tip_cords, 0, 1);
    console.log('TIME : ', timestamp - lastActionTime > cooldown)
    if (timestamp - lastActionTime > cooldown) {

        console.log('connected_state = ', connected_state)
        console.log('tap_occurs = ', tap_occurs)
        if (connected_state && tap_occurs) {
            destroyjoin(landmarks[5], landmarks[8])
            connected_state = false;
            lastActionTime = timestamp;
        }
        else if (!connected_state && tap_occurs) {
            joinlandmarks(landmarks[4], landmarks[8])
            connected_state = true;
            lastActionTime = timestamp;
        }

    }
    if (connected_state && !tap_occurs) {
        joinlandmarks(landmarks[4], landmarks[8])
    }
}


function joinlandmarks(landa, landb) {
    console.log('joining landmarks ', landa, landb)
    canvasCtx.strokeStyle = '#00ff88';
    canvasCtx.lineWidth = 2;


    canvasCtx.beginPath();
    canvasCtx.moveTo(landa.x * canvas.width, landa.y * canvas.height);
    canvasCtx.lineTo(landb.x * canvas.width, landb.y * canvas.height);
    canvasCtx.stroke();


}

function destroyjoin(landa, landb) {
    console.log('destroying landmarks ', landa, landb)
    canvasCtx.strokeStyle = '#00ff88';
    canvasCtx.lineWidth = 0;


    canvasCtx.beginPath();
    canvasCtx.moveTo(landa.x * canvas.width, landa.y * canvas.height);
    canvasCtx.lineTo(landb.x * canvas.width, landb.y * canvas.height);
    canvasCtx.stroke();



}

function calcDist(cordsA, cordsB) {
    let [xA, yA] = cordsA;
    let [xB, yB] = cordsB;

    let x_diff_sqr = (xA - xB) * (xA - xB)
    let y_diff_sqr = (yA - yB) * (yA - yB)

    let dist = Math.abs(Math.sqrt(x_diff_sqr + y_diff_sqr))

    return dist;
}

function checkTap(tipcords, tip1_index, tip2_index) {
    // tipcords = [[x,y],[x,y]],tips = 4,8,12,16,20
    let thumcords = tipcords[tip1_index];
    let indexcords = tipcords[tip2_index];
    let dist = calcDist(thumcords, indexcords)
    let tap = false;
    if (dist < 0.07) {
        // console.log(true);
        tap = true;
    }
    else {
        // console.log(false);
        tap = false;
    }
    return tap;

}

function detectHands() {

    let results = null;
    if (!handLandmarker || !video.videoWidth) {
        requestAnimationFrame(detectHands);
        return;
    }
    const startTimeMs = performance.now(); // 12345.003

    if (lastVideoTime !== video.currentTime) { // New frame available
        processingCount++;
        lastVideoTime = video.currentTime;

        results = handLandmarker.detectForVideo(video, startTimeMs);
        // console.log(results)

        canvasCtx.clearRect(0, 0, canvas.width, canvas.height);

        if (results.landmarks && results.landmarks.length > 0) {
            drawHandLandmarks(results); // ~2 ms
            // const handData = extractHandData(results); // ~0.1 ms
            // updateHandUI(handData); // ~0.5 ms
            // const gesture = detectGesture(results.landmarks[0]); // ~0.5 ms
            // gestureDisplay.textContent = gesture;
        }

        const endTimeMs = performance.now(); // 12363.000
        const fps = 1000 / (endTimeMs - startTimeMs); // 1000 / 18 = 55.5 FPS
        fpsDisplay.textContent = Math.round(fps); // "56"
    } else {
        skippedCount++;
    }

    requestAnimationFrame(detectHands);

}


let lastVideoTime = -1;
let processingCount = 0;
let skippedCount = 0;
let connected_state = false;
let lastActionTime = 0;


createHandLandmarker();
const webcamReady = await initializeWebcam();
if (!webcamReady) {
    console.error('Failed to initialize webcam');
}
detectHands();
