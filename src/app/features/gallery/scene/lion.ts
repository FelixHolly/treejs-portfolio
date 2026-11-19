import { Box3, Group, Mesh, MeshStandardMaterial, Vector3 } from "three";
import { DRACOLoader } from "three/examples/jsm/loaders/DRACOLoader.js";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { LION_YAW, ROTUNDA } from "./layout";

/** Multiplied into the scan's colours: warms the pale stone and leaves headroom for the key light. */
const STONE_TINT = 0xcbb893;

/** Loads the Viennese lion onto its plinth. Returns a function that cancels the load and frees the decoder. */
export function loadLion(
  assets: { dracoPath: string; lionModel: string },
  onReady: (lion: Group) => void,
  onFail: () => void,
): () => void {
  const draco = new DRACOLoader();
  draco.setDecoderPath(assets.dracoPath);
  const loader = new GLTFLoader();
  loader.setDRACOLoader(draco);
  let cancelled = false;

  loader.load(
    assets.lionModel,
    (gltf) => {
      if (cancelled) return;
      const model = gltf.scene;
      const bounds = new Box3().setFromObject(model);
      const size = bounds.getSize(new Vector3());
      const centre = bounds.getCenter(new Vector3());
      model.position.set(-centre.x, -bounds.min.y, -centre.z);
      model.traverse((child) => {
        const mesh = child as Mesh<never, MeshStandardMaterial>;
        if (!mesh.isMesh) return;
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        mesh.material.color.set(STONE_TINT);
        if (mesh.material.map) mesh.material.map.anisotropy = 8;
        if (mesh.material.normalMap) mesh.material.normalMap.anisotropy = 8;
      });

      const lion = new Group();
      lion.add(model);
      lion.scale.setScalar(ROTUNDA.lionHeight / size.y);
      lion.position.set(ROTUNDA.x, ROTUNDA.plinthHeight, 0);
      lion.rotation.y = LION_YAW;
      onReady(lion);
    },
    undefined,
    () => {
      if (!cancelled) onFail();
    },
  );

  return () => {
    cancelled = true;
    draco.dispose();
  };
}
