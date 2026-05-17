import { Canvas } from "@react-three/fiber";
import { useGLTF, OrbitControls } from "@react-three/drei";
import { useMemo } from "react";
import * as THREE from "three";
import surfaceMeshNames from "@/data/mesh.json";
import { meshMapping } from "@/data/meshMapping";
import { useBrainHighlight } from "@/hooks/useBrainHighlight";

useGLTF.preload(`${import.meta.env.BASE_URL}models/brain_model_draco.glb`);

function BrainMesh() {
	const { highlightedArea } = useBrainHighlight();
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
				const isHighlighted = highlightedArea && meshMapping[child.name]?.displayName === highlightedArea;
				
				if (surfaceSet.has(child.name) || isHighlighted) {
					const color = isHighlighted ? "#ff00aa" : "#00aaff";
					const opacity = isHighlighted ? 0.6 : (highlightedArea ? 0.03 : 0.07);

					child.material = new THREE.MeshBasicMaterial({
						color: color,
						wireframe: true,
						transparent: true,
						opacity: opacity,
						side: THREE.FrontSide,
					});
					child.visible = true;
					child.frustumCulled = false;
				} else {
					child.visible = false;
				}
			}
		});
	}, [scene, surfaceSet, highlightedArea]);

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
