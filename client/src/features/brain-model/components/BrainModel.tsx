import { Canvas } from "@react-three/fiber";
import { useGLTF } from "@react-three/drei";
import { OrbitControls } from "@react-three/drei";
import { useMemo } from "react";
import * as THREE from "three";
import surfaceMeshNames from "@/data/mesh.json";

function BrainMesh() {
	const { scene } = useGLTF(
		`${import.meta.env.BASE_URL}models/brain_model.glb`,
	);

	const surfaceSet = useMemo(
		() => new Set(surfaceMeshNames.surface_meshes),
		[],
	);

	const surfaceMeshes = useMemo(() => {
		const found: THREE.Mesh[] = [];
		scene.traverse(child => {
			if (child instanceof THREE.Mesh) {
				if (surfaceSet.has(child.name)) {
					child.material = new THREE.MeshBasicMaterial({
						color: "#00aaff",
						wireframe: true,
						transparent: true,
						opacity: 0.07,
					});
					child.frustumCulled = false;
					found.push(child);
				} else {
					child.visible = false;
				}
			}
		});
		return found;
	}, [scene, surfaceSet]);

	return <primitive object={scene} />;
}

function BrainModel() {
	return (
		<div className="h-72 w-72 md:h-125 md:w-125 relative">
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
