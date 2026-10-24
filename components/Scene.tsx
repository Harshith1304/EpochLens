"use client";
import { Canvas, useFrame } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import * as THREE from "three";

// A slowly turning chakra: 24 spokes, a double rim and tilted orbit rings with beads.
// Built from thin lines so it reads as a technical drawing and stays clear of the text.
const PAL = {
  dark: { main: new THREE.Color("#d9a441"), soft: new THREE.Color("#4aa58c") },
  light: { main: new THREE.Color("#8c2f28"), soft: new THREE.Color("#b8872e") },
};

function ring(r: number, n = 128, z = 0): Float32Array {
  const a = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) { const t = (i / n) * Math.PI * 2; a.set([Math.cos(t) * r, Math.sin(t) * r, z], i * 3); }
  return a;
}
function spokes(r0: number, r1: number, count: number): Float32Array {
  const a = new Float32Array(count * 6);
  for (let i = 0; i < count; i++) {
    const t = (i / count) * Math.PI * 2, c = Math.cos(t), s = Math.sin(t);
    a.set([c * r0, s * r0, 0, c * r1, s * r1, 0], i * 6);
  }
  return a;
}
function ticks(r0: number, r1: number, count: number): Float32Array { return spokes(r0, r1, count); }
const geo = (arr: Float32Array) => { const g = new THREE.BufferGeometry(); g.setAttribute("position", new THREE.BufferAttribute(arr, 3)); return g; };

function Chakra({ dark, seed, still }: { dark: boolean; seed: number; still: boolean }) {
  const root = useRef<THREE.Group>(null);
  const wheel = useRef<THREE.Group>(null);
  const orbitA = useRef<THREE.Group>(null);
  const orbitB = useRef<THREE.Group>(null);
  const m1 = useRef<THREE.LineBasicMaterial>(null);
  const m2 = useRef<THREE.LineBasicMaterial>(null);
  const bead = useRef<THREE.MeshBasicMaterial>(null);
  const g = useMemo(() => ({
    rimOuter: geo(ring(2.0)), rimInner: geo(ring(1.82)), hub: geo(ring(0.22)), hub2: geo(ring(0.38)),
    spokes: geo(spokes(0.38, 1.82, 24)), ticks: geo(ticks(1.88, 1.97, 96)), orbitA: geo(ring(2.55)), orbitB: geo(ring(3.05)),
  }), []);
  useFrame((s, dt) => {
    const pal = dark ? PAL.dark : PAL.light, k = Math.min(1, dt * 3);
    m1.current?.color.lerp(pal.main, k); m2.current?.color.lerp(pal.soft, k); bead.current?.color.lerp(pal.main, k);
    if (!still) {
      if (wheel.current) wheel.current.rotation.z += dt * 0.12;
      if (orbitA.current) orbitA.current.rotation.z -= dt * 0.18;
      if (orbitB.current) orbitB.current.rotation.z += dt * 0.1;
    }
    if (wheel.current) wheel.current.rotation.z += (seed * 0.0006) * 0; // seed reserved for per-year variation
    if (root.current) {
      root.current.rotation.y += (s.pointer.x * 0.5 - root.current.rotation.y) * k * 0.4;
      root.current.rotation.x += (-s.pointer.y * 0.35 - 0.35 - root.current.rotation.x) * k * 0.4;
    }
  });
  const bd = (a: number, r: number) => [Math.cos(a) * r, Math.sin(a) * r, 0] as [number, number, number];
  return (
    <group ref={root} position={[1.9, -0.2, 0]} scale={0.95}>
      <group ref={wheel}>
        <lineLoop geometry={g.rimOuter}><lineBasicMaterial ref={m1} transparent opacity={0.85} /></lineLoop>
        <lineLoop geometry={g.rimInner}><lineBasicMaterial color="#888" transparent opacity={0.35} /></lineLoop>
        <lineLoop geometry={g.hub}><lineBasicMaterial color="#888" transparent opacity={0.5} /></lineLoop>
        <lineLoop geometry={g.hub2}><lineBasicMaterial color="#888" transparent opacity={0.35} /></lineLoop>
        <lineSegments geometry={g.spokes}><lineBasicMaterial color="#888" transparent opacity={0.45} /></lineSegments>
        <lineSegments geometry={g.ticks}><lineBasicMaterial color="#888" transparent opacity={0.4} /></lineSegments>
      </group>
      <group ref={orbitA} rotation={[1.1, 0.3, 0]}>
        <lineLoop geometry={g.orbitA}><lineBasicMaterial ref={m2} transparent opacity={0.55} /></lineLoop>
        {[0, 2.1, 4.2].map((a) => <mesh key={a} position={bd(a, 2.55)}><sphereGeometry args={[0.06, 12, 12]} /><meshBasicMaterial ref={a === 0 ? bead : undefined} color="#d9a441" /></mesh>)}
      </group>
      <group ref={orbitB} rotation={[0.6, -0.5, 0.4]}>
        <lineLoop geometry={g.orbitB}><lineBasicMaterial color="#888" transparent opacity={0.25} /></lineLoop>
        {[1, 3.4].map((a) => <mesh key={a} position={bd(a, 3.05)}><sphereGeometry args={[0.045, 12, 12]} /><meshBasicMaterial color="#888" /></mesh>)}
      </group>
    </group>
  );
}

export default function Scene({ dark, seed }: { dark: boolean; seed: number }) {
  const still = typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  return (
    <div className="scene" aria-hidden>
      <Canvas dpr={[1, 1.75]} camera={{ position: [0, 0, 7], fov: 45 }} gl={{ antialias: true, alpha: true }}>
        <Chakra dark={dark} seed={seed} still={still} />
      </Canvas>
    </div>
  );
}
