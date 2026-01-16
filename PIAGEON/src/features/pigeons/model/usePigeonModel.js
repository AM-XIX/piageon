import { useGLTF } from "@react-three/drei";
import { useMemo } from "react";
import * as THREE from "three";
import * as BufferGeometryUtils from "three/examples/jsm/utils/BufferGeometryUtils.js";

export function usePigeonModel() {
  const { scene } = useGLTF("/pigeon.glb");

  const meshData = useMemo(() => {
    const geometries = [];
    let mainMaterial = null;

    scene.traverse((child) => {
      if (child.isMesh) {
        const g = child.geometry.clone();
        
        child.updateMatrixWorld();
        g.applyMatrix4(child.matrixWorld);
        
        geometries.push(g);
        
        if (child.material && child.material.map && !mainMaterial) {
          mainMaterial = child.material.clone();
        }
      }
    });

    if (!mainMaterial) {
      scene.traverse((child) => {
        if (child.isMesh && !mainMaterial) mainMaterial = child.material.clone();
      });
    }

    if (geometries.length > 0) {
      let mergedGeometry = BufferGeometryUtils.mergeGeometries(geometries);
 
      mergedGeometry.deleteAttribute('skinIndex');
      mergedGeometry.deleteAttribute('skinWeight');
      
      mergedGeometry.center(); 

      if (mainMaterial) {
        mainMaterial.roughness = 0.8; 
        mainMaterial.metalness = 0.1; 
        mainMaterial.emissive = new THREE.Color(0x000000); 
      }

      return { 
        geometry: mergedGeometry, 
        material: mainMaterial 
      };
    }

    return { geometry: null, material: null };
  }, [scene]);

  return meshData;
}

useGLTF.preload("/pigeon.glb");