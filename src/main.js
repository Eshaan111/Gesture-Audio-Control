import {
    HandLandmarker,
    FilesetResolver
} from "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.0";
const statusText = document.getElementById('status-text');
const statusBadge = document.querySelector('.status-badge'); // Class, not ID
const fpsDisplay = document.getElementById('fps');
const webcam = document.getElementById('webcam');
const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d'); // Canvas 2D context
const cameraMessage = document.getElementById('camera-message');
const videoOverlay = document.querySelector('.video-overlay'); // Class, not ID
// Hand info displays
const handPosition = document.getElementById('hand-position');
const gestureDisplay = document.getElementById('gesture');
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
const spectrumCanvas = document.getElementById('spectrum');
const spectrumCtx = spectrumCanvas.getContext('2d');
const latencyDisplay = document.getElementById('latency');
const video = document.getElementById('webcam');


const canvasCtx = canvas.getContext('2d');
let handLandmarker = undefined;
let runningMode = "VIDEO";
let webcamRunning = false;



class AudioController {
    constructor() {
        this.context = null;
        this.buffer = null;
        this.source = null;
        this.gainNode = null;
        this.filterNode = null;
        this.isPlaying = false;
        this.startTime = 0;
        this.pauseTime = 0;
    }

    async loadFile(file) {
        if (!this.context) {
            this.context = new AudioContext();
            console.log('Sample rate:', this.context.sampleRate, 'Hz');

            this.gainNode = this.context.createGain();
            this.gainNode.gain.value = 1.0;

            this.filterNode = this.context.createBiquadFilter();
            this.filterNode.type = 'lowpass';
            this.filterNode.frequency.value = 10000;
        }

        const arrayBuffer = await file.arrayBuffer();
        this.buffer = await this.context.decodeAudioData(arrayBuffer);

        console.log('✅ Audio loaded');
        console.log('Duration:', this.buffer.duration, 'seconds');
        console.log('Channels:', this.buffer.numberOfChannels);
        console.log('Sample rate:', this.buffer.sampleRate, 'Hz');

        // Reset state
        this.isPlaying = false;
        this.pauseTime = 0;
        this.startTime = 0;

        return this.buffer.duration;
    }

    play() {
        if (!this.buffer) {
            console.error('No audio loaded');
            return;
        }

        // Already playing?
        if (this.isPlaying) {
            console.log('Already playing');
            return;
        }

        // Stop old source if exists
        if (this.source) {
            try {
                this.source.stop();
            } catch (e) {
                // Source already stopped
            }
            this.source.onended = null;
        }

        const offset = this.pauseTime;
        console.log(`▶️ Playing from ${offset.toFixed(2)}s`);

        // Create source
        this.source = this.context.createBufferSource();
        this.source.buffer = this.buffer;

        // Connect graph
        this.source.connect(this.filterNode);
        this.filterNode.connect(this.gainNode);
        this.gainNode.connect(this.context.destination);

        // Start playback
        this.source.start(0, offset);
        this.startTime = this.context.currentTime - offset;
        this.isPlaying = true;

        // Handle natural end
        this.source.onended = () => {
            if (this.isPlaying) {
                console.log('🏁 Playback finished');
                this.isPlaying = false;
                this.pauseTime = 0;
                this.startTime = 0;
            }
        };
    }

    pause() {
        if (!this.buffer) {
            console.error('No audio loaded');
            return;
        }

        if (!this.isPlaying) {
            console.log('Not playing');
            return;
        }

        console.log('⏸️ Pausing...');

        // Calculate position
        this.pauseTime = this.context.currentTime - this.startTime;

        // ✅ CRITICAL: Set false BEFORE stopping
        this.isPlaying = false;

        // Stop playback
        if (this.source) {
            try {
                this.source.stop();
            } catch (e) {
                console.error('Stop error:', e);
            }
        }

        console.log(`⏸️ Paused at ${this.pauseTime.toFixed(2)}s`);
    }

