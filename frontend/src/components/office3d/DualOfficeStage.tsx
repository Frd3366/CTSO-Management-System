import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { buildOfficeScene } from './officeScene.js';
import { Employee, EMPLOYEE_PROFILES, STUDIO_PROFILES, EMPLOYEE_STATES } from './employee.js';

export interface OfficeAvatarData {
  id: string;
  name: string;
  role: string;
  shiftCode: string;
  jobdeskCode: string;
  jobdeskColor?: string;
  location: 'Badung' | 'Denpasar';
  isLive: boolean;
}

export interface OfficeTVStats {
  dateLabel: string;
  totalOnDuty: number;
  badungCount: number;
  denpasarCount: number;
  jobdeskBars: Array<{ code: string; count: number; color?: string }>;
  tickerText: string;
}

interface DualOfficeStageProps {
  resetCounter: number;
  mainRoster: OfficeAvatarData[];
  studioRoster: OfficeAvatarData[];
  selectedJobdesk: string | null;
  tvStats: OfficeTVStats;
}

// Tightly-framed 2.5D Orthographic Isometric presets (fills card cleanly, zero wasted empty background, ALL staff visible!)
const DEFAULT_VIEWS = {
  main: {
    pos: new THREE.Vector3(-15, 16.5, 4.5),
    target: new THREE.Vector3(0.3, 0.7, 0.0),
    frustumSize: 11.4,
  },
  studio: {
    pos: new THREE.Vector3(2.7, 11.2, 20.5),
    target: new THREE.Vector3(2.7, 0.85, 10.6),
    frustumSize: 7.2,
  },
};

