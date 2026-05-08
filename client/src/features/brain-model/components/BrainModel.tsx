import { Canvas, useFrame } from "@react-three/fiber";
import { useGLTF } from "@react-three/drei";
import { OrbitControls } from "@react-three/drei";
import { useRef, useMemo } from "react";
import * as THREE from "three";

function NeuralNetwork({ meshes }: { meshes: THREE.Mesh[] }) {
	const pointsRef = useRef<THREE.Points>(null);

	const { positions, linePositions } = useMemo(() => {
		if (meshes.length === 0)
			return {
				positions: new Float32Array(0),
				linePositions: new Float32Array(0),
			};

		const allWorldPositions: THREE.Vector3[] = [];
		const tempVec = new THREE.Vector3();
		const stride = 1000;

		for (const mesh of meshes) {
			if (!mesh.geometry) continue;
			mesh.updateMatrixWorld(true);
			const posAttribute = mesh.geometry.attributes.position;
			const vertexCount = posAttribute.count;

			for (let i = 0; i < vertexCount; i += stride) {
				tempVec.fromBufferAttribute(posAttribute as THREE.BufferAttribute, i);
				tempVec.applyMatrix4(mesh.matrixWorld);
				allWorldPositions.push(tempVec.clone());
			}
		}

		// Stwórz buffer pozycji dla punktów
		const positions = new Float32Array(allWorldPositions.length * 3);
		allWorldPositions.forEach((pos, i) => {
			positions[i * 3] = pos.x;
			positions[i * 3 + 1] = pos.y;
			positions[i * 3 + 2] = pos.z;
		});

		// Stwórz pozycje linii łączących bliskie punkty
		const connectionDistance = 0.5;
		const lineVerts: number[] = [];

		for (let i = 0; i < allWorldPositions.length; i++) {
			for (let j = i + 1; j < allWorldPositions.length; j++) {
				const dist = allWorldPositions[i].distanceTo(allWorldPositions[j]);
				if (dist < connectionDistance) {
					lineVerts.push(
						allWorldPositions[i].x,
						allWorldPositions[i].y,
						allWorldPositions[i].z,
						allWorldPositions[j].x,
						allWorldPositions[j].y,
						allWorldPositions[j].z,
					);
				}
			}
		}

		const linePositions = new Float32Array(lineVerts);

		return { positions, linePositions };
	}, [meshes]);

	useFrame(({ clock }) => {
		if (pointsRef.current) {
			const material = pointsRef.current.material as THREE.PointsMaterial;
			material.opacity = 0.6 + Math.sin(clock.elapsedTime * 2) * 0.2;
		}
	});

	if (positions.length === 0) return null;

	return (
		<>
			{/* Niebieskie kropki */}
			<points ref={pointsRef}>
				<bufferGeometry>
					<bufferAttribute
						attach="attributes-position"
						count={positions.length / 3}
						array={positions}
						itemSize={3}
					/>
				</bufferGeometry>
				<pointsMaterial
					color="#00aaff"
					size={0.07}
					transparent
					opacity={1}
					sizeAttenuation
				/>
			</points>
			{/* Linie łączące */}
			<lineSegments>
				<bufferGeometry>
					<bufferAttribute
						attach="attributes-position"
						count={linePositions.length / 3}
						array={linePositions}
						itemSize={3}
					/>
				</bufferGeometry>
				<lineBasicMaterial color="#0088cc" transparent opacity={0.1} />
			</lineSegments>
		</>
	);
}

function BrainMesh() {
	const { scene } = useGLTF("/models/brain_model.glb");

	const meshes = useMemo(() => {
		const found: THREE.Mesh[] = [];
		scene.traverse(child => {
			if (child instanceof THREE.Mesh) {
				// child.visible = false;
				child.material = new THREE.MeshBasicMaterial({
					color: "#00aaff",
					wireframe: true,
					transparent: true,
					opacity: 0.03,
				});
				found.push(child);
			}
		});
		return found;
	}, [scene]);

	return (
		<group>
			<primitive object={scene} />
			<NeuralNetwork meshes={meshes} />
		</group>
	);
}

function BrainModel() {
	return (
		<div className="h-72 w-72 md:h-125 md:w-125">
			<Canvas camera={{ position: [0, 0, 2.5] }}>
				<ambientLight intensity={1} />
				<BrainMesh />
				<OrbitControls
					enableZoom={false}
					enablePan={false}
					enableRotate={true}
				/>
			</Canvas>
		</div>
	);
}

export default BrainModel;
