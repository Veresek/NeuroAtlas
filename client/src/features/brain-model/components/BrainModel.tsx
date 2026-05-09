import { Canvas } from "@react-three/fiber";
import { useGLTF, OrbitControls } from "@react-three/drei";
import { useMemo } from "react";
import * as THREE from "three";
import surfaceMeshNames from "@/data/mesh.json";

useGLTF.preload(`${import.meta.env.BASE_URL}models/brain_model_draco.glb`);

function BrainMesh() {
	const { scene } = useGLTF(
		`${import.meta.env.BASE_URL}models/brain_model_draco.glb`,
		`${import.meta.env.BASE_URL}draco/gltf`,
	);

	const surfaceSet = useMemo(
		() => new Set(surfaceMeshNames.surface_meshes),
		[],
	);

	useMemo(() => {
		scene.traverse(child => {
			if (child instanceof THREE.Mesh) {
				if (surfaceSet.has(child.name)) {
					child.material = new THREE.MeshBasicMaterial({
						color: "#00aaff",
						wireframe: true,
						transparent: true,
						opacity: 0.07,
						side: THREE.FrontSide,
					});
					child.frustumCulled = false;
				} else {
					child.visible = false;
				}
			}
		});
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