export const DualOfficeStage: React.FC<DualOfficeStageProps> = ({
  resetCounter,
  mainRoster,
  studioRoster,
  selectedJobdesk,
  tvStats,
}) => {
  const mainContainerRef = useRef<HTMLDivElement | null>(null);
  const studioContainerRef = useRef<HTMLDivElement | null>(null);
  const cam1ReadoutRef = useRef<HTMLSpanElement | null>(null);
  const cam2ReadoutRef = useRef<HTMLSpanElement | null>(null);
  const resetFnsRef = useRef<Array<() => void>>([]);

  // Live refs read inside the Three.js animation loop without tearing down WebGL
  const mainRosterRef = useRef<OfficeAvatarData[]>(mainRoster);
  const studioRosterRef = useRef<OfficeAvatarData[]>(studioRoster);
  const selectedJobdeskRef = useRef<string | null>(selectedJobdesk);
  const tvStatsRef = useRef<OfficeTVStats>(tvStats);

  mainRosterRef.current = mainRoster;
  studioRosterRef.current = studioRoster;
  selectedJobdeskRef.current = selectedJobdesk;
  tvStatsRef.current = tvStats;

  const [inspectedMain, setInspectedMain] = useState<(OfficeAvatarData & { status: string }) | null>(null);
  const [inspectedStudio, setInspectedStudio] = useState<(OfficeAvatarData & { status: string }) | null>(null);

  useEffect(() => {
    if (resetCounter > 0) {
      resetFnsRef.current.forEach((fn) => fn());
    }
  }, [resetCounter]);

  useEffect(() => {
    const mainEl = mainContainerRef.current;
    const studioEl = studioContainerRef.current;
    if (!mainEl || !studioEl) return;

    const scene = new THREE.Scene();
    const office = buildOfficeScene(scene);

    const mainEmployees = EMPLOYEE_PROFILES.map((profile, idx) => {
      const emp = new Employee(idx, profile, office.mainWorkstations[idx], office);
      scene.add(emp.group);
      return emp;
    });

    const studioEmployees = STUDIO_PROFILES.map((profile, idx) => {
      const emp = new Employee(10 + idx, profile, office.studioWorkstations[idx], office);
      scene.add(emp.group);
      return emp;
    });

    const employees = [...mainEmployees, ...studioEmployees];

    const kickTimer = window.setTimeout(() => {
      if (mainRosterRef.current.length > 2) mainEmployees[2].commandStandAndWalk(office.pois[0]);
      if (mainRosterRef.current.length > 7) mainEmployees[7].commandStandAndWalk(null, mainEmployees[5]);
      if (studioRosterRef.current.length > 1) studioEmployees[1].commandStandAndWalk(office.studioPois[0]);
    }, 800);

    const isSlotActive = (emp: Employee) => {
      if (emp.workstation.room === 'studio') {
        const idx = studioEmployees.indexOf(emp);
        return idx >= 0 && idx < studioRosterRef.current.length;
      }
      const idx = mainEmployees.indexOf(emp);
      return idx >= 0 && idx < mainRosterRef.current.length;
    };

    const getAvatarMeta = (emp: Employee): OfficeAvatarData | null => {
      if (emp.workstation.room === 'studio') {
        const idx = studioEmployees.indexOf(emp);
        return studioRosterRef.current[idx] || null;
      }
      const idx = mainEmployees.indexOf(emp);
      return mainRosterRef.current[idx] || null;
    };

    const MAX_AWAY_EMPLOYEES = 3;
    const getAwayEmployees = (room: string) =>
      employees.filter((e) => e.workstation.room === room && isSlotActive(e) && e.state !== EMPLOYEE_STATES.WORKING);

    const canStartBreakFor = (emp: Employee) => {
      if (!isSlotActive(emp)) return false;
      const room = emp.workstation.room;
      const maxAway = room === 'studio' ? 1 : MAX_AWAY_EMPLOYEES;
      return getAwayEmployees(room).length < maxAway;
    };

    const pickColleagueForDiscussion = (requester: Employee) => {
      const candidates = employees.filter(
        (e) =>
          e !== requester &&
          isSlotActive(e) &&
          e.workstation.room === requester.workstation.room &&
          e.state === EMPLOYEE_STATES.WORKING &&
          !e.discussedBy
      );
      if (candidates.length === 0) return null;
      return candidates[Math.floor(Math.random() * candidates.length)];
    };

    const raycaster = new THREE.Raycaster();
    const pointer = new THREE.Vector2();

    const createStage = (
      containerEl: HTMLDivElement,
      roomKey: 'main' | 'studio',
      readoutEl: HTMLSpanElement | null
    ) => {
      const width = containerEl.clientWidth || 640;
      const height = containerEl.clientHeight || 420;
      const aspect = width / height;
      const viewCfg = DEFAULT_VIEWS[roomKey];
      const f = viewCfg.frustumSize;

      // True OrthographicCamera for crisp Hay Day 2.5D Isometric look (zero perspective distortion!)
      const camera = new THREE.OrthographicCamera(
        (-f * aspect) / 2,
        (f * aspect) / 2,
        f / 2,
        -f / 2,
        -40,
        120
      );
      camera.position.copy(viewCfg.pos);
      camera.zoom = 1.0;
      camera.updateProjectionMatrix();

      const renderer = new THREE.WebGLRenderer({ antialias: true });
      renderer.setSize(width, height);
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
      renderer.shadowMap.enabled = true;
      renderer.shadowMap.type = THREE.PCFSoftShadowMap;
      renderer.toneMapping = THREE.ACESFilmicToneMapping;
      renderer.toneMappingExposure = 1.08;
      renderer.domElement.style.display = 'block';
      renderer.domElement.style.width = '100%';
      renderer.domElement.style.height = '100%';
      containerEl.appendChild(renderer.domElement);

      const controls = new OrbitControls(camera, renderer.domElement);
      controls.enableDamping = true;
      controls.dampingFactor = 0.07;
      controls.target.copy(viewCfg.target);
      controls.minZoom = 0.65;
      controls.maxZoom = 2.6;
      controls.maxPolarAngle = Math.PI / 2 - 0.12;
      controls.minPolarAngle = 0.35;
      controls.update();

      // Click-to-inspect any staff avatar in this stage
      let downPos = { x: 0, y: 0 };
      const onPointerDown = (ev: PointerEvent) => {
        downPos = { x: ev.clientX, y: ev.clientY };
      };
      const onPointerUp = (ev: PointerEvent) => {
        if (Math.hypot(ev.clientX - downPos.x, ev.clientY - downPos.y) > 6) return;
        const rect = renderer.domElement.getBoundingClientRect();
        pointer.x = ((ev.clientX - rect.left) / rect.width) * 2 - 1;
        pointer.y = -((ev.clientY - rect.top) / rect.height) * 2 + 1;
        raycaster.setFromCamera(pointer, camera);

        const list = roomKey === 'main' ? mainEmployees : studioEmployees;
        const activeGroups = list.filter((e) => isSlotActive(e)).map((e) => e.group);
        const hits = raycaster.intersectObjects(activeGroups, true);
        if (hits.length > 0) {
          const emp = hits[0].object.userData.employee as Employee | undefined;
          const meta = emp ? getAvatarMeta(emp) : null;
          if (emp && meta) {
            const payload = { ...meta, status: emp.getStatusLabel() };
            if (roomKey === 'main') setInspectedMain(payload);
            else setInspectedStudio(payload);
            return;
          }
        }
        if (roomKey === 'main') setInspectedMain(null);
        else setInspectedStudio(null);
      };

      renderer.domElement.addEventListener('pointerdown', onPointerDown);
      renderer.domElement.addEventListener('pointerup', onPointerUp);

      const ro = new ResizeObserver(() => {
        const w = containerEl.clientWidth;
        const h = containerEl.clientHeight;
        if (w > 0 && h > 0) {
          const newAspect = w / h;
          camera.left = (-f * newAspect) / 2;
          camera.right = (f * newAspect) / 2;
          camera.top = f / 2;
          camera.bottom = -f / 2;
          camera.updateProjectionMatrix();
          renderer.setSize(w, h);
        }
      });
      ro.observe(containerEl);

      const resetCamera = () => {
        camera.position.copy(viewCfg.pos);
        camera.zoom = 1.0;
        camera.updateProjectionMatrix();
        controls.target.copy(viewCfg.target);
        controls.update();
      };

      const render = () => {
        const isMain = roomKey === 'main';
        const filterJd = selectedJobdeskRef.current;

        office.mainRoomGroup.visible = isMain;
        office.studioRoomGroup.visible = !isMain;

        mainEmployees.forEach((e, idx) => {
          const meta = mainRosterRef.current[idx];
          e.group.visible = isMain && Boolean(meta);
          e.setSelected(Boolean(filterJd && meta && meta.jobdeskCode === filterJd));
        });

        studioEmployees.forEach((e, idx) => {
          const meta = studioRosterRef.current[idx];
          e.group.visible = !isMain && Boolean(meta);
          e.setSelected(Boolean(filterJd && meta && meta.jobdeskCode === filterJd));
        });

        controls.update();
        renderer.render(scene, camera);

        if (readoutEl) {
          const az = Math.round(THREE.MathUtils.radToDeg(controls.getAzimuthalAngle()));
          const pol = Math.round(THREE.MathUtils.radToDeg(controls.getPolarAngle()));
          readoutEl.textContent = `${isMain ? 'Kamera 1' : 'Kamera 2'}: ${az}°, ${pol}°`;
        }
      };

      const dispose = () => {
        renderer.domElement.removeEventListener('pointerdown', onPointerDown);
        renderer.domElement.removeEventListener('pointerup', onPointerUp);
        ro.disconnect();
        controls.dispose();
        renderer.dispose();
        if (renderer.domElement.parentNode === containerEl) {
          containerEl.removeChild(renderer.domElement);
        }
      };

      return { render, resetCamera, dispose };
    };

    const stageMain = createStage(mainEl, 'main', cam1ReadoutRef.current);
    const stageStudio = createStage(studioEl, 'studio', cam2ReadoutRef.current);
    resetFnsRef.current = [stageMain.resetCamera, stageStudio.resetCamera];

    let simTime = 0;
    let screenUpdateAccum = 0;
    let rafId = 0;
    const clock = new THREE.Clock();

    const animate = () => {
      rafId = window.requestAnimationFrame(animate);
      const dt = Math.min(clock.getDelta(), 0.05);
      simTime += dt;

      for (const emp of employees) {
        if (isSlotActive(emp)) {
          emp.update(dt, simTime, true, () => canStartBreakFor(emp), pickColleagueForDiscussion);
        }
      }

      if (office.updateEnvironment) {
        office.updateEnvironment(simTime);
      }

      screenUpdateAccum += dt;
      if (screenUpdateAccum >= 0.16) {
        screenUpdateAccum = 0;
        for (const ws of office.workstations) {
          const emp = employees.find((e) => e.workstation === ws);
          const isWorking = emp && isSlotActive(emp) ? emp.state === EMPLOYEE_STATES.WORKING : false;
          ws.screenController.draw(simTime, isWorking);
        }
        if (office.wallTV) {
          office.wallTV.draw(simTime, tvStatsRef.current);
        }
      }

      stageMain.render();
      stageStudio.render();
    };

    animate();

    return () => {
      window.clearTimeout(kickTimer);
      window.cancelAnimationFrame(rafId);
      resetFnsRef.current = [];
      stageMain.dispose();
      stageStudio.dispose();
    };
  }, []);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 w-full">
      {/* Stage 1: Kantor Utama (Badung Hub) */}
      <article className="relative h-[420px] sm:h-[470px] xl:h-[510px] rounded-2xl overflow-hidden bg-slate-900 border border-slate-200 dark:border-neutral-800 shadow-clean-xl">
        <div ref={mainContainerRef} className="absolute inset-0 w-full h-full cursor-grab active:cursor-grabbing" />
        <div className="pointer-events-none absolute top-3.5 left-4 right-4 z-10 flex items-center justify-between gap-2">
          <span className="px-3 py-1 rounded-full text-xs font-extrabold bg-[#FFD416] text-[#202020] shadow-gx">
            01 • Kantor Utama (Badung)
          </span>
          <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-[#202020]/85 text-white border border-white/15 backdrop-blur-md">
            {mainRoster.length} Staff Bertugas
          </span>
        </div>

        {inspectedMain && (
          <div className="absolute bottom-12 left-4 right-4 z-10 flex items-center justify-between gap-2 px-3.5 py-2 rounded-xl bg-white/95 text-[#202020] border border-slate-200 shadow-clean-lg text-xs">
            <div className="flex items-center gap-2 min-w-0">
              <span className="w-2.5 h-2.5 rounded-full bg-[#FFD416] shrink-0" />
              <strong className="truncate">{inspectedMain.name}</strong>
              <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 font-bold text-[10.5px]">
                {inspectedMain.shiftCode}
              </span>
              <span className="px-2 py-0.5 rounded-md bg-[#FFF8C4] text-[#5E4C00] font-bold text-[10.5px]">
                {inspectedMain.jobdeskCode}
              </span>
            </div>
            <span className="text-[11px] text-slate-500 shrink-0">{inspectedMain.status}</span>
          </div>
        )}

        <div className="pointer-events-none absolute bottom-3 left-4 right-4 z-10 flex items-center justify-between">
          <span
            ref={cam1ReadoutRef}
            className="px-2.5 py-1 rounded-lg text-[11px] font-semibold tabular-nums text-white bg-[#202020]/75 border border-white/10 backdrop-blur-md"
          >
            Kamera 1: 0°, 0°
          </span>
          <span className="px-2.5 py-1 rounded-lg text-[11px] font-semibold text-slate-200 bg-[#202020]/75 border border-white/10 backdrop-blur-md">
            Klik staff / Geser kamera
          </span>
        </div>
      </article>

      {/* Stage 2: Ruang Kayu (Denpasar Hub) */}
      <article className="relative h-[420px] sm:h-[470px] xl:h-[510px] rounded-2xl overflow-hidden bg-slate-900 border border-slate-200 dark:border-neutral-800 shadow-clean-xl">
        <div ref={studioContainerRef} className="absolute inset-0 w-full h-full cursor-grab active:cursor-grabbing" />
        <div className="pointer-events-none absolute top-3.5 left-4 right-4 z-10 flex items-center justify-between gap-2">
          <span className="px-3 py-1 rounded-full text-xs font-extrabold bg-[#202020] text-[#FFD416] border border-[#FFD416]/40 shadow-clean-md">
            02 • Ruang Kayu (Denpasar)
          </span>
          <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-[#202020]/85 text-white border border-white/15 backdrop-blur-md">
            {studioRoster.length} Staff Bertugas
          </span>
        </div>

        {inspectedStudio && (
          <div className="absolute bottom-12 left-4 right-4 z-10 flex items-center justify-between gap-2 px-3.5 py-2 rounded-xl bg-white/95 text-[#202020] border border-slate-200 shadow-clean-lg text-xs">
            <div className="flex items-center gap-2 min-w-0">
              <span className="w-2.5 h-2.5 rounded-full bg-[#FFD416] shrink-0" />
              <strong className="truncate">{inspectedStudio.name}</strong>
              <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 font-bold text-[10.5px]">
                {inspectedStudio.shiftCode}
              </span>
              <span className="px-2 py-0.5 rounded-md bg-[#FFF8C4] text-[#5E4C00] font-bold text-[10.5px]">
                {inspectedStudio.jobdeskCode}
              </span>
            </div>
            <span className="text-[11px] text-slate-500 shrink-0">{inspectedStudio.status}</span>
          </div>
        )}

        <div className="pointer-events-none absolute bottom-3 left-4 right-4 z-10 flex items-center justify-between">
          <span
            ref={cam2ReadoutRef}
            className="px-2.5 py-1 rounded-lg text-[11px] font-semibold tabular-nums text-white bg-[#202020]/75 border border-white/10 backdrop-blur-md"
          >
            Kamera 2: 0°, 0°
          </span>
          <span className="px-2.5 py-1 rounded-lg text-[11px] font-semibold text-slate-200 bg-[#202020]/75 border border-white/10 backdrop-blur-md">
            Klik staff / Geser kamera
          </span>
        </div>
      </article>
    </div>
  );
};
