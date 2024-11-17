// src/components/BlinkDetector.jsx
import React, { useEffect, useRef, useState } from 'react';
import * as faceapi from 'face-api.js';

const styles = {
  container: {
    position: 'relative',
    // width: '360px',
    // height: '640px',
    // margin: '20px auto',
  },
  video: {
    position: 'absolute',
    width: '100%',
    height: '100%',
    objectFit: 'contain',
  },
  canvas: {
    position: 'absolute',
    width: '100%',
    height: '100%',
    justifyContent:'center',
    alignItems:'center'
  },
  controls: {
    marginTop: '20px',
    display: 'flex',
    gap: '10px',
    justifyContent: 'center',
  },
  stats: {
    textAlign: 'center',
    marginTop: '10px',
  },
  fileInput: {
    marginBottom: '20px',
    textAlign: 'center',
  }
};


const BlinkDetector = () => {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const [isLoading, setIsLoading] = useState(true);
  const [blinkCount, setBlinkCount] = useState(0);
  const [videoFile, setVideoFile] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [error, setError] = useState(null);
  const isPlayingRef = useRef(false);
  const blinkCountRef = useRef(blinkCount);
  const faceExpressionRef = useRef('');
  const [cameraStream, setCameraStream] = useState(null);

  let blinkInProgress = false;

  // Threshold for determining if eye is open or closed
const EAR_THRESHOLD = 0.26; // Tune this threshold based on testing
const EAR_CONSEC_FRAMES = 3; // Number of consecutive frames below threshold to detect blink

let leftEyeClosedFrames = 0;
let rightEyeClosedFrames = 0;

  
  const detectionRef = useRef({
    ratioList: [],
    counter: 0,
    color: '#0000e6',
    animationFrame: null
  });

  const leftEyePoints = [36,37,38, 40, 41];

useEffect(() => {
    blinkCountRef.current = blinkCount;
}, [blinkCount]);

useEffect(() => {
    const startDetection = async () => {
      // Ensure models are loaded before starting detection
      await loadModels();
      
      // Start continuous detection using requestAnimationFrame
      detectionRef.current.animationFrame = requestAnimationFrame(detectFace);
    };
  

    startDetection();
  
    return () => {
      // Cleanup: Cancel animation frame and remove video URL
      if (detectionRef.current.animationFrame) {
        cancelAnimationFrame(detectionRef.current.animationFrame);
      }
      if (videoFile) {
        URL.revokeObjectURL(videoFile);
      }
      if (videoRef.current) {
        videoRef.current.removeEventListener('loadeddata', startDetection);
      }
    };
  }, []);


  const loadModels = async () => {
    try {
      const MODEL_URL = `${window.location.origin}/models`;
      console.log('Loading models from:', MODEL_URL);
      
      await faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL);
      console.log('Tiny Face Detector loaded');
      
      await faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL);
      console.log('Face Landmarks model loaded');
      
      await faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL);
      console.log('Face Recognition model loaded');

      await faceapi.nets.ssdMobilenetv1.loadFromUri('/models')
      console.log('Face Recognition ssdMobilenetv1 model loaded');
      
      await faceapi.nets.faceExpressionNet.loadFromUri('/models');
      console.log('faceExpressionNet model loaded');

      setIsLoading(false);
    } catch (error) {
      console.error('Error loading models:', error);
      setError(`Failed to load face detection models: ${error.message}`);
    }
  };

  const handleFileUpload = (event) => {
    const file = event.target.files[0];
    if (file) {
      // Revoke previous video URL if exists
      if (videoFile) {
        URL.revokeObjectURL(videoFile);
      }

      const url = URL.createObjectURL(file);
      setVideoFile(url);
      setBlinkCount(0);
      setError(null);
      detectionRef.current.ratioList = [];
      detectionRef.current.counter = 0;
      setIsPlaying(false);
      
      if (detectionRef.current.animationFrame) {
        cancelAnimationFrame(detectionRef.current.animationFrame);
      }

      // Reset video element
      if (videoRef.current) {
        videoRef.current.pause();
        videoRef.current.currentTime = 0;
      }
    }
  };

