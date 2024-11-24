 // Blink_ExpressionFunction.jsx
import * as faceapi from 'face-api.js';

  // Function to calculate EAR for an eye
  const calculateEAR = (eye) => {
    const horizontalDist = Math.hypot(eye[0].x - eye[3].x, eye[0].y - eye[3].y);
    const verticalDist1 = Math.hypot(eye[1].x - eye[5].x, eye[1].y - eye[5].y);
    const verticalDist2 = Math.hypot(eye[2].x - eye[4].x, eye[2].y - eye[4].y);
  
    // EAR formula
    return (verticalDist1 + verticalDist2) / (2.0 * horizontalDist);
  };
  const calculateAverage = (list, newValue) => {
    list.push(newValue);
    if (list.length > 3) {
        list.shift();
    }
    return list.reduce((acc, val) => acc + val, 0) / list.length;
};


  export const detectFace = async (cameraStream,setCameraStream,blinkCountRef,blinkCount,setBlinkCount,
    faceExpressionRef,faceExpression,setFaceExpression,ratioListLeft,ratioListRight,leftEyeRatioAvg,
    rightEyeRatioAvg,blinkInProgress,EAR_THRESHOLD,EAR_CONSEC_FRAMES,leftEyeClosedFrames,rightEyeClosedFrames,
    videoRef,canvasRef,detectionRef,leftEyePoints,isPlayingRef,isPlaying,setIsPlaying) => {

      if (!videoRef?.current || !canvasRef?.current || !isPlayingRef?.current) {
        console.log('Detection skipped:', {
          videoRef: !!videoRef?.current,
          canvasRef: !!canvasRef?.current,
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
        targetWidth = video.videoWidth;
        targetHeight = video.videoHeight;
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
        detectionRef.current.animationFrame = requestAnimationFrame(()=>
          detectFace(cameraStream,setCameraStream,blinkCountRef,blinkCount,setBlinkCount,
            faceExpressionRef,faceExpression,setFaceExpression,ratioListLeft,ratioListRight,leftEyeRatioAvg,
            rightEyeRatioAvg,blinkInProgress,EAR_THRESHOLD,EAR_CONSEC_FRAMES,leftEyeClosedFrames,rightEyeClosedFrames,
            videoRef,canvasRef,detectionRef,leftEyePoints,isPlayingRef,isPlaying,setIsPlaying
          ));
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

    ratioListLeft.push(leftEAR)
    ratioListRight.push(rightEAR)

    leftEyeRatioAvg = calculateAverage(ratioListLeft, leftEAR);
    rightEyeRatioAvg = calculateAverage(ratioListRight, rightEAR);
  
           

    console.log("Left Eye Ratio Average:",leftEyeRatioAvg)
    console.log("Right Eye Ratio Averag",rightEyeRatioAvg)
    console.log("Combined average",(leftEyeRatioAvg+rightEyeRatioAvg)/2)
    
    // Check if eyes are closed based on EAR threshold
    // const isLeftEyeClosed = leftEAR < EAR_THRESHOLD;
    // const isRightEyeClosed = rightEAR < EAR_THRESHOLD;



    const isLeftEyeClosed = (leftEyeRatioAvg+rightEyeRatioAvg)/2 < EAR_THRESHOLD;
    const isRightEyeClosed = (leftEyeRatioAvg+rightEyeRatioAvg)/2 < EAR_THRESHOLD;

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
   const isBlinkDetected = cameraStream? (leftEyeClosedFrames >= EAR_CONSEC_FRAMES || rightEyeClosedFrames >= EAR_CONSEC_FRAMES) :
   (leftEyeClosedFrames >= 5 || rightEyeClosedFrames >= 5);
   
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



        const resizedDetections = faceapi.resizeResults(detection, { width: 640, height: 360 });
        faceapi.draw.drawDetections(canvas, resizedDetections);
        faceapi.draw.drawFaceLandmarks(canvas, resizedDetections);




      // // Draw each of the 68 landmarks
      // ctx.fillStyle = '#0000ff'; // Blue for face landmarks
      // positions.forEach(point => {
      //   ctx.beginPath();
      //   ctx.arc(point.x, point.y, 2, 0, 2 * Math.PI);
      //   ctx.fill();
      // });
      

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

         // Draw Expression
         ctx.font = '20px Arial';
         ctx.fillStyle = detectionRef.current.color;
         ctx.fillText(`Expression: ${faceExpressionRef.current}`, 50, 50);

      } else {
        console.log('No face detected in frame');
      }
      setTimeout(()=>{
        detectionRef.current.animationFrame = requestAnimationFrame(()=>
          detectFace(cameraStream,setCameraStream,blinkCountRef,blinkCount,setBlinkCount,
            faceExpressionRef,faceExpression,setFaceExpression,ratioListLeft,ratioListRight,leftEyeRatioAvg,
            rightEyeRatioAvg,blinkInProgress,EAR_THRESHOLD,EAR_CONSEC_FRAMES,leftEyeClosedFrames,rightEyeClosedFrames,
            videoRef,canvasRef,detectionRef,leftEyePoints,isPlayingRef,isPlaying,setIsPlaying
          ));
      },0.5) //5ms of delay

      // detectionRef.current.animationFrame = requestAnimationFrame(detectFace);
      

    } catch (error) {
      console.error('Error in face detection:', error);
      setError(`Error processing video frame: ${error.message}`);
      detectionRef.current.animationFrame = requestAnimationFrame(()=>
        detectFace(cameraStream,setCameraStream,blinkCountRef,blinkCount,setBlinkCount,
          faceExpressionRef,faceExpression,setFaceExpression,ratioListLeft,ratioListRight,leftEyeRatioAvg,
          rightEyeRatioAvg,blinkInProgress,EAR_THRESHOLD,EAR_CONSEC_FRAMES,leftEyeClosedFrames,rightEyeClosedFrames,
          videoRef,canvasRef,detectionRef,leftEyePoints,isPlayingRef,isPlaying,setIsPlaying
        ));
    }


  };