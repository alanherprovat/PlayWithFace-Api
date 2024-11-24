import { useEffect, useState } from 'react'
import './App.css'
import BlinkDetection from './BlinkDetection'
function App() {
  const [blinkCount, setBlinkCount] = useState(0);
  const [faceExpression,setFaceExpression]= useState('');
  const [cameraStream, setCameraStream] = useState(null);

  useEffect(() => {
    if(blinkCount >= 2 && faceExpression === "happy"){
      console.log("Go Next");
    }
}, [blinkCount]);

  return (
    <div className="App">
      <h1>Blink Detection App</h1>
      {/* <BlinkDetector /> */}
      <BlinkDetection 
        blinkCount={blinkCount} 
        setBlinkCount={setBlinkCount} 
        faceExpression={faceExpression} 
        setFaceExpression={setFaceExpression}
        cameraStream={cameraStream}
        setCameraStream={setCameraStream}
      />
    </div>
  );
}

export default App;