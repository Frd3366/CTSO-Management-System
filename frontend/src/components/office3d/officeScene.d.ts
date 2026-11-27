import * as THREE from 'three';

export function buildOfficeScene(scene: THREE.Scene): {
  mainRoomGroup: THREE.Group;
  studioRoomGroup: THREE.Group;
  workstations: any[];
  mainWorkstations: any[];
  studioWorkstations: any[];
  pois: any[];
  studioPois: any[];
  studioCeiling: THREE.Group | null;
  wallTV: { group: THREE.Group; draw: (time: number, stats?: any) => void } | null;
  updateEnvironment: (time: number) => void;
  buildPathToPOI: (workstation: any, poi: any) => THREE.Vector3[];
  buildPathToDesk: (currentPos: THREE.Vector3, workstation: any, poi: any) => THREE.Vector3[];
};
