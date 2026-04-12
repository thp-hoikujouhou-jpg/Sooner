import React, { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Sky, OrbitControls } from '@react-three/drei';
import * as THREE from 'three';

export default function GameScene() {
  const cubeRef = useRef<THREE.Mesh>(null);

  useFrame((state, delta) => {
    if (cubeRef.current) {
      cubeRef.current.rotation.x += delta * 0.5;
      cubeRef.current.rotation.y += delta * 0.5;
    }
  });

  return (
    <>
      {/* 画面が青一色にならないよう、自然な空を描画します */}
      <Sky distance={450000} sunPosition={[10, 20, 10]} inclination={0} azimuth={0.25} />

      {/* ライティングの設定 */}
      <ambientLight intensity={0.5} />
      <directionalLight 
        position={[10, 20, 10]} 
        intensity={1.5} 
        castShadow 
        shadow-mapSize-width={1024}
        shadow-mapSize-height={1024}
      />

      {/* 地面 */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -1, 0]} receiveShadow>
        <planeGeometry args={[100, 100]} />
        <meshStandardMaterial color="#4caf50" />
      </mesh>

      {/* 中央のオブジェクト */}
      <mesh ref={cubeRef} castShadow>
        <boxGeometry args={[1, 1, 1]} />
        <meshStandardMaterial color="#ff9800" />
      </mesh>

      {/* カメラ操作 */}
      <OrbitControls makeDefault />
    </>
  );
}
