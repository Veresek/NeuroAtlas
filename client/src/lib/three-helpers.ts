import * as THREE from "three";

/**
 * Colors a mesh with the given color
 */
export function colorMesh(mesh: THREE.Mesh, color: THREE.Color | string): void {
	if (mesh.material) {
		if (Array.isArray(mesh.material)) {
			mesh.material.forEach(mat => {
				if ("color" in mat) {
					(mat as THREE.MeshStandardMaterial).color.set(color);
				}
			});
		} else {
			if ("color" in mesh.material) {
				(mesh.material as THREE.MeshStandardMaterial).color.set(color);
			}
		}
	}
}

/**
 * Resets a mesh to its original color
 */
export function resetMeshColor(
	mesh: THREE.Mesh,
	originalColor: THREE.Color,
): void {
	colorMesh(mesh, originalColor);
}

/**
 * Finds a mesh by name in a scene/group
 */
export function getMeshByName(
	scene: THREE.Group | THREE.Scene,
	name: string,
): THREE.Mesh | null {
	const object = scene.getObjectByName(name);
	return object && object instanceof THREE.Mesh ? object : null;
}