    stop() {
        if (!this.buffer) {
            console.error('No audio loaded');
            return;
        }

        console.log('⏹️ Stopping...');

        // Set false before stopping
        this.isPlaying = false;

        // Stop source
        if (this.source) {
            try {
                this.source.stop();
            } catch (e) {
                // Already stopped
            }
            this.source.onended = null;
        }

        // Reset to beginning
        this.pauseTime = 0;
        this.startTime = 0;

        console.log('⏹️ Stopped');
    }

    getCurrentTime() {
        if (!this.buffer) return 0;

        if (this.isPlaying) {
            const current = this.context.currentTime - this.startTime;
            return Math.max(0, Math.min(current, this.buffer.duration));
        }

        return this.pauseTime;
    }

    setVolume(value) {
        if (this.gainNode) {
            this.gainNode.gain.value = value;
        }
    }

    setFilter(frequency) {
        if (this.filterNode) {
            this.filterNode.frequency.value = frequency;
        }
    }
}





audioUpload.addEventListener('change', async (event) => {
    const file = event.target.files[0];

    if (file && file.type.startsWith('audio/')) {
        const audioController = new AudioController();
        await audioController.loadFile(file)
        playBtn.disabled = false;
        pauseBtn.disabled = false;
        stopBtn.disabled = false;
        resetBtn.disabled = false;

        playBtn.addEventListener('click', () => {
            audioController.play();
            console.log('▶️ Playing');
        });

        pauseBtn.addEventListener('click', () => {
            audioController.pause();
            console.log('⏸️ Paused');
        });

        stopBtn.addEventListener('click', () => {
            audioController.stop();
            console.log('⏹️ Stopped');
        });

        resetBtn.addEventListener('click', () => {
            audioController.stop();
            console.log('🔄 Reset');
        });

        audioController.play()
    };

})




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
        drawLandmarkPoints(landmarks, handedness);


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

function tappingLogic(landmarks, handedness, tap_occurs) {

    let timestamp = performance.now();
    let cooldown = 600;
    console.log('TIME : ', timestamp - lastActionTime > cooldown)
    if (handedness == 'Left') {
        if (timestamp - lastActionTime > cooldown) {

            console.log('left connected_state = ', left_connected_state)
            console.log('tap_occurs = ', tap_occurs)
            if (left_connected_state && tap_occurs) {
                destroyjoin(landmarks[5], landmarks[8])
                left_connected_state = false;
                lastActionTime = timestamp;
            }
            else if (!left_connected_state && tap_occurs) {
                joinlandmarks(landmarks[4], landmarks[8])
                left_connected_state = true;
                lastActionTime = timestamp;
            }
        }
        if (left_connected_state && !tap_occurs) {
            joinlandmarks(landmarks[4], landmarks[8])
        }
    }
    else if (handedness == 'Right') {
        if (timestamp - lastActionTime > cooldown) {

            console.log('right connected_state = ', right_connected_state)
            console.log('tap_occurs = ', tap_occurs)
            if (right_connected_state && tap_occurs) {
                destroyjoin(landmarks[5], landmarks[8])
                right_connected_state = false;
                lastActionTime = timestamp;
            }
            else if (!right_connected_state && tap_occurs) {
                joinlandmarks(landmarks[4], landmarks[8])
                right_connected_state = true;
                lastActionTime = timestamp;
            }
        }
        if (right_connected_state && !tap_occurs) {
            joinlandmarks(landmarks[4], landmarks[8])
        }
    }
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
function drawLandmarkPoints(landmarks, handedness) {
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
    let tap_occurs = checkTap(tip_cords, 0, 1);
    tappingLogic(landmarks, handedness, tap_occurs)


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
let left_connected_state = false;
let right_connected_state = false;
let lastActionTime = 0;


createHandLandmarker();
const webcamReady = await initializeWebcam();
if (!webcamReady) {
    console.error('Failed to initialize webcam');
}
detectHands();
