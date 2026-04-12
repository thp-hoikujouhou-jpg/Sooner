import React from 'react';
import { Canvas } from '@react-three/fiber';
import GameScene from './GameScene';

export default function App() {
  return (
    <div style={{ width: '100vw', height: '100vh', margin: 0, padding: 0, overflow: 'hidden', backgroundColor: '#000' }}>
      <Canvas shadows camera={{ position: [0, 2, 5], fov: 60 }}>
        <GameScene />
      </Canvas>
      <div style={{ position: 'absolute', top: 20, left: 20, color: 'white', pointerEvents: 'none', textShadow: '1px 1px 2px black', fontFamily: 'sans-serif' }}>
        <h3 style={{ margin: 0 }}>3D Game</h3>
        <p style={{ margin: '5px 0' }}>ドラッグで視点移動 / スクロールでズーム</p>
      </div>
    </div>
  );
}