const handlePlayPause = () => {
    if (videoRef.current) {
        console.log('handlePlayPause triggered');
        console.log('Current isPlaying state:', isPlaying);
        
        if (isPlaying) {
            console.log('Attempting to pause video');
            videoRef.current.pause();
            isPlayingRef.current = false;  // Update ref
            setIsPlaying(false);  // Update state for UI
        } else {
            console.log('Attempting to play video');
            // setIsPlaying(true);
            videoRef.current.play()
                .then(() => {
                    isPlayingRef.current = true;  // Update ref
                    setIsPlaying(true);  // Update state for UI
                    detectFace();
                })
                .catch(err => {
                    console.error('Error playing video:', err);
                    setError('Failed to play video');
                    isPlayingRef.current = false;
                    setIsPlaying(false);
                });
        }
    }
};


  const getLeftEyebrow = (landmarks) => {
    // Left eyebrow points in the 68-point model are 17–21
    return landmarks.slice(17, 22);
  };

  // Function to calculate EAR for an eye
  const calculateEAR = (eye) => {
    const horizontalDist = Math.hypot(eye[0].x - eye[3].x, eye[0].y - eye[3].y);
    const verticalDist1 = Math.hypot(eye[1].x - eye[5].x, eye[1].y - eye[5].y);
    const verticalDist2 = Math.hypot(eye[2].x - eye[4].x, eye[2].y - eye[4].y);
  
    // EAR formula
    return (verticalDist1 + verticalDist2) / (2.0 * horizontalDist);
  };


  const detectFace = async () => {
    if (!videoRef.current || !canvasRef.current || !isPlayingRef.current) {
      console.log('Detection skipped:', {
        videoRef: !!videoRef.current,
        canvasRef: !!canvasRef.current,
        isPlaying
      });
      return;
    }

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    let targetWidth=0,targetHeight=0;
    console.log("vedio dimention",video.videoWidth,video.videoHeight)

    if (cameraStream){
        targetWidth = 640;
        targetHeight = 360;

        console.log("camera stream true!!")
    }
    else{
      targetWidth = 640;
      targetHeight = 360;
    }

    // // Define resized dimensions for faster processing (e.g., 640x360 for HD videos)
    // if(video.videoWidth>video.videoHeight){
    //      targetWidth = 360;
    //      targetHeight = 640;
    // }
    // else{
    //      targetWidth = video.videoWidth>640? 640: video.videoWidth;
    //      targetHeight = video.videoHeight>360? 360:video.videoHeight;
    // }



    // // Ensure video dimensions match canvas
    // canvas.width = video.videoWidth;
    // canvas.height = video.videoHeight;



    try {
      // Add dimensions check
      if (video.videoWidth === 0 || video.videoHeight === 0) {
        console.log('Video dimensions not ready:', {
          width: video.videoWidth,
          height: video.videoHeight
        });
        detectionRef.current.animationFrame = requestAnimationFrame(detectFace);
        return;
      }

  // Scale down the video and set the canvas to the new size
  canvas.width = targetWidth;
  canvas.height = targetHeight;
  // ctx.drawImage(video, 0, 0, targetWidth, targetHeight);


  //utilizing TinyFaceDetector model
  const detection = await faceapi
  .detectSingleFace(video, new faceapi.TinyFaceDetectorOptions({
    inputSize: 224,  // Choose a small input size for faster processing
    scoreThreshold: 0.5,
  }))
  .withFaceLandmarks().withFaceExpressions();

  // //utilizing SsdMobilenetv10 model
  // const detection = await faceapi.detectAllFaces(video, new faceapi.SsdMobilenetv1Options(
  //   {
  //     minConfidence: 0.5,
  //     maxResults: 100
  //   }
  // )) .withFaceLandmarks().withFaceExpressions();
  

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    if (detection) {

      // For Tiny Face Model
      // Find the expression with the maximum probability
      const [maxExpression, maxProbability] = Object.entries(detection?.expressions).reduce(
        (max, [expression, probability]) => probability > max[1] ? [expression, probability] : max,
        ['', -Infinity]
      );
      faceExpressionRef.current = maxExpression;

      console.log('Face detected for Tiny Model:', {
          score: detection.detection.score,
          box: detection.detection.box,
          landmarksLength: detection.landmarks.positions.length,
          landmarks: detection.landmarks,
          Expression:maxExpression,
          Expression_Probability: maxProbability,
      });





// //Face detected for SSD Mobile NEt

// const detectionObject = detection[0]; // Get the first detection only
// if (detectionObject) {
//     const { detection, landmarks,expressions} = detectionObject;

//     // Check if detection and landmarks exist
//     if (detection && landmarks && expressions ) {

//       // Find the expression with the maximum probability
//       const maxExpression = Object.keys(expressions).reduce((a, b) => 
//         expressions[a] > expressions[b] ? a : b
//       );

//         console.log(`Score: `,detection?.score);
//         console.log("Expression:",maxExpression);
//         console.log("Expression Probability", expressions[maxExpression])
//         // console.log("Box:", box);
//         console.log("Landmarks:",landmarks?.positions?.length);

//         faceExpressionRef.current = maxExpression;
        
//     } else {
//         console.warn("Detection or landmarks data is missing.");
//     }
// } else {
//     console.warn("No detection object found in objectDetections.");
// }


    
    // Get left and right eye landmarks for tiny face model
    const leftEye = detection.landmarks.positions.slice(36, 42);
    const rightEye = detection.landmarks.positions.slice(42, 48);

    // // Get left and right eye landmarks for ssdMobilenet model
    // const leftEye = detectionObject.landmarks.positions.slice(36, 42);
    // const rightEye = detectionObject.landmarks.positions.slice(42, 48);


    // Calculate EAR for both eyes
    const leftEAR = calculateEAR(leftEye);
    const rightEAR = calculateEAR(rightEye);
    // Check if eyes are closed based on EAR threshold
    const isLeftEyeClosed = leftEAR < EAR_THRESHOLD;
    const isRightEyeClosed = rightEAR < EAR_THRESHOLD;

  // Increment closed frames count if either eye is detected as closed
  if (isLeftEyeClosed) {
    leftEyeClosedFrames += 1;
  } else {
    leftEyeClosedFrames = 0;
  }

  if (isRightEyeClosed) {
    rightEyeClosedFrames += 1;
  } else {
    rightEyeClosedFrames = 0;
  }

   // Detect a blink if either eye has been below the threshold for enough consecutive frames
   const isBlinkDetected = leftEyeClosedFrames >= EAR_CONSEC_FRAMES || rightEyeClosedFrames >= EAR_CONSEC_FRAMES;
   
    // If a blink is detected and no blink is in progress, increment the blink count
    if (isBlinkDetected && !blinkInProgress) {
        blinkInProgress = true;  // Set blink in progress to true
        setBlinkCount((prev) => prev + 1);
      }
    
      // Reset the blink in progress flag once the eye is fully open
      if (!isLeftEyeClosed && !isRightEyeClosed) {
        blinkInProgress = false;
      }


      console.log("leftEAR",leftEAR)
      console.log("rightEAR",rightEAR)
      console.log("Blink Detection Result",isBlinkDetected)
      console.log("blink Count",blinkCount)
      console.log("leftEyeClosedFrames",leftEyeClosedFrames)
      console.log("rightEyeClosedFrames",rightEyeClosedFrames)


        // Draw landmarks with different colors for better visibility for Tiny Model
        const landmarks = detection.landmarks;
        const positions = landmarks.positions;

        
        // // Draw landmarks with different colors for better visibility for SSDMobileNEt Model
        // const landmarks = detectionObject.landmarks; 
        // const positions = landmarks.positions;



        const resizedDetections = faceapi.resizeResults(detection, { width: targetWidth, height: targetHeight });
        faceapi.draw.drawDetections(canvas, resizedDetections);
        faceapi.draw.drawFaceLandmarks(canvas, resizedDetections);




      // Draw each of the 68 landmarks
      ctx.fillStyle = '#0000ff'; // Blue for face landmarks
      positions.forEach(point => {
        ctx.beginPath();
        ctx.arc(point.x, point.y, 2, 0, 2 * Math.PI);
        ctx.fill();
      });
      

        // Draw eyes specifically
        ctx.fillStyle = '#ff0000';
        leftEyePoints.forEach(point => {
          ctx.beginPath();
          ctx.arc(positions[point].x, positions[point].y, 2, 0, 2 * Math.PI);
          ctx.fill();
        });

        // Draw blink count
        ctx.font = '20px K2d-Bold';
        ctx.fillStyle = detectionRef.current.color;
        ctx.fillText(`Blink Count: ${blinkCountRef.current}`, 50, 30);

         // Draw blink count
         ctx.font = '20px Arial';
         ctx.fillStyle = detectionRef.current.color;
         ctx.fillText(`Expression: ${faceExpressionRef.current}`, 50, 50);

      } else {
        console.log('No face detected in frame');
      }
      setTimeout(()=>{
        detectionRef.current.animationFrame = requestAnimationFrame(detectFace);
      },0.5) //5ms of delay

      // detectionRef.current.animationFrame = requestAnimationFrame(detectFace);
      

    } catch (error) {
      console.error('Error in face detection:', error);
      setError(`Error processing video frame: ${error.message}`);
      detectionRef.current.animationFrame = requestAnimationFrame(detectFace);
    }
  };

  const handleVideoPlay = () => {
    console.log('Video play event triggered');
    isPlayingRef.current = true;
    setIsPlaying(true);
    detectFace();
  };
  const handleVideoPause = () => {
    console.log('Video pause event triggered');
    isPlayingRef.current = false;
    setIsPlaying(false);
    if (detectionRef.current.animationFrame) {
      cancelAnimationFrame(detectionRef.current.animationFrame);
    }
  };

  const enableCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });

      if (videoRef.current) {
        videoRef.current.srcObject = stream; // Attach the stream to the video element
      }
      setCameraStream(stream);

      isPlayingRef.current = true;
      setIsPlaying(true);
      detectFace();

    } catch (error) {
      console.error("Error accessing the webcam:", error);
      alert("Could not access the camera. Please check permissions.");
    }
  };

  const disableCamera = () => {
    if (cameraStream) {
      // Stop all video tracks
      cameraStream.getTracks().forEach((track) => track.stop());
      videoRef.current.srcObject = null;
      setCameraStream(null);
    }
    if (videoRef.current) {
      videoRef.current.currentTime = 0;
      blinkCountRef.current=0
      setBlinkCount(0);
    }

  };


  if (isLoading) {
    return <div>Loading face detection models...</div>;
  }

  return (
    <div>
      <div style={styles.fileInput}>
        <input 
          type="file" 
          accept="video/*" 
          onChange={handleFileUpload}
          title="Choose a video file"
        />
      </div>


      {cameraStream?(
         <div style={{
          position: 'relative',
          width: videoRef.current?.width || 640, // Fallback width if `videoRef.current` is undefined
          height: videoRef.current?.height || 360, // Fallback height   

       }}>
       {error && <div style={{ color: 'red', marginBottom: '10px' }}>{error}</div>}
       <video
         ref={videoRef}
         style={styles.video}
         autoPlay
         playsInline
         onPlay={handleVideoPlay}
         onPause={handleVideoPause}
         onEnded={handleVideoPause}
         // width="640"
         // height="480"
       />
       <canvas
         ref={canvasRef}
         style={styles.canvas}
         // width="640"
         // height="480"
       />
     </div>

      ):(
        <div style={{
          position: 'relative',
          width: videoRef.current?.width || 360, // Fallback width if `videoRef.current` is undefined
          height: videoRef.current?.height || 640 // Fallback height
      
       }}>
       {error && <div style={{ color: 'red', marginBottom: '10px' }}>{error}</div>}
       <video
         ref={videoRef}
         style={styles.video}
         src={videoFile}
         playsInline
         onPlay={handleVideoPlay}
         onPause={handleVideoPause}
         onEnded={handleVideoPause}
         // width="640"
         // height="480"
       />
       <canvas
         ref={canvasRef}
         style={styles.canvas}
         // width="640"
         // height="480"
       />
        </div>
      )}
     

      <div style={styles.controls}>
        <button onClick={handlePlayPause} disabled={!videoFile}  style={{ margin: "10px", padding: "10px" }}>
          {isPlaying ? 'Pause' : 'Play'}
        </button>
        <button  style={{ margin: "10px", padding: "10px" }}
          onClick={() => {
            if (videoRef.current) {
              videoRef.current.currentTime = 0;
              blinkCountRef.current=0
              setBlinkCount(0);
            }
          }}
          disabled={!videoFile}
        >
          Reset
        </button>
        <button onClick={enableCamera} style={{ margin: "10px", padding: "10px" }}>
          Enable Web Camera
        </button>
        <button onClick={disableCamera} style={{ margin: "10px", padding: "10px" }}>
          Disable Web Camera
        </button>
      </div>
      
      <div style={styles.stats}>
        <p>Blink Count: {blinkCount}</p>
      </div>
    </div>
  );
};

export default BlinkDetector;