import { Box3, Group, Mesh, Vector3 } from "three";
import { DRACOLoader } from "three/examples/jsm/loaders/DRACOLoader.js";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { ROTUNDA } from "./layout";

/** Turns the statue to meet the visitor arriving at the entrance. */
const LION_YAW = Math.PI * 0.86;

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
        if ((child as Mesh).isMesh) {
          child.castShadow = true;
          child.receiveShadow = true;
        }
      });

      const lion = new Group();
      lion.add(model);
      lion.scale.setScalar(ROTUNDA.lionHeight / size.y);
      lion.position.y = ROTUNDA.plinthHeight;
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
