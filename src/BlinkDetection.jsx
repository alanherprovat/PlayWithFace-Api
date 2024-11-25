// src/components/BlinkDetector.jsx
import React, { useEffect, useRef, useState } from 'react';
import * as faceapi from 'face-api.js';
import { detectFace } from './Blink_ExpressionFunction';

const styles = {
  container: {
    position: 'relative',
    // width: '360px',
    // height: '640px',
    width: '640px',
    height: '360px',
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


const BlinkDetection = ({cameraStream, setCameraStream, blinkCount, setBlinkCount, faceExpression,setFaceExpression}) => {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const [isLoading, setIsLoading] = useState(true);
  const [videoFile, setVideoFile] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [error, setError] = useState(null);
  const isPlayingRef = useRef(false);
  const blinkCountRef = useRef(blinkCount);
  const faceExpressionRef = useRef('');

  const ratioListLeft = []
  const ratioListRight = []
  var leftEyeRatioAvg=50;
  var rightEyeRatioAvg=50;


  let blinkInProgress = false;

  // Threshold for determining if eye is open or closed
const EAR_THRESHOLD = 0.267; // Tune this threshold based on testing
const EAR_CONSEC_FRAMES = 5; // Number of consecutive frames below threshold to detect blink

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
    const startDetection = async () => {
      // Ensure models are loaded before starting detection
      await loadModels();
      
      // Start continuous detection using requestAnimationFrame
      detectionRef.current.animationFrame = requestAnimationFrame(()=>
        detectFace(cameraStream,setCameraStream,blinkCountRef,blinkCount,setBlinkCount,
          faceExpressionRef,faceExpression,setFaceExpression,ratioListLeft,ratioListRight,leftEyeRatioAvg,
          rightEyeRatioAvg,blinkInProgress,EAR_THRESHOLD,EAR_CONSEC_FRAMES,leftEyeClosedFrames,rightEyeClosedFrames,
          videoRef,canvasRef,detectionRef,leftEyePoints,isPlayingRef,isPlaying,setIsPlaying
        )
    );
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

  useEffect(() => {
    blinkCountRef.current = blinkCount;
    if(blinkCount>=2 && faceExpressionRef.current=="happy"){
      console.log("inside Smile!!")
      setFaceExpression("happy")
    }
}, [blinkCount]);

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
            setIsPlaying(false);  
            // Update state for UI
        } else {
            console.log('Attempting to play video');
            // setIsPlaying(true);
            videoRef.current.play()
                .then(() => {
                    isPlayingRef.current = true;  // Update ref
                    setIsPlaying(true);  // Update state for UI

                    detectFace(cameraStream,setCameraStream,blinkCountRef,blinkCount,setBlinkCount,
                      faceExpressionRef,faceExpression,setFaceExpression,ratioListLeft,ratioListRight,leftEyeRatioAvg,
                      rightEyeRatioAvg,blinkInProgress,EAR_THRESHOLD,EAR_CONSEC_FRAMES,leftEyeClosedFrames,rightEyeClosedFrames,
                      videoRef,canvasRef,detectionRef,leftEyePoints,isPlayingRef,isPlaying,setIsPlaying
                    )
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

  const handleVideoPlay = () => {
    console.log('Video play event triggered');
    isPlayingRef.current = true;
    setIsPlaying(true);
   
    detectFace(cameraStream,setCameraStream,blinkCountRef,blinkCount,setBlinkCount,
      faceExpressionRef,faceExpression,setFaceExpression,ratioListLeft,ratioListRight,leftEyeRatioAvg,
      rightEyeRatioAvg,blinkInProgress,EAR_THRESHOLD,EAR_CONSEC_FRAMES,leftEyeClosedFrames,rightEyeClosedFrames,
      videoRef,canvasRef,detectionRef,leftEyePoints,isPlayingRef,isPlaying,setIsPlaying
    )
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

      detectFace(cameraStream,setCameraStream,blinkCountRef,blinkCount,setBlinkCount,
        faceExpressionRef,faceExpression,setFaceExpression,ratioListLeft,ratioListRight,leftEyeRatioAvg,
        rightEyeRatioAvg,blinkInProgress,EAR_THRESHOLD,EAR_CONSEC_FRAMES,leftEyeClosedFrames,rightEyeClosedFrames,
        videoRef,canvasRef,detectionRef,leftEyePoints,isPlayingRef,isPlaying,setIsPlaying
      )

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


      {cameraStream ?

      (

     <div style={{
          position: 'relative',
          width:"640px",
          height:"480px"
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

      )
      :
      (
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
      )
      
      }

            <div style={styles.stats}>
                <label style={{ marginRight: "20px" }}>
                    <input
                        type="radio"
                        name="action1"
                        value="blink"
                        checked={blinkCount>=2}
                        onChange={()=>{}}
                        style={{ marginRight: "5px" }}
                    />
                    Please Blink Two Times
                </label>
                <label>
                    <input
                        type="radio"
                        name="action2"
                        value="smile"
                        checked={blinkCountRef.current>=2 && faceExpressionRef.current=="happy"}  //Expression: ${faceExpressionRef.current}
                        onChange={()=>  videoRef.current.pause()}
                        style={{ marginRight: "5px" }}
                    />
                    Please Smile
                </label>
            </div>
           

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


export default BlinkDetection;