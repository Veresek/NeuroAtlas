import { Canvas } from "@react-three/fiber";
import { useGLTF, OrbitControls } from "@react-three/drei";
import { useMemo } from "react";
import * as THREE from "three";
import surfaceMeshNames from "@/data/mesh.json";
import { meshMapping } from "@/data/meshMapping";
import { useBrainHighlight } from "@/hooks/useBrainHighlight";
import { brainSections } from "@/data/brainSections";
import type { BrainSectionName } from "@/data/brainSections";

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
		const isRegionHighlight = typeof highlightedArea === 'string' && (highlightedArea in brainSections);
		const highlightedRegionIds = isRegionHighlight ? brainSections[highlightedArea as BrainSectionName] : [];

		scene.traverse(child => {
			if (child instanceof THREE.Mesh) {
				let isHighlighted = false;

				if (highlightedArea) {
					if (typeof highlightedArea === 'string') {
						isHighlighted = meshMapping[child.name]?.displayName === highlightedArea ||
							(isRegionHighlight && highlightedRegionIds.includes(child.name));
					} else if (Array.isArray(highlightedArea)) {
						isHighlighted = highlightedArea.some(area => {
							// Check if the area exactly matches a section defined in brainSections.ts
							if (area in brainSections && brainSections[area as BrainSectionName].includes(child.name)) {
								return true;
							}

							// Check if the area matches a specific mesh display name (or substring)
							const displayName = meshMapping[child.name]?.displayName;
							if (displayName) {
								const lowerArea = area.toLowerCase();
								const lowerDisplay = displayName.toLowerCase();

								// Direct or substring match
								if (lowerDisplay.includes(lowerArea) || lowerArea.includes(lowerDisplay)) return true;
							}
							return false;
						});
					}
				}

				if (surfaceSet.has(child.name) || isHighlighted) {
					const color = isHighlighted ? "#ff00aa" : "#00aaff";
					const opacity = isHighlighted ? 0.6 : (highlightedArea ? 0.03 : 0.07);

					child.material = new THREE.MeshBasicMaterial({
						color: color,
						wireframe: true,
						transparent: true,
						opacity: opacity,
						side: THREE.FrontSide,
						depthWrite: false,
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
		<div className="w-auto h-full max-w-full max-h-full aspect-square relative">
			<Canvas camera={{ position: [0, 0, 2.5] }}>
				<ambientLight intensity={1} />
				<BrainMesh />
				<OrbitControls
					enableZoom={true}
					enablePan={true}
					enableRotate={true}
					minDistance={2.2}
					maxDistance={5.0}
				/>
			</Canvas>
		</div>
	);
}

export default BrainModel;
