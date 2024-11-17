import { useState } from 'react'
import reactLogo from './assets/react.svg'
import viteLogo from '/vite.svg'
import './App.css'
import BlinkDetector from './BlinkDetector '
function App() {
  return (
    <div className="App">
      <h1>Blink Detection App</h1>
      <BlinkDetector />
    </div>
  );
}

export default App;