import * as THREE from 'three';

export const EMPLOYEE_STATES: {
  WORKING: string;
  STANDING_UP: string;
  WALKING_TO_POI: string;
  AT_POI: string;
  WALKING_BACK: string;
  SITTING_DOWN: string;
};

export const EMPLOYEE_PROFILES: any[];
export const STUDIO_PROFILES: any[];

export class Employee {
  constructor(index: number, profile: any, workstation: any, officeAPI: any);
  group: THREE.Group;
  profile: any;
  state: string;
  workstation: any;
  discussedBy: Employee | null;
  setSelected(isSelected: boolean): void;
  getStatusLabel(): string;
  commandStandAndWalk(specificPOI?: any, colleagueToDiscuss?: Employee | null): void;
  commandReturnToWork(): void;
  update(
    dt: number,
    elapsedTime: number,
    autoSchedule: boolean,
    canStartBreak?: () => boolean,
    pickColleague?: (requester: Employee) => Employee | null
  ): void;
}
