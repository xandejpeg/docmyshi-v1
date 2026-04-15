"use client";

import { Suspense, useRef, useMemo, useState } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { Text, Float, Stars, OrbitControls } from "@react-three/drei";
import * as THREE from "three";
import type { RepoData } from "@/lib/store";

const LANG_COLORS: Record<string, string> = {
  TypeScript: "#3178c6",
  JavaScript: "#f1e05a",
  Python: "#3572A5",
  Rust: "#dea584",
  Go: "#00ADD8",
  Java: "#b07219",
  "C#": "#178600",
  C: "#555555",
  "C++": "#f34b7d",
  HTML: "#e34c26",
  CSS: "#563d7c",
  Ruby: "#701516",
  PHP: "#4F5D95",
  Swift: "#F05138",
  Kotlin: "#A97BFF",
  "Jupyter Notebook": "#DA5B0B",
};

interface RepoSceneProps {
  repos: RepoData[];
  onSelectRepo: (id: string) => void;
  isGenerating: boolean;
}

export function RepoScene({ repos, onSelectRepo, isGenerating }: RepoSceneProps) {
  return (
    <div className="w-full h-full">
      <Canvas
        camera={{ position: [0, 0, repos.length > 10 ? 18 : 12], fov: 60 }}
        dpr={[1, 2]}
        gl={{ antialias: true, alpha: true }}
        style={{ background: "transparent" }}
      >
        <Suspense fallback={null}>
          <ambientLight intensity={0.3} />
          <pointLight position={[10, 10, 10]} intensity={0.8} color="#0066ff" />
          <pointLight position={[-10, -5, -10]} intensity={0.4} color="#818cf8" />
          <Stars radius={100} depth={50} count={2500} factor={4} saturation={0} fade speed={1} />
          <GridFloor />
          {repos.map((repo, i) => (
            <RepoSphere
              key={repo.id}
              repo={repo}
              index={i}
              total={repos.length}
              onClick={() => !isGenerating && onSelectRepo(repo.id)}
            />
          ))}
          <OrbitControls
            enablePan={true}
            enableZoom={true}
            enableRotate={true}
            autoRotate
            autoRotateSpeed={0.3}
            maxDistance={40}
            minDistance={5}
          />
        </Suspense>
      </Canvas>
      {isGenerating && (
        <div className="absolute inset-0 flex items-center justify-center bg-background/60 backdrop-blur-sm z-10">
          <div className="text-center space-y-3">
            <div className="w-12 h-12 mx-auto border-2 border-accent border-t-transparent rounded-full animate-spin" />
            <p className="text-accent-glow font-medium">Analyzing repository...</p>
            <p className="text-muted text-sm">Generating documentation</p>
          </div>
        </div>
      )}
    </div>
  );
}

function GridFloor() {
  return (
    <gridHelper
      args={[50, 50, "#1a1a3e", "#0f0f2a"]}
      position={[0, -5, 0]}
      rotation={[0, 0, 0]}
    />
  );
}

interface RepoSphereProps {
  repo: RepoData;
  index: number;
  total: number;
  onClick: () => void;
}

function RepoSphere({ repo, index, total, onClick }: RepoSphereProps) {
  const meshRef = useRef<THREE.Mesh>(null);
  const [hovered, setHovered] = useState(false);

  // Position repos in a spiral layout
  const position = useMemo(() => {
    const spiralRadius = Math.sqrt(total) * 1.5;
    const goldenAngle = Math.PI * (3 - Math.sqrt(5));
    const angle = index * goldenAngle;
    const r = spiralRadius * Math.sqrt(index / total);
    const x = r * Math.cos(angle);
    const z = r * Math.sin(angle);
    const y = (Math.sin(index * 0.7) * 1.5);
    return [x, y, z] as [number, number, number];
  }, [index, total]);

  // Size based on repo size (log scale)
  const radius = useMemo(() => {
    const base = Math.log10(Math.max(repo.size, 10)) * 0.2;
    return Math.max(0.3, Math.min(1.2, base));
  }, [repo.size]);

  const color = LANG_COLORS[repo.language || ""] || "#0066ff";

  useFrame((_, delta) => {
    if (meshRef.current) {
      meshRef.current.rotation.y += delta * 0.2;
      if (hovered) {
        meshRef.current.scale.lerp(new THREE.Vector3(1.3, 1.3, 1.3), 0.1);
      } else {
        meshRef.current.scale.lerp(new THREE.Vector3(1, 1, 1), 0.1);
      }
    }
  });

  return (
    <Float speed={1.5} rotationIntensity={0.2} floatIntensity={0.5}>
      <group position={position}>
        <mesh
          ref={meshRef}
          onClick={(e) => {
            e.stopPropagation();
            onClick();
          }}
          onPointerOver={(e) => {
            e.stopPropagation();
            setHovered(true);
            document.body.style.cursor = "pointer";
          }}
          onPointerOut={() => {
            setHovered(false);
            document.body.style.cursor = "auto";
          }}
        >
          <sphereGeometry args={[radius, 32, 32]} />
          <meshStandardMaterial
            color={color}
            emissive={color}
            emissiveIntensity={hovered ? 0.6 : 0.2}
            roughness={0.3}
            metalness={0.7}
            transparent
            opacity={0.9}
          />
        </mesh>
        {/* Glow ring */}
        <mesh rotation={[Math.PI / 2, 0, 0]}>
          <ringGeometry args={[radius + 0.05, radius + 0.12, 64]} />
          <meshBasicMaterial
            color={color}
            transparent
            opacity={hovered ? 0.6 : 0.15}
            side={THREE.DoubleSide}
          />
        </mesh>
        {/* Label */}
        <Text
          position={[0, radius + 0.4, 0]}
          fontSize={0.22}
          color={hovered ? "#ffffff" : "#8888aa"}
          anchorX="center"
          anchorY="bottom"
          font={undefined}
        >
          {repo.name}
        </Text>
        {hovered && (
          <Text
            position={[0, -(radius + 0.3), 0]}
            fontSize={0.15}
            color="#8888aa"
            anchorX="center"
            anchorY="top"
            font={undefined}
          >
            {[repo.language, repo.stars > 0 ? `${repo.stars}` : null]
              .filter(Boolean)
              .join(" · ")}
          </Text>
        )}
      </group>
    </Float>
  );
}
