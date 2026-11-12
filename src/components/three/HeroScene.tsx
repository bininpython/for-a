'use client';

import { Suspense, useMemo, useRef, useState } from 'react';
import { Canvas, useFrame, type ThreeElements } from '@react-three/fiber';
import { Environment, Float } from '@react-three/drei';
import { useReducedMotion } from 'framer-motion';
import * as THREE from 'three';

/**
 * Composição 3D do hero: um halter central e anilhas orbitando, com
 * iluminação laranja da marca. Reage ao mouse com inclinação sutil.
 *
 * Desempenho: geometria primitiva (sem modelos externos para baixar),
 * `dpr` limitado, `frameloop="demand"` desligado apenas enquanto visível,
 * sombras desativadas e fallback para quem não tem WebGL ou prefere
 * menos movimento.
 */

const ORANGE = '#FF6500';
const ORANGE_2 = '#FF8500';

function Plate({
  position,
  radius,
  thickness,
  accent = false,
}: {
  position: [number, number, number];
  radius: number;
  thickness: number;
  accent?: boolean;
}) {
  return (
    <mesh position={position} rotation={[0, 0, Math.PI / 2]} castShadow={false}>
      <cylinderGeometry args={[radius, radius, thickness, 48]} />
      <meshStandardMaterial
        color={accent ? ORANGE : '#141414'}
        metalness={accent ? 0.55 : 0.9}
        roughness={accent ? 0.35 : 0.28}
        emissive={accent ? ORANGE : '#000000'}
        emissiveIntensity={accent ? 0.22 : 0}
      />
    </mesh>
  );
}

function Dumbbell(props: ThreeElements['group']) {
  const group = useRef<THREE.Group>(null);

  useFrame((state) => {
    if (!group.current) return;
    const t = state.clock.getElapsedTime();
    const { x, y } = state.pointer;
    // Inclinação suave seguindo o mouse + respiração contínua
    group.current.rotation.y += (x * 0.45 + t * 0.06 - group.current.rotation.y) * 0.04;
    group.current.rotation.x += (-y * 0.28 - group.current.rotation.x) * 0.04;
  });

  return (
    <group ref={group} {...props}>
      {/* Barra */}
      <mesh rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.1, 0.1, 3.6, 32]} />
        <meshStandardMaterial color="#8A8A8A" metalness={1} roughness={0.22} />
      </mesh>

      {/* Pegada texturizada */}
      <mesh rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.125, 0.125, 1.1, 32]} />
        <meshStandardMaterial color="#1C1C1C" metalness={0.3} roughness={0.85} />
      </mesh>

      {/* Anilhas — esquerda */}
      <Plate position={[-1.05, 0, 0]} radius={0.78} thickness={0.26} accent />
      <Plate position={[-1.42, 0, 0]} radius={0.6} thickness={0.22} />
      <Plate position={[-1.7, 0, 0]} radius={0.44} thickness={0.18} />

      {/* Anilhas — direita */}
      <Plate position={[1.05, 0, 0]} radius={0.78} thickness={0.26} accent />
      <Plate position={[1.42, 0, 0]} radius={0.6} thickness={0.22} />
      <Plate position={[1.7, 0, 0]} radius={0.44} thickness={0.18} />
    </group>
  );
}

function OrbitingPlate({
  radius,
  speed,
  size,
  tilt,
}: {
  radius: number;
  speed: number;
  size: number;
  tilt: number;
}) {
  const ref = useRef<THREE.Mesh>(null);
  const offset = useMemo(() => Math.random() * Math.PI * 2, []);

  useFrame((state) => {
    if (!ref.current) return;
    const t = state.clock.getElapsedTime() * speed + offset;
    ref.current.position.set(Math.cos(t) * radius, Math.sin(t * 0.7) * 1.2, Math.sin(t) * radius);
    ref.current.rotation.x = t * 0.6;
    ref.current.rotation.z = tilt + t * 0.3;
  });

  return (
    <mesh ref={ref}>
      <torusGeometry args={[size, size * 0.3, 16, 40]} />
      <meshStandardMaterial
        color="#1F1F1F"
        metalness={0.95}
        roughness={0.3}
        emissive={ORANGE}
        emissiveIntensity={0.08}
      />
    </mesh>
  );
}

function Scene({ reduceMotion }: { reduceMotion: boolean }) {
  return (
    <>
      <ambientLight intensity={0.35} />
      {/* Luz-chave laranja da marca */}
      <spotLight
        position={[6, 7, 6]}
        angle={0.5}
        penumbra={0.9}
        intensity={110}
        color={ORANGE_2}
        distance={30}
      />
      {/* Contraluz fria para separar do fundo preto */}
      <spotLight
        position={[-7, -3, -5]}
        angle={0.6}
        penumbra={1}
        intensity={55}
        color="#4A6FFF"
        distance={30}
      />
      <pointLight position={[0, 0, 4]} intensity={18} color={ORANGE} distance={12} />

      {reduceMotion ? (
        <group rotation={[0.1, -0.5, 0.08]} scale={1.05}>
          <Dumbbell />
        </group>
      ) : (
        <>
          <Float speed={1.1} rotationIntensity={0.18} floatIntensity={0.5}>
            <Dumbbell scale={1.05} />
          </Float>
          <OrbitingPlate radius={3.5} speed={0.32} size={0.3} tilt={0.4} />
          <OrbitingPlate radius={4.2} speed={-0.24} size={0.22} tilt={1.2} />
          <OrbitingPlate radius={3.0} speed={0.45} size={0.16} tilt={2.1} />
        </>
      )}

      <Environment preset="night" />
    </>
  );
}

/** Fallback estático: gradiente da marca, sem WebGL. */
function HeroFallback() {
  return (
    <div
      aria-hidden
      className="absolute inset-0 overflow-hidden"
      style={{
        background:
          'radial-gradient(60% 60% at 60% 45%, rgba(255,101,0,0.22) 0%, rgba(255,101,0,0.05) 45%, transparent 70%)',
      }}
    >
      <div className="absolute right-[12%] top-1/2 h-56 w-56 -translate-y-1/2 rounded-full border border-hpe-orange/20 sm:h-80 sm:w-80" />
      <div className="absolute right-[18%] top-1/2 h-36 w-36 -translate-y-1/2 rounded-full border border-hpe-orange/30 sm:h-52 sm:w-52" />
    </div>
  );
}

function webglAvailable(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    const canvas = document.createElement('canvas');
    return Boolean(
      window.WebGLRenderingContext &&
        (canvas.getContext('webgl2') || canvas.getContext('webgl')),
    );
  } catch {
    return false;
  }
}

export default function HeroScene() {
  const reduceMotion = useReducedMotion() ?? false;
  const [failed, setFailed] = useState(false);
  const [supported] = useState(webglAvailable);

  if (!supported || failed) return <HeroFallback />;

  return (
    <div className="absolute inset-0">
      <Canvas
        camera={{ position: [0, 0.4, 7.5], fov: 42 }}
        dpr={[1, 1.75]}
        shadows={false}
        gl={{ antialias: true, powerPreference: 'high-performance', alpha: true }}
        onCreated={({ gl }) => {
          gl.toneMapping = THREE.ACESFilmicToneMapping;
        }}
        onError={() => setFailed(true)}
      >
        <Suspense fallback={null}>
          <Scene reduceMotion={reduceMotion} />
        </Suspense>
      </Canvas>
    </div>
  );
}
