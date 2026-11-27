import * as THREE from 'three';

/**
 * Creates a procedural tiled office carpet texture.
 */
function createFloorTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d');

  ctx.fillStyle = '#dfe5ec';
  ctx.fillRect(0, 0, 512, 512);

  const tile = 64;
  for (let y = 0; y < 512; y += tile) {
    for (let x = 0; x < 512; x += tile) {
      const alt = ((x / tile + y / tile) % 2) === 0;
      ctx.fillStyle = alt ? '#e4e9f0' : '#dce2ea';
      ctx.fillRect(x, y, tile, tile);
      ctx.strokeStyle = 'rgba(148, 163, 184, 0.25)';
      ctx.lineWidth = 1;
      ctx.strokeRect(x + 0.5, y + 0.5, tile - 1, tile - 1);
    }
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(6, 6);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

/**
 * Creates a rich warm walnut wood-plank floor texture for the new Studio Wood Room.
 */
function createWoodFloorTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d');

  ctx.fillStyle = '#7a5438';
  ctx.fillRect(0, 0, 512, 512);

  const plankH = 64;
  const tones = ['#7d563a', '#6f4a30', '#876042', '#755035', '#69442b'];
  for (let row = 0; row < 8; row++) {
    const y = row * plankH;
    const offset = (row % 2) * 180;
    for (let seg = -1; seg < 3; seg++) {
      const x = seg * 256 + offset;
      ctx.fillStyle = tones[(row * 3 + seg + 5) % tones.length];
      ctx.fillRect(x, y, 256, plankH);

      // Subtle wood grain streaks
      ctx.fillStyle = 'rgba(40, 22, 10, 0.12)';
      for (let g = 0; g < 6; g++) {
        ctx.fillRect(x + 4, y + 6 + g * 10, 248, 2);
      }

      // Plank seams
      ctx.strokeStyle = 'rgba(35, 18, 8, 0.42)';
      ctx.lineWidth = 2;
      ctx.strokeRect(x + 0.5, y + 0.5, 255, plankH - 1);
    }
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(4, 3);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

/**
 * Creates a crisp canvas label plane (e.g., "PC 1" .. "PC 11", or Cabinet sign).
 */
function createLabelPlane(text, bgColor = 'rgba(15, 23, 42, 0.85)', width = 0.62, height = 0.22) {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 96;
  const ctx = canvas.getContext('2d');

  ctx.fillStyle = bgColor;
  ctx.beginPath();
  ctx.roundRect(8, 8, 240, 80, 18);
  ctx.fill();

  ctx.strokeStyle = 'rgba(148, 163, 184, 0.55)';
  ctx.lineWidth = 4;
  ctx.stroke();

  ctx.fillStyle = '#f8fafc';
  ctx.font = 'bold 42px -apple-system, BlinkMacSystemFont, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, 128, 50);

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  const mat = new THREE.MeshBasicMaterial({ map: tex, transparent: true });
  return new THREE.Mesh(new THREE.PlaneGeometry(width, height), mat);
}

/**
 * Creates an animated monitor screen controller (code, chart, or kanban).
 */
function createMonitorScreen(variantIndex) {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 160;
  const ctx = canvas.getContext('2d');
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;

  const mode = variantIndex % 3;
  const accentColors = ['#38bdf8', '#34d399', '#a78bfa', '#fbbf24', '#fb7185'];
  const accent = accentColors[variantIndex % accentColors.length];

  function draw(time, isWorking) {
    ctx.fillStyle = isWorking ? '#0f172a' : '#1e293b';
    ctx.fillRect(0, 0, 256, 160);

    // Top bar
    ctx.fillStyle = '#1e293b';
    ctx.fillRect(0, 0, 256, 18);
    ctx.fillStyle = '#ef4444';
    ctx.beginPath(); ctx.arc(10, 9, 3, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#f59e0b';
    ctx.beginPath(); ctx.arc(20, 9, 3, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#22c55e';
    ctx.beginPath(); ctx.arc(30, 9, 3, 0, Math.PI * 2); ctx.fill();

    if (!isWorking) {
      const cx = 128 + Math.sin(time * 0.9 + variantIndex) * 42;
      const cy = 88 + Math.cos(time * 0.7 + variantIndex) * 24;
      ctx.fillStyle = 'rgba(56, 189, 248, 0.25)';
      ctx.beginPath();
      ctx.arc(cx, cy, 22, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#94a3b8';
      ctx.font = 'bold 12px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(`PC ${variantIndex + 1} • IDLE`, 128, 92);
      texture.needsUpdate = true;
      return;
    }

    if (mode === 0) {
      const scroll = Math.floor(time * 3.5 + variantIndex * 5);
      for (let i = 0; i < 11; i++) {
        const y = 26 + i * 11;
        const lineSeed = (i + scroll) * 17 + variantIndex * 7;
        const indent = (lineSeed % 3) * 14;
        const width = 45 + ((lineSeed * 29) % 130);
        ctx.fillStyle = i % 4 === 0 ? accent : (i % 3 === 0 ? '#94a3b8' : '#e2e8f0');
        ctx.fillRect(14 + indent, y, width, 5);
      }
      if (Math.floor(time * 3) % 2 === 0) {
        ctx.fillStyle = '#38bdf8';
        ctx.fillRect(160, 134, 6, 9);
      }
    } else if (mode === 1) {
      for (let i = 0; i < 7; i++) {
        const h = 24 + Math.abs(Math.sin(time * 1.2 + i * 0.9 + variantIndex)) * 68;
        ctx.fillStyle = i % 2 === 0 ? accent : '#60a5fa';
        ctx.fillRect(22 + i * 31, 136 - h, 18, h);
      }
      ctx.strokeStyle = '#334155';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(14, 138);
      ctx.lineTo(242, 138);
      ctx.stroke();
    } else {
      for (let col = 0; col < 3; col++) {
        const x = 14 + col * 78;
        ctx.fillStyle = '#1e293b';
        ctx.fillRect(x, 26, 70, 122);
        for (let row = 0; row < 3; row++) {
          const pulse = ((Math.floor(time * 1.5 + variantIndex) % 9) === col * 3 + row);
          ctx.fillStyle = pulse ? accent : '#334155';
          ctx.fillRect(x + 6, 34 + row * 34, 58, 26);
          ctx.fillStyle = '#cbd5e1';
          ctx.fillRect(x + 11, 42 + row * 34, 34, 4);
          ctx.fillRect(x + 11, 50 + row * 34, 22, 3);
        }
      }
    }

    texture.needsUpdate = true;
  }

  draw(0, true);
  return { texture, draw };
}

/**
 * Builds a swivel office chair. Local forward (where sitter faces) is -Z.
 */
function createOfficeChair(accentColor) {
  const chair = new THREE.Group();

  const metalMat = new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.4, metalness: 0.6 });
  const fabricMat = new THREE.MeshStandardMaterial({ color: accentColor, roughness: 0.85 });
  const darkMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.7 });

  for (let i = 0; i < 5; i++) {
    const angle = (i / 5) * Math.PI * 2;
    const leg = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.03, 0.34), metalMat);
    leg.position.set(Math.sin(angle) * 0.16, 0.06, Math.cos(angle) * 0.16);
    leg.rotation.y = angle;
    leg.castShadow = true;
    chair.add(leg);

    const wheel = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.03, 10), darkMat);
    wheel.rotation.z = Math.PI / 2;
    wheel.position.set(Math.sin(angle) * 0.31, 0.03, Math.cos(angle) * 0.31);
    chair.add(wheel);
  }

  const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.04, 0.42, 12), metalMat);
  stem.position.y = 0.27;
  stem.castShadow = true;
  chair.add(stem);

  const swivel = new THREE.Group();
  swivel.position.y = 0.48;
  chair.add(swivel);

  const seat = new THREE.Mesh(new THREE.BoxGeometry(0.52, 0.08, 0.50), fabricMat);
  seat.castShadow = true;
  seat.receiveShadow = true;
  swivel.add(seat);

  const backPost = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.38, 0.05), darkMat);
  backPost.position.set(0, 0.18, 0.24);
  backPost.rotation.x = 0.1;
  swivel.add(backPost);

  const backrest = new THREE.Mesh(new THREE.BoxGeometry(0.48, 0.50, 0.07), fabricMat);
  backrest.position.set(0, 0.38, 0.25);
  backrest.rotation.x = 0.08;
  backrest.castShadow = true;
  swivel.add(backrest);

  for (const side of [-1, 1]) {
    const armPost = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.20, 0.04), darkMat);
    armPost.position.set(side * 0.26, 0.12, 0.04);
    swivel.add(armPost);

    const armPad = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.035, 0.32), darkMat);
    armPad.position.set(side * 0.26, 0.22, 0.02);
    swivel.add(armPad);
  }

  chair.userData.swivel = swivel;
  return chair;
}

/**
 * Builds a complete workstation (PC 1..11).
 * faceDirZ = -1 means employee faces -Z (chair is at +Z side of desk).
 * faceDirZ = +1 means employee faces +Z (chair is at -Z side of desk).
 */
function createWorkstation(pcNumber, x, deskZ, aisleZ, faceDirZ, chairColor) {
  const index = pcNumber - 1;
  const group = new THREE.Group();

  const woodMat = new THREE.MeshStandardMaterial({ color: 0x1a1d24, roughness: 0.55, metalness: 0.1 });
  const legMat = new THREE.MeshStandardMaterial({ color: 0x111318, roughness: 0.45, metalness: 0.4 });
  const darkPlastic = new THREE.MeshStandardMaterial({ color: 0x14171f, roughness: 0.5 });
  const keyMat = new THREE.MeshStandardMaterial({ color: 0x272c38, roughness: 0.6 });

  const deskGroup = new THREE.Group();
  deskGroup.position.set(x, 0, deskZ);
  // Default desk local design has monitor at -Z facing +Z (sitter at +Z facing -Z).
  // If faceDirZ === +1 (sitter at -Z facing +Z), rotate desk 180° around Y!
  if (faceDirZ === 1) {
    deskGroup.rotation.y = Math.PI;
  }
  group.add(deskGroup);

  // Tabletop (width 2.08, depth 1.05)
  const top = new THREE.Mesh(new THREE.BoxGeometry(2.08, 0.06, 1.05), woodMat);
  top.position.y = 0.75;
  top.castShadow = true;
  top.receiveShadow = true;
  deskGroup.add(top);

  const legPositions = [
    [-0.96, 0.36, -0.45],
    [0.96, 0.36, -0.45],
    [-0.96, 0.36, 0.45],
    [0.96, 0.36, 0.45],
  ];
  for (const [lx, ly, lz] of legPositions) {
    const leg = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.72, 0.06), legMat);
    leg.position.set(lx, ly, lz);
    leg.castShadow = true;
    deskGroup.add(leg);
  }

  const panel = new THREE.Mesh(new THREE.BoxGeometry(1.90, 0.32, 0.03), legMat);
  panel.position.set(0, 0.56, -0.45);
  panel.castShadow = true;
  deskGroup.add(panel);

  // Privacy divider at back of desk (dark black)
  const divider = new THREE.Mesh(
    new THREE.BoxGeometry(2.04, 0.32, 0.04),
    new THREE.MeshStandardMaterial({ color: 0x181b22, roughness: 0.85 })
  );
  divider.position.set(0, 0.94, -0.50);
  divider.castShadow = true;
  deskGroup.add(divider);

  // Monitor + Stand
  const standBase = new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.02, 0.18), darkPlastic);
  standBase.position.set(0, 0.79, -0.26);
  deskGroup.add(standBase);

  const standNeck = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.24, 0.05), darkPlastic);
  standNeck.position.set(0, 0.90, -0.28);
  deskGroup.add(standNeck);

  const monitorFrame = new THREE.Mesh(new THREE.BoxGeometry(0.76, 0.46, 0.04), darkPlastic);
  monitorFrame.position.set(0, 1.07, -0.25);
  monitorFrame.castShadow = true;
  deskGroup.add(monitorFrame);

  const screenController = createMonitorScreen(index);
  const screenMat = new THREE.MeshStandardMaterial({
    map: screenController.texture,
    emissive: new THREE.Color(0xffffff),
    emissiveMap: screenController.texture,
    emissiveIntensity: 0.45,
    roughness: 0.25,
  });
  const screenMesh = new THREE.Mesh(new THREE.PlaneGeometry(0.70, 0.40), screenMat);
  screenMesh.position.set(0, 1.07, -0.228);
  deskGroup.add(screenMesh);

  // Keyboard & Mouse
  const keyboard = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.02, 0.15), keyMat);
  keyboard.position.set(-0.04, 0.79, 0.10);
  keyboard.castShadow = true;
  deskGroup.add(keyboard);

  const pad = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.005, 0.18), darkPlastic);
  pad.position.set(0.32, 0.783, 0.11);
  deskGroup.add(pad);

  const mouse = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.022, 0.10), keyMat);
  mouse.position.set(0.32, 0.796, 0.11);
  deskGroup.add(mouse);

  // Mac Mini on top of the desk (right of monitor, silver aluminum)
  const macMiniGroup = new THREE.Group();
  macMiniGroup.position.set(0.58, 0.78, -0.18);

  const macSilverMat = new THREE.MeshStandardMaterial({
    color: 0xd4d8de,
    roughness: 0.25,
    metalness: 0.75,
  });
  const macBase = new THREE.Mesh(
    new THREE.BoxGeometry(0.17, 0.012, 0.17),
    new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.7 })
  );
  macBase.position.y = 0.006;
  macMiniGroup.add(macBase);

  const macBody = new THREE.Mesh(new THREE.BoxGeometry(0.20, 0.045, 0.20), macSilverMat);
  macBody.position.y = 0.034;
  macBody.castShadow = true;
  macBody.receiveShadow = true;
  macMiniGroup.add(macBody);

  // Subtle dark logo emblem on top center of Mac Mini
  const macLogo = new THREE.Mesh(
    new THREE.CircleGeometry(0.022, 16),
    new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.3, metalness: 0.4 })
  );
  macLogo.rotation.x = -Math.PI / 2;
  macLogo.position.y = 0.0575;
  macMiniGroup.add(macLogo);

  // Front power LED (facing +Z toward sitter)
  const macLed = new THREE.Mesh(
    new THREE.BoxGeometry(0.012, 0.008, 0.006),
    new THREE.MeshBasicMaterial({ color: 0xf8fafc })
  );
  macLed.position.set(0.065, 0.032, 0.102);
  macMiniGroup.add(macLed);

  deskGroup.add(macMiniGroup);

  // Coffee mug
  const mugColors = [0xef4444, 0x3b82f6, 0x10b981, 0xf59e0b, 0xec4899, 0x8b5cf6];
  const mug = new THREE.Mesh(
    new THREE.CylinderGeometry(0.042, 0.036, 0.09, 12),
    new THREE.MeshStandardMaterial({ color: mugColors[index % mugColors.length], roughness: 0.3 })
  );
  mug.position.set(-0.68, 0.825, 0.12);
  mug.castShadow = true;
  deskGroup.add(mug);

  // Chair placement: on the opposite side of faceDirZ (chairSide = -faceDirZ)
  const chairSide = -faceDirZ; // +1 if facing -Z, -1 if facing +Z
  const chairSitZ = deskZ + chairSide * 0.70;
  const chairOutZ = deskZ + chairSide * 0.96;
  const sitZ = deskZ + chairSide * 0.64;

  const chair = createOfficeChair(chairColor);
  chair.position.set(x, 0, chairSitZ);
  if (faceDirZ === 1) {
    chair.rotation.y = Math.PI;
  }
  group.add(chair);

  return {
    id: pcNumber,
    room: 'main',
    label: `PC ${pcNumber}`,
    group,
    chair,
    chairSide,
    chairDir: new THREE.Vector3(0, 0, chairSide),
    chairSitPos: new THREE.Vector3(x, 0, chairSitZ),
    chairOutPos: new THREE.Vector3(x, 0, chairOutZ),
    chairSitZ,
    chairOutZ,
    facingAngle: faceDirZ === -1 ? Math.PI : 0, // Employee local +Z is forward
    aisleFacingAngle: faceDirZ === -1 ? 0 : Math.PI, // Facing away from desk into aisle
    sitWorldPos: new THREE.Vector3(x, 0, sitZ),
    aislePos: new THREE.Vector3(x, 0, aisleZ),
    deskPos: new THREE.Vector3(x, 0, deskZ),
    aisleZ,
    screenController,
  };
}

/**
 * Builds a detailed work bag ("tas kerja") — briefcase or backpack.
 */
function createWorkBag(type, colorHex) {
  const bag = new THREE.Group();
  const mat = new THREE.MeshStandardMaterial({ color: colorHex, roughness: 0.72 });
  const trimMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.5 });
  const buckleMat = new THREE.MeshStandardMaterial({ color: 0xd97706, roughness: 0.3, metalness: 0.7 });

  if (type === 'briefcase') {
    const body = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.30, 0.14), mat);
    body.position.y = 0.15;
    body.castShadow = true;
    bag.add(body);

    const flap = new THREE.Mesh(new THREE.BoxGeometry(0.425, 0.12, 0.145), trimMat);
    flap.position.set(0, 0.23, 0.005);
    bag.add(flap);

    const handle = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.05, 0.03), trimMat);
    handle.position.set(0, 0.32, 0);
    bag.add(handle);

    const clasp = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.04, 0.02), buckleMat);
    clasp.position.set(0, 0.18, -0.075);
    bag.add(clasp);
  } else {
    // Backpack
    const body = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.42, 0.20), mat);
    body.position.y = 0.21;
    body.castShadow = true;
    bag.add(body);

    const pocket = new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.18, 0.06), trimMat);
    pocket.position.set(0, 0.13, -0.11);
    bag.add(pocket);

    const topLoop = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.04, 0.04), trimMat);
    topLoop.position.set(0, 0.43, 0);
    bag.add(topLoop);
  }
  return bag;
}

/**
 * Builds the central long cabinet ("kabinet berisi mesin kopi dan tas kerja")
 * spanning above PC 5, PC 6, and PC 7, accessible from the upper aisle (-Z side).
 */
function createCoffeeAndBagsCabinet(centerX, centerZ, width) {
  const group = new THREE.Group();
  group.position.set(centerX, 0, centerZ);

  const bodyMat = new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.65 });
  const shelfMat = new THREE.MeshStandardMaterial({ color: 0x475569, roughness: 0.7 });
  const woodTopMat = new THREE.MeshStandardMaterial({ color: 0xc89d6c, roughness: 0.5 });
  const darkMetal = new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.3, metalness: 0.6 });
  const silverMetal = new THREE.MeshStandardMaterial({ color: 0xcbd5e1, roughness: 0.25, metalness: 0.75 });

  const height = 0.90;
  const depth = 0.88;

  // Back wall of cabinet (at +Z side, right behind PC 5/6/7)
  const backPanel = new THREE.Mesh(new THREE.BoxGeometry(width, height, 0.06), bodyMat);
  backPanel.position.set(0, height / 2, depth / 2 - 0.03);
  backPanel.castShadow = true;
  backPanel.receiveShadow = true;
  group.add(backPanel);

  // Bottom plinth + middle shelf + wooden countertop
  const bottomShelf = new THREE.Mesh(new THREE.BoxGeometry(width, 0.08, depth), bodyMat);
  bottomShelf.position.set(0, 0.04, 0);
  bottomShelf.receiveShadow = true;
  group.add(bottomShelf);

  const midShelf = new THREE.Mesh(new THREE.BoxGeometry(width - 0.12, 0.04, depth - 0.08), shelfMat);
  midShelf.position.set(0, 0.47, 0.02);
  group.add(midShelf);

  const topCounter = new THREE.Mesh(new THREE.BoxGeometry(width + 0.08, 0.06, depth + 0.06), woodTopMat);
  topCounter.position.set(0, height + 0.03, 0);
  topCounter.castShadow = true;
  topCounter.receiveShadow = true;
  group.add(topCounter);

  // Vertical dividers creating 5 open cubbies for work bags
  const numBays = 5;
  for (let i = 0; i <= numBays; i++) {
    const dx = -width / 2 + (i * width) / numBays;
    const divider = new THREE.Mesh(new THREE.BoxGeometry(0.06, height, depth - 0.04), bodyMat);
    divider.position.set(dx, height / 2, 0.01);
    divider.castShadow = true;
    group.add(divider);
  }

  // --- Work Bags ("tas kerja") stored neatly inside the cabinet cubbies ---
  const bagSpecs = [
    { bay: 0, shelfY: 0.08, type: 'backpack', color: 0x1e3a8a, offset: -0.25, rot: 0.1 },
    { bay: 0, shelfY: 0.08, type: 'briefcase', color: 0x78350f, offset: 0.25, rot: -0.08 },
    { bay: 1, shelfY: 0.08, type: 'briefcase', color: 0x1f2937, offset: -0.22, rot: 0.05 },
    { bay: 1, shelfY: 0.49, type: 'briefcase', color: 0x92400e, offset: 0.12, rot: -0.1 },
    { bay: 2, shelfY: 0.08, type: 'backpack', color: 0x065f46, offset: -0.18, rot: 0.08 },
    { bay: 2, shelfY: 0.49, type: 'briefcase', color: 0x374151, offset: 0.20, rot: -0.05 },
    { bay: 3, shelfY: 0.08, type: 'backpack', color: 0x7c2d12, offset: -0.20, rot: -0.1 },
    { bay: 3, shelfY: 0.49, type: 'briefcase', color: 0x1e293b, offset: 0.16, rot: 0.06 },
    { bay: 4, shelfY: 0.08, type: 'backpack', color: 0x4c1d95, offset: -0.15, rot: 0.05 },
    { bay: 4, shelfY: 0.08, type: 'briefcase', color: 0x713f12, offset: 0.30, rot: -0.08 },
  ];

  const bayWidth = width / numBays;
  for (const b of bagSpecs) {
    const bx = -width / 2 + (b.bay + 0.5) * bayWidth + b.offset;
    const bag = createWorkBag(b.type, b.color);
    bag.position.set(bx, b.shelfY, -0.05);
    bag.rotation.y = b.rot;
    group.add(bag);
  }

  // --- Coffee Machine Station on top of cabinet (left-center side) ---
  const machineX = -1.65;
  const counterY = height + 0.06;

  // Espresso / Coffee Machine body
  const coffeeBody = new THREE.Mesh(new THREE.BoxGeometry(0.56, 0.52, 0.44), darkMetal);
  coffeeBody.position.set(machineX, counterY + 0.26, 0.08);
  coffeeBody.castShadow = true;
  group.add(coffeeBody);

  const coffeeFront = new THREE.Mesh(new THREE.BoxGeometry(0.48, 0.16, 0.06), silverMetal);
  coffeeFront.position.set(machineX, counterY + 0.42, -0.15);
  group.add(coffeeFront);

  // Red indicator light & brew spout
  const brewLight = new THREE.Mesh(
    new THREE.BoxGeometry(0.05, 0.03, 0.02),
    new THREE.MeshBasicMaterial({ color: 0x22c55e })
  );
  brewLight.position.set(machineX + 0.16, counterY + 0.42, -0.185);
  group.add(brewLight);

  const dripTray = new THREE.Mesh(new THREE.BoxGeometry(0.48, 0.04, 0.18), silverMetal);
  dripTray.position.set(machineX, counterY + 0.02, -0.20);
  group.add(dripTray);

  // Glass coffee carafe
  const carafe = new THREE.Mesh(
    new THREE.CylinderGeometry(0.08, 0.10, 0.18, 14),
    new THREE.MeshPhysicalMaterial({ color: 0x3b1f0e, transparent: true, opacity: 0.85, roughness: 0.15 })
  );
  carafe.position.set(machineX - 0.06, counterY + 0.13, -0.20);
  group.add(carafe);

  // Grinder & Coffee Bean Hopper next to machine
  const grinderBase = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.26, 0.24), darkMetal);
  grinderBase.position.set(machineX - 0.52, counterY + 0.13, 0.05);
  grinderBase.castShadow = true;
  group.add(grinderBase);

  const beanHopper = new THREE.Mesh(
    new THREE.CylinderGeometry(0.11, 0.06, 0.20, 12),
    new THREE.MeshStandardMaterial({ color: 0x451a03, roughness: 0.5 })
  );
  beanHopper.position.set(machineX - 0.52, counterY + 0.36, 0.05);
  group.add(beanHopper);

  // Stack of paper coffee cups & tray
  const cupMat = new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.4 });
  for (let c = 0; c < 4; c++) {
    const cup = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.035, 0.09, 12), cupMat);
    cup.position.set(machineX + 0.56 + (c % 2) * 0.12, counterY + 0.045 + Math.floor(c / 2) * 0.08, -0.05);
    cup.castShadow = true;
    group.add(cup);
  }

  // Water kettle / dispenser on middle-right of cabinet
  const kettleX = 0.25;
  const kettleBody = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.13, 0.28, 16), silverMetal);
  kettleBody.position.set(kettleX, counterY + 0.14, 0.02);
  kettleBody.castShadow = true;
  group.add(kettleBody);

  // Two extra work bags resting on the right top of the cabinet
  const topBag1 = createWorkBag('briefcase', 0x7c2d12);
  topBag1.position.set(1.65, counterY, 0.02);
  topBag1.rotation.y = -0.18;
  group.add(topBag1);

  const topBag2 = createWorkBag('backpack', 0x1d4ed8);
  topBag2.position.set(2.45, counterY, 0.04);
  topBag2.rotation.y = 0.22;
  group.add(topBag2);

  // Rising coffee steam particles above the espresso carafe
  const steamGroup = new THREE.Group();
  steamGroup.position.set(machineX - 0.06, counterY + 0.26, -0.20);
  const steamPuffs = [];
  const steamGeo = new THREE.SphereGeometry(0.032, 8, 8);
  for (let i = 0; i < 7; i++) {
    const mat = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.35,
      depthWrite: false,
    });
    const puff = new THREE.Mesh(steamGeo, mat);
    puff.userData.phase = (i / 7) * Math.PI * 2;
    steamGroup.add(puff);
    steamPuffs.push(puff);
  }
  group.add(steamGroup);

  function updateCoffeeSteam(time) {
    for (let i = 0; i < steamPuffs.length; i++) {
      const p = steamPuffs[i];
      const cycle = ((time * 0.55 + i / steamPuffs.length) % 1);
      p.position.y = cycle * 0.42;
      p.position.x = Math.sin(time * 2.2 + p.userData.phase) * 0.035 * (0.5 + cycle);
      p.position.z = Math.cos(time * 1.8 + p.userData.phase) * 0.025 * (0.5 + cycle);
      const scale = 0.55 + cycle * 1.35;
      p.scale.setScalar(scale);
      p.material.opacity = Math.sin(cycle * Math.PI) * 0.32;
    }
  }

  return { group, updateCoffeeSteam };
}

/**
 * Creates a standing water dispenser (galon atas) facing -X.
 */
function createWaterDispenser(x, z) {
  const g = new THREE.Group();
  g.position.set(x, 0, z);

  const whiteMat = new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.35 });
  const darkMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.5 });
  const redMat = new THREE.MeshStandardMaterial({ color: 0xef4444, roughness: 0.4 });
  const blueMat = new THREE.MeshStandardMaterial({ color: 0x3b82f6, roughness: 0.4 });
  const jugMat = new THREE.MeshPhysicalMaterial({
    color: 0x38bdf8,
    transparent: true,
    opacity: 0.65,
    roughness: 0.12,
    metalness: 0.05,
  });

  // Main dispenser body
  const body = new THREE.Mesh(new THREE.BoxGeometry(0.44, 0.96, 0.44), whiteMat);
  body.position.y = 0.48;
  body.castShadow = true;
  body.receiveShadow = true;
  g.add(body);

  // Front recessed alcove (facing -X toward open area)
  const alcove = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.24, 0.30), darkMat);
  alcove.position.set(-0.205, 0.72, 0);
  g.add(alcove);

  // Drip tray
  const dripTray = new THREE.Mesh(new THREE.BoxGeometry(0.10, 0.03, 0.30), darkMat);
  dripTray.position.set(-0.22, 0.59, 0);
  g.add(dripTray);

  // Hot (red) and Cold (blue) taps
  const hotTap = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.05, 0.04), redMat);
  hotTap.position.set(-0.22, 0.80, -0.07);
  g.add(hotTap);

  const coldTap = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.05, 0.04), blueMat);
  coldTap.position.set(-0.22, 0.80, 0.07);
  g.add(coldTap);

  // Gallon collar
  const collar = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.16, 0.06, 16), whiteMat);
  collar.position.y = 0.99;
  g.add(collar);

  // 19L translucent blue water gallon on top
  const gallonBody = new THREE.Mesh(new THREE.CylinderGeometry(0.165, 0.165, 0.42, 18), jugMat);
  gallonBody.position.y = 1.23;
  gallonBody.castShadow = true;
  g.add(gallonBody);

  const gallonTop = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.165, 0.07, 18), jugMat);
  gallonTop.position.y = 1.47;
  g.add(gallonTop);

  return g;
}

/**
 * Creates a large wall-mounted office TV sized to match a window pane (~3.8m x 2.05m)
 * with a crisp high-res live animated office dashboard screen.
 */
function createWallTV(x, y, z) {
  const tvGroup = new THREE.Group();
  tvGroup.position.set(x, y, z);

  const bezelMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.3, metalness: 0.5 });

  // Large TV sized to match the glass window pane (~3.80m wide x 2.05m tall)
  const frameW = 3.80;
  const frameH = 2.05;

  // TV chassis & sleek thin bezel mounted flush on the solid center wall
  const chassis = new THREE.Mesh(new THREE.BoxGeometry(frameW, frameH, 0.08), bezelMat);
  chassis.castShadow = true;
  tvGroup.add(chassis);

  // Subtle power indicator LED on bottom-right bezel
  const powerLed = new THREE.Mesh(
    new THREE.BoxGeometry(0.05, 0.018, 0.015),
    new THREE.MeshBasicMaterial({ color: 0x22c55e })
  );
  powerLed.position.set(frameW / 2 - 0.14, -frameH / 2 + 0.03, 0.045);
  tvGroup.add(powerLed);

  // High-res Animated Dashboard Canvas Texture
  const canvas = document.createElement('canvas');
  canvas.width = 1024;
  canvas.height = 560;
  const ctx = canvas.getContext('2d');
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;

  function draw(time, stats = null) {
    // Dark dashboard background
    ctx.fillStyle = '#141414';
    ctx.fillRect(0, 0, 1024, 560);

    // Header bar with CTSO Golden Yellow accent
    ctx.fillStyle = '#202020';
    ctx.fillRect(0, 0, 1024, 76);
    ctx.fillStyle = '#FFD416';
    ctx.fillRect(0, 72, 1024, 4);

    ctx.fillStyle = '#FFD416';
    ctx.font = 'bold 32px Inter, -apple-system, sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText('CTSO LIVE ROSTER & JOBDESK', 32, 49);

    if (stats && stats.dateLabel) {
      ctx.fillStyle = '#e2e8f0';
      ctx.font = 'bold 22px Inter, sans-serif';
      ctx.textAlign = 'right';
      ctx.fillText(stats.dateLabel, 938, 46);
      ctx.textAlign = 'left';
    }

    // Live pulsing dot
    ctx.fillStyle = Math.floor(time * 2) % 2 === 0 ? '#22c55e' : '#15803d';
    ctx.beginPath();
    ctx.arc(976, 38, 11, 0, Math.PI * 2);
    ctx.fill();

    // Left panel: Shift & Jobdesk Activity Bars
    ctx.fillStyle = '#1c1c1e';
    ctx.fillRect(32, 98, 464, 338);
    ctx.fillStyle = '#94a3b8';
    ctx.font = 'bold 22px sans-serif';
    ctx.fillText('JOBDESK DISTRIBUTION', 56, 136);

    const barColors = ['#FFD416', '#38bdf8', '#34d399', '#818cf8', '#fb923c', '#f472b6'];
    const entries = stats && stats.jobdeskBars && stats.jobdeskBars.length > 0
      ? stats.jobdeskBars
      : [
          { code: 'CT1', count: 5 },
          { code: 'CT2', count: 4 },
          { code: 'CT4', count: 3 },
          { code: 'NOC', count: 2 },
        ];
    const maxCount = Math.max(1, ...entries.map((e) => e.count));
    const barW = Math.min(64, Math.floor(360 / Math.max(entries.length, 1)) - 14);
    entries.slice(0, 6).forEach((item, i) => {
      const targetH = 40 + (item.count / maxCount) * 180;
      const h = targetH + Math.sin(time * 1.4 + i) * 6;
      const bx = 60 + i * (barW + 20);
      ctx.fillStyle = item.color || barColors[i % barColors.length];
      ctx.fillRect(bx, 384 - h, barW, h);
      ctx.fillStyle = '#f8fafc';
      ctx.font = 'bold 20px sans-serif';
      ctx.fillText(String(item.count), bx + 6, 372 - h);
      ctx.fillStyle = '#cbd5e1';
      ctx.font = 'bold 18px sans-serif';
      ctx.fillText(item.code.slice(0, 5), bx, 414);
    });

    // Right panel: Live On-Duty Summary
    ctx.fillStyle = '#1c1c1e';
    ctx.fillRect(528, 98, 464, 338);
    ctx.fillStyle = '#94a3b8';
    ctx.font = 'bold 22px sans-serif';
    ctx.fillText('ON-DUTY OPERATIONAL', 552, 136);

    const totalOnDuty = stats ? stats.totalOnDuty : 14;
    const badungCount = stats ? stats.badungCount : 10;
    const denpasarCount = stats ? stats.denpasarCount : 4;

    ctx.fillStyle = '#FFD416';
    ctx.font = 'bold 64px sans-serif';
    ctx.fillText(`${totalOnDuty} Staff`, 552, 218);

    ctx.fillStyle = '#e2e8f0';
    ctx.font = 'bold 24px sans-serif';
    ctx.fillText(`Badung (Utama): ${badungCount}`, 552, 268);
    ctx.fillText(`Denpasar (Studio): ${denpasarCount}`, 552, 304);

    // Scrolling activity waveform
    ctx.strokeStyle = '#FFD416';
    ctx.lineWidth = 5;
    ctx.beginPath();
    for (let px = 0; px <= 408; px += 12) {
      const py = 376 + Math.sin(time * 2.2 + px * 0.025) * 24 + Math.cos(time * 1.1 + px * 0.045) * 10;
      if (px === 0) ctx.moveTo(556 + px, py);
      else ctx.lineTo(556 + px, py);
    }
    ctx.stroke();

    // Bottom ticker bar
    ctx.fillStyle = '#202020';
    ctx.fillRect(32, 460, 960, 72);
    const tickerText = (stats && stats.tickerText)
      ? stats.tickerText
      : 'CTSO MANAGEMENT SYSTEM   •   SYNC JADWAL & JOBDESK REAL-TIME   •   BADUNG & DENPASAR HUB';
    const tickerOffset = (time * 90) % 1100;
    ctx.save();
    ctx.beginPath();
    ctx.rect(40, 460, 944, 72);
    ctx.clip();
    ctx.fillStyle = '#f8fafc';
    ctx.font = 'bold 24px sans-serif';
    ctx.fillText(tickerText, 1000 - tickerOffset, 505);
    ctx.restore();

    texture.needsUpdate = true;
  }

  draw(0);

  const screenMat = new THREE.MeshStandardMaterial({
    map: texture,
    emissive: new THREE.Color(0xffffff),
    emissiveMap: texture,
    emissiveIntensity: 0.55,
    roughness: 0.2,
  });
  const screenMesh = new THREE.Mesh(new THREE.PlaneGeometry(frameW - 0.10, frameH - 0.10), screenMat);
  screenMesh.position.z = 0.042;
  tvGroup.add(screenMesh);

  return { group: tvGroup, draw };
}

/**
 * Creates a wall-mounted split AC indoor unit facing -Z (inward from the z=+7.2 wall).
 */
function createWallAC(x, y, z) {
  const ac = new THREE.Group();
  ac.position.set(x, y, z);

  const bodyMat = new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.35, metalness: 0.05 });
  const trimMat = new THREE.MeshStandardMaterial({ color: 0xe2e8f0, roughness: 0.45 });
  const ventMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.6 });

  // Main indoor unit chassis
  const mainBody = new THREE.Mesh(new THREE.BoxGeometry(1.45, 0.38, 0.28), bodyMat);
  mainBody.castShadow = true;
  mainBody.receiveShadow = true;
  ac.add(mainBody);

  // Subtle front face panel
  const frontPanel = new THREE.Mesh(new THREE.BoxGeometry(1.42, 0.24, 0.03), trimMat);
  frontPanel.position.set(0, 0.05, -0.145);
  ac.add(frontPanel);

  // Dark air outlet vent slot along bottom front
  const ventSlot = new THREE.Mesh(new THREE.BoxGeometry(1.28, 0.07, 0.04), ventMat);
  ventSlot.position.set(0, -0.12, -0.135);
  ac.add(ventSlot);

  // Angled louver flap
  const flap = new THREE.Mesh(new THREE.BoxGeometry(1.26, 0.04, 0.018), bodyMat);
  flap.position.set(0, -0.145, -0.16);
  flap.rotation.x = 0.45;
  ac.add(flap);

  // Digital temperature display ("22°C") + power LED on front-right
  const dispCanvas = document.createElement('canvas');
  dispCanvas.width = 128;
  dispCanvas.height = 48;
  const ctx = dispCanvas.getContext('2d');
  ctx.fillStyle = '#0f172a';
  ctx.fillRect(0, 0, 128, 48);
  ctx.fillStyle = '#38bdf8';
  ctx.font = 'bold 28px monospace';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('22°C', 64, 25);
  const dispTex = new THREE.CanvasTexture(dispCanvas);
  dispTex.colorSpace = THREE.SRGBColorSpace;

  const displayMesh = new THREE.Mesh(
    new THREE.PlaneGeometry(0.18, 0.068),
    new THREE.MeshBasicMaterial({ map: dispTex })
  );
  displayMesh.position.set(0.46, 0.04, -0.162);
  displayMesh.rotation.y = Math.PI; // Face -Z inward
  ac.add(displayMesh);

  const powerLed = new THREE.Mesh(
    new THREE.BoxGeometry(0.022, 0.022, 0.01),
    new THREE.MeshBasicMaterial({ color: 0x22c55e })
  );
  powerLed.position.set(0.59, 0.04, -0.162);
  ac.add(powerLed);

  // Subtle cool-air drift ribbons blowing gently downward-inward (-Z, -Y)
  const airWisps = [];
  const wispGeo = new THREE.CapsuleGeometry(0.012, 0.14, 4, 6);
  for (let i = 0; i < 6; i++) {
    const mat = new THREE.MeshBasicMaterial({
      color: 0xe0f2fe,
      transparent: true,
      opacity: 0.22,
      depthWrite: false,
    });
    const wisp = new THREE.Mesh(wispGeo, mat);
    wisp.rotation.x = Math.PI / 2.6;
    wisp.userData.lane = (i - 2.5) * 0.21;
    wisp.userData.offset = i / 6;
    ac.add(wisp);
    airWisps.push(wisp);
  }

  function updateAC(time) {
    // Smooth oscillating AC louver swing
    flap.rotation.x = 0.38 + Math.sin(time * 0.85) * 0.28;

    // Gentle cool-air stream animation
    for (let i = 0; i < airWisps.length; i++) {
      const w = airWisps[i];
      const t = (time * 0.65 + w.userData.offset) % 1;
      w.position.set(
        w.userData.lane + Math.sin(time * 1.5 + i) * 0.02,
        -0.18 - t * 0.65,
        -0.20 - t * 0.95
      );
      w.material.opacity = Math.sin(t * Math.PI) * 0.22;
    }
  }

  return { group: ac, updateAC };
}

/**
 * Builds an ergonomic high-back mesh chair with headrest (matching the new Wood Studio Room photo).
 */
function createHeadrestOfficeChair(withDrapedJacket = false) {
  const chair = createOfficeChair(0x16181d);
  const swivel = chair.userData.swivel;
  const darkMat = new THREE.MeshStandardMaterial({ color: 0x111318, roughness: 0.55 });
  const headrestMat = new THREE.MeshStandardMaterial({ color: 0x1f232c, roughness: 0.7 });

  // Headrest stem + curved cushion
  const stem = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.16, 0.03), darkMat);
  stem.position.set(0, 0.67, 0.25);
  swivel.add(stem);

  const headrest = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.13, 0.06), headrestMat);
  headrest.position.set(0, 0.77, 0.23);
  headrest.castShadow = true;
  swivel.add(headrest);

  // Optional dark jacket draped over chair backrest (like chair #4 in the photo!)
  if (withDrapedJacket) {
    const jacketMat = new THREE.MeshStandardMaterial({ color: 0x262932, roughness: 0.85 });
    const backCloth = new THREE.Mesh(new THREE.BoxGeometry(0.50, 0.44, 0.045), jacketMat);
    backCloth.position.set(0, 0.36, 0.295);
    backCloth.castShadow = true;
    swivel.add(backCloth);

    const shoulderDrape = new THREE.Mesh(new THREE.BoxGeometry(0.52, 0.07, 0.11), jacketMat);
    shoulderDrape.position.set(0, 0.59, 0.26);
    swivel.add(shoulderDrape);
  }

  return chair;
}

/**
 * Builds the New Wood Studio Room (slightly widened ~10.2m x 6.8m, NO ceiling,
 * with matching black-framed frosted glass walls on BOTH left and right sides):
 * - Warm walnut wood-plank floor
 * - Full-height walnut built-in wall cabinet on back wall (z = 7.75)
 * - Matching black-framed frosted sliding glass walls on BOTH right (x = 7.8) and left (x = -2.4)
 * - 4-seat shared warm wooden table with Monitors 1, 2, 3, 4, Mac Minis, and 4 headrest chairs
 */
function buildWoodStudioRoom(scene, startId) {
  const roomGroup = new THREE.Group();
  scene.add(roomGroup);

  // Slightly widened room footprint: 10.2m (X: -2.4..7.8) x 6.8m (Z: 7.4..14.2)
  const woodFloorTex = createWoodFloorTexture();
  woodFloorTex.repeat.set(3.4, 2.5);
  const floor = new THREE.Mesh(
    new THREE.PlaneGeometry(10.2, 6.8),
    new THREE.MeshStandardMaterial({ map: woodFloorTex, roughness: 0.58 })
  );
  floor.rotation.x = -Math.PI / 2;
  floor.position.set(2.7, 0.002, 10.8);
  floor.receiveShadow = true;
  roomGroup.add(floor);

  // Thick 2.5D isometric diorama slab base underneath Ruang Kayu
  const studioSlab = new THREE.Mesh(
    new THREE.BoxGeometry(10.6, 0.46, 7.2),
    new THREE.MeshStandardMaterial({ color: 0x5c3a21, roughness: 0.72 })
  );
  studioSlab.position.set(2.7, -0.24, 10.8);
  studioSlab.receiveShadow = true;
  roomGroup.add(studioSlab);

  const studioSlabTrim = new THREE.Mesh(
    new THREE.BoxGeometry(10.75, 0.10, 7.35),
    new THREE.MeshStandardMaterial({ color: 0x2a1a10, roughness: 0.55 })
  );
  studioSlabTrim.position.set(2.7, -0.45, 10.8);
  roomGroup.add(studioSlabTrim);

  const walnutMat = new THREE.MeshStandardMaterial({ color: 0x7b4f32, roughness: 0.62 });
  const darkWoodMat = new THREE.MeshStandardMaterial({ color: 0x3b2314, roughness: 0.55 });
  const beigeWallMat = new THREE.MeshStandardMaterial({ color: 0xd9cbb8, roughness: 0.85 });
  const whiteTopMat = new THREE.MeshStandardMaterial({ color: 0xf1f5f9, roughness: 0.35 });
  const blackFrameMat = new THREE.MeshStandardMaterial({ color: 0x111318, roughness: 0.4, metalness: 0.4 });
  const frostedGlassMat = new THREE.MeshPhysicalMaterial({
    color: 0xeef2f6,
    transparent: true,
    opacity: 0.62,
    roughness: 0.35,
    metalness: 0.05,
  });

  // --- Back Wall (z = 7.75): Built-In Walnut Cabinet Wall (x = -2.4 .. +7.8) ---
  const cabZ = 7.75;
  // Left tall wardrobe (x = -2.4 .. -0.4)
  const leftWardrobe = new THREE.Mesh(new THREE.BoxGeometry(2.0, 3.6, 0.56), walnutMat);
  leftWardrobe.position.set(-1.4, 1.8, cabZ);
  leftWardrobe.castShadow = true;
  leftWardrobe.receiveShadow = true;
  roomGroup.add(leftWardrobe);

  for (const hx of [-1.48, -1.32]) {
    const handle = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.022, 0.34, 10), blackFrameMat);
    handle.position.set(hx, 1.50, cabZ + 0.30);
    roomGroup.add(handle);
  }

  // Right tall wardrobe (x = 5.8 .. 7.8)
  const rightWardrobe = new THREE.Mesh(new THREE.BoxGeometry(2.0, 3.6, 0.56), walnutMat);
  rightWardrobe.position.set(6.8, 1.8, cabZ);
  rightWardrobe.castShadow = true;
  rightWardrobe.receiveShadow = true;
  roomGroup.add(rightWardrobe);

  for (const hx of [6.72, 6.88]) {
    const handle = new THREE.Mesh(new THREE.CylinderGeometry(0.020, 0.020, 0.30, 10), blackFrameMat);
    handle.position.set(hx, 1.50, cabZ + 0.30);
    roomGroup.add(handle);
  }

  // Center recessed beige backing panel (x = -0.4 .. 5.8, width = 6.2)
  const nicheBack = new THREE.Mesh(new THREE.BoxGeometry(6.2, 3.6, 0.14), beigeWallMat);
  nicheBack.position.set(2.7, 1.8, 7.50);
  nicheBack.receiveShadow = true;
  roomGroup.add(nicheBack);

  // Lower built-in credenza cabinets + crisp white countertop
  const lowerCab = new THREE.Mesh(new THREE.BoxGeometry(6.2, 0.80, 0.54), walnutMat);
  lowerCab.position.set(2.7, 0.40, cabZ);
  lowerCab.castShadow = true;
  lowerCab.receiveShadow = true;
  roomGroup.add(lowerCab);

  const counterTop = new THREE.Mesh(new THREE.BoxGeometry(6.22, 0.05, 0.58), whiteTopMat);
  counterTop.position.set(2.7, 0.825, cabZ);
  counterTop.receiveShadow = true;
  roomGroup.add(counterTop);

  // Upper wooden soffit + dark slatted wood AC grille above center niche
  const upperSoffit = new THREE.Mesh(new THREE.BoxGeometry(6.2, 0.66, 0.54), walnutMat);
  upperSoffit.position.set(2.7, 3.27, cabZ);
  roomGroup.add(upperSoffit);

  const grilleBacking = new THREE.Mesh(new THREE.BoxGeometry(3.2, 0.32, 0.04), blackFrameMat);
  grilleBacking.position.set(2.7, 3.24, cabZ + 0.26);
  roomGroup.add(grilleBacking);

  for (let gx = 1.15; gx <= 4.25; gx += 0.16) {
    const slat = new THREE.Mesh(new THREE.BoxGeometry(0.042, 0.36, 0.06), darkWoodMat);
    slat.position.set(gx, 3.24, cabZ + 0.28);
    roomGroup.add(slat);
  }

  // Open wooden shelving towers flanking the center niche (left: x=0.2, right: x=5.2)
  for (const sx of [0.2, 5.2]) {
    for (const side of [-0.55, 0.55]) {
      const upright = new THREE.Mesh(new THREE.BoxGeometry(0.055, 2.12, 0.48), walnutMat);
      upright.position.set(sx + side, 1.90, cabZ);
      roomGroup.add(upright);
    }
    for (const sy of [1.48, 2.12, 2.76]) {
      const shelf = new THREE.Mesh(new THREE.BoxGeometry(1.12, 0.045, 0.46), walnutMat);
      shelf.position.set(sx, sy, cabZ);
      roomGroup.add(shelf);
    }
  }

  // Details on white counter: black backpack + insulated water bottle
  const backpack = createWorkBag('backpack', 0x111318);
  backpack.position.set(3.6, 0.85, cabZ + 0.02);
  backpack.rotation.y = 0.18;
  roomGroup.add(backpack);

  const bottle = new THREE.Mesh(
    new THREE.CylinderGeometry(0.040, 0.042, 0.22, 12),
    new THREE.MeshStandardMaterial({ color: 0x94a3b8, roughness: 0.25, metalness: 0.7 })
  );
  bottle.position.set(1.85, 0.96, cabZ + 0.04);
  roomGroup.add(bottle);

  // --- Helper: Black-Framed Frosted Sliding Glass Wall (applied to BOTH Left x=-2.4 and Right x=+7.8!) ---
  function addFrostedGlassWall(wallX) {
    const doorHeader = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.56, 6.8), beigeWallMat);
    doorHeader.position.set(wallX, 3.32, 10.8);
    roomGroup.add(doorHeader);

    const glassPane = new THREE.Mesh(new THREE.BoxGeometry(0.05, 3.04, 6.65), frostedGlassMat);
    glassPane.position.set(wallX, 1.52, 10.8);
    roomGroup.add(glassPane);

    for (const ty of [0.04, 3.04]) {
      const track = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.08, 6.75), blackFrameMat);
      track.position.set(wallX, ty, 10.8);
      roomGroup.add(track);
    }
    for (let dz = 7.45; dz <= 14.2; dz += 1.675) {
      const post = new THREE.Mesh(new THREE.BoxGeometry(0.11, 3.04, 0.075), blackFrameMat);
      post.position.set(wallX, 1.52, dz);
      roomGroup.add(post);
    }
    for (const hy of [1.02, 2.04]) {
      const bar = new THREE.Mesh(new THREE.BoxGeometry(0.085, 0.045, 6.7), blackFrameMat);
      bar.position.set(wallX, hy, 10.8);
      roomGroup.add(bar);
    }
  }

  addFrostedGlassWall(7.8);  // Right frosted glass wall
  addFrostedGlassWall(-2.4); // Matching left frosted glass wall!

  // --- Centerpiece: 4-Seat Shared Warm Solid-Wood Table (centered at x = 2.7, z = 11.0) ---
  const tableX = 2.7;
  const tableZ = 11.0;
  const tableW = 2.05; // along X
  const tableD = 2.45; // along Z
  const teakMat = new THREE.MeshStandardMaterial({ color: 0xa66a38, roughness: 0.48 });

  const tableTop = new THREE.Mesh(new THREE.BoxGeometry(tableW, 0.07, tableD), teakMat);
  tableTop.position.set(tableX, 0.75, tableZ);
  tableTop.castShadow = true;
  tableTop.receiveShadow = true;
  roomGroup.add(tableTop);

  for (const [lx, lz] of [
    [-tableW / 2 + 0.11, -tableD / 2 + 0.11],
    [tableW / 2 - 0.11, -tableD / 2 + 0.11],
    [-tableW / 2 + 0.11, tableD / 2 - 0.11],
    [tableW / 2 - 0.11, tableD / 2 - 0.11],
  ]) {
    const leg = new THREE.Mesh(new THREE.BoxGeometry(0.085, 0.72, 0.085), teakMat);
    leg.position.set(tableX + lx, 0.36, tableZ + lz);
    leg.castShadow = true;
    roomGroup.add(leg);
  }

  const darkPlastic = new THREE.MeshStandardMaterial({ color: 0x14171f, roughness: 0.45 });
  const keyMat = new THREE.MeshStandardMaterial({ color: 0x262a34, roughness: 0.6 });
  const macSilverMat = new THREE.MeshStandardMaterial({ color: 0xd4d8de, roughness: 0.25, metalness: 0.75 });

  const studioSeats = [
    { num: 1, faceDirX: -1, z: tableZ - 0.58, jacket: false },
    { num: 2, faceDirX: -1, z: tableZ + 0.58, jacket: false },
    { num: 3, faceDirX: 1, z: tableZ + 0.58, jacket: false },
    { num: 4, faceDirX: 1, z: tableZ - 0.58, jacket: true },
  ];

  const studioWorkstations = studioSeats.map((s, idx) => {
    const wsId = startId + idx;
    const chairDirX = -s.faceDirX;
    const monitorX = tableX + chairDirX * 0.20;
    const keyboardX = tableX + chairDirX * 0.64;
    const deskEdgeX = tableX + chairDirX * 0.92;

    const monGroup = new THREE.Group();
    monGroup.position.set(monitorX, 0.785, s.z);
    monGroup.rotation.y = chairDirX === -1 ? -Math.PI / 2 : Math.PI / 2;

    const standBase = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.02, 0.15), darkPlastic);
    monGroup.add(standBase);
    const standNeck = new THREE.Mesh(new THREE.BoxGeometry(0.048, 0.23, 0.04), darkPlastic);
    standNeck.position.set(0, 0.115, -0.02);
    monGroup.add(standNeck);
    const monFrame = new THREE.Mesh(new THREE.BoxGeometry(0.72, 0.43, 0.035), darkPlastic);
    monFrame.position.set(0, 0.29, 0);
    monFrame.castShadow = true;
    monGroup.add(monFrame);

    const screenController = createMonitorScreen(wsId);
    const screenMat = new THREE.MeshStandardMaterial({
      map: screenController.texture,
      emissive: new THREE.Color(0xffffff),
      emissiveMap: screenController.texture,
      emissiveIntensity: 0.42,
      roughness: 0.25,
    });
    const screenMesh = new THREE.Mesh(new THREE.PlaneGeometry(0.66, 0.37), screenMat);
    screenMesh.position.set(0, 0.29, 0.02);
    monGroup.add(screenMesh);
    roomGroup.add(monGroup);

    const kb = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.02, 0.38), keyMat);
    kb.position.set(keyboardX, 0.795, s.z);
    roomGroup.add(kb);

    const mouse = new THREE.Mesh(new THREE.BoxGeometry(0.085, 0.02, 0.055), keyMat);
    mouse.position.set(keyboardX, 0.795, s.z + (chairDirX === -1 ? 0.28 : -0.28));
    roomGroup.add(mouse);

    const macMini = new THREE.Mesh(new THREE.BoxGeometry(0.17, 0.04, 0.17), macSilverMat);
    macMini.position.set(monitorX + chairDirX * 0.18, 0.805, s.z + (chairDirX === -1 ? -0.30 : 0.30));
    macMini.castShadow = true;
    roomGroup.add(macMini);

    const chairSitX = deskEdgeX + chairDirX * 0.50;
    const chairOutX = deskEdgeX + chairDirX * 0.76;
    const sitX = deskEdgeX + chairDirX * 0.44;
    const aisleX = deskEdgeX + chairDirX * 1.32;

    const chair = createHeadrestOfficeChair(s.jacket);
    chair.position.set(chairSitX, 0, s.z);
    chair.rotation.y = s.faceDirX === 1 ? -Math.PI / 2 : Math.PI / 2;
    roomGroup.add(chair);

    return {
      id: wsId,
      room: 'studio',
      label: `Studio #${s.num}`,
      group: roomGroup,
      chair,
      chairSide: chairDirX,
      chairDir: new THREE.Vector3(chairDirX, 0, 0),
      chairSitPos: new THREE.Vector3(chairSitX, 0, s.z),
      chairOutPos: new THREE.Vector3(chairOutX, 0, s.z),
      chairSitZ: s.z,
      chairOutZ: s.z,
      facingAngle: s.faceDirX === 1 ? Math.PI / 2 : -Math.PI / 2,
      aisleFacingAngle: s.faceDirX === 1 ? -Math.PI / 2 : Math.PI / 2,
      sitWorldPos: new THREE.Vector3(sitX, 0, s.z),
      aislePos: new THREE.Vector3(aisleX, 0, s.z),
      deskPos: new THREE.Vector3(deskEdgeX, 0, s.z),
      aisleZ: s.z,
      screenController,
    };
  });

  // Studio Room POIs
  const studioPois = [
    {
      id: 'studio_cabinet',
      room: 'studio',
      label: 'Ambil Barang di Kabinet Kayu',
      spot: new THREE.Vector3(1.85, 0, 8.75),
      lookAt: new THREE.Vector3(1.85, 0, 7.75),
      activity: 'bags',
    },
    {
      id: 'studio_bottle',
      room: 'studio',
      label: 'Minum / Cek Tas di Kabinet',
      spot: new THREE.Vector3(3.60, 0, 8.75),
      lookAt: new THREE.Vector3(3.60, 0, 7.75),
      activity: 'coffee',
    },
    {
      id: 'studio_stretch',
      room: 'studio',
      label: 'Peregangan di Ruang Kayu',
      spot: new THREE.Vector3(-0.6, 0, 11.4),
      lookAt: new THREE.Vector3(2.7, 0, 11.0),
      activity: 'stretch',
    },
  ];

  return {
    roomGroup,
    studioWorkstations,
    studioPois,
    ceilingGroup: null,
  };
}

/**
 * Adds a potted plant.
 */
function createPlant(x, z, scale = 1.0) {
  const g = new THREE.Group();
  g.position.set(x, 0, z);
  g.scale.setScalar(scale);

  const pot = new THREE.Mesh(
    new THREE.CylinderGeometry(0.26, 0.19, 0.42, 14),
    new THREE.MeshStandardMaterial({ color: 0xe2e8f0, roughness: 0.7 })
  );
  pot.position.y = 0.21;
  pot.castShadow = true;
  pot.receiveShadow = true;
  g.add(pot);

  const leafMat = new THREE.MeshStandardMaterial({ color: 0x16a34a, roughness: 0.65 });
  const leafDark = new THREE.MeshStandardMaterial({ color: 0x15803d, roughness: 0.7 });
  for (let i = 0; i < 6; i++) {
    const angle = (i / 6) * Math.PI * 2;
    const leaf = new THREE.Mesh(new THREE.ConeGeometry(0.14, 0.55, 6), i % 2 === 0 ? leafMat : leafDark);
    leaf.position.set(Math.sin(angle) * 0.14, 0.68 + (i % 2) * 0.08, Math.cos(angle) * 0.14);
    leaf.rotation.z = -Math.sin(angle) * 0.35;
    leaf.rotation.x = Math.cos(angle) * 0.35;
    leaf.castShadow = true;
    g.add(leaf);
  }
  return g;
}

/**
 * Builds the office matching the user's exact floor plan:
 * - Top Row (z = -5.4): PC 1, PC 2, PC 3, PC 4 (facing -Z)
 * - Middle Block (aligned under PC 2..PC 4):
 *     - Cabinet ("kabinet berisi mesin kopi dan tas kerja") at z = -1.1
 *     - PC 5, PC 6, PC 7 right behind/below cabinet at z = +0.0 (facing -Z)
 * - Bottom Row (z = +5.4): PC 11, PC 10, PC 9, PC 8 (left to right, facing +Z)
 */
export function buildOfficeScene(scene) {
  // Warm sunlit Hay Day 2.5D isometric diorama backdrop
  scene.background = new THREE.Color(0xf4efe4);
  scene.fog = null;

  // Separate container group for Main Office so it can be toggled independently from Ruang Kayu
  const mainRoomGroup = new THREE.Group();
  scene.add(mainRoomGroup);

  // Warm golden-hour storybook lighting (signature Hay Day look!)
  const hemiLight = new THREE.HemisphereLight(0xfffbeb, 0x93c5fd, 1.15);
  hemiLight.position.set(0, 18, 0);
  scene.add(hemiLight);

  const sunLight = new THREE.DirectionalLight(0xfff1cc, 1.85);
  sunLight.position.set(14, 22, 12);
  sunLight.castShadow = true;
  sunLight.shadow.mapSize.set(2048, 2048);
  sunLight.shadow.camera.near = 2;
  sunLight.shadow.camera.far = 56;
  sunLight.shadow.camera.left = -18;
  sunLight.shadow.camera.right = 18;
  sunLight.shadow.camera.top = 18;
  sunLight.shadow.camera.bottom = -18;
  sunLight.shadow.bias = -0.0004;
  scene.add(sunLight);

  const rimLight = new THREE.DirectionalLight(0xbfe3ff, 0.55);
  rimLight.position.set(-14, 12, -10);
  scene.add(rimLight);

  // Compact Main Office Floor (13.0m x 11.8m) + thick architectural 2.5D diorama slab base
  const floorTex = createFloorTexture();
  floorTex.repeat.set(5, 4.5);
  const floor = new THREE.Mesh(
    new THREE.PlaneGeometry(13.0, 11.8),
    new THREE.MeshStandardMaterial({ map: floorTex, roughness: 0.82 })
  );
  floor.rotation.x = -Math.PI / 2;
  floor.receiveShadow = true;
  mainRoomGroup.add(floor);

  const mainSlab = new THREE.Mesh(
    new THREE.BoxGeometry(13.4, 0.48, 12.2),
    new THREE.MeshStandardMaterial({ color: 0xd6cfc2, roughness: 0.78 })
  );
  mainSlab.position.set(0, -0.25, 0);
  mainSlab.receiveShadow = true;
  mainRoomGroup.add(mainSlab);

  const mainSlabTrim = new THREE.Mesh(
    new THREE.BoxGeometry(13.55, 0.10, 12.35),
    new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.5 })
  );
  mainSlabTrim.position.set(0, -0.46, 0);
  mainRoomGroup.add(mainSlabTrim);

  // Subtle accent rug in the open left area (between PC 1 and PC 11)
  const leftRug = new THREE.Mesh(
    new THREE.PlaneGeometry(2.6, 4.2),
    new THREE.MeshStandardMaterial({ color: 0xcbd5e1, roughness: 0.95 })
  );
  leftRug.rotation.x = -Math.PI / 2;
  leftRug.position.set(-4.35, 0.004, -0.1);
  leftRug.receiveShadow = true;
  mainRoomGroup.add(leftRug);

  // Walls (Back wall at z = -5.9, Right wall at x = +6.5, South wall at z = +5.9)
  const wallMat = new THREE.MeshStandardMaterial({ color: 0xf1f5f9, roughness: 0.9 });
  const trimMat = new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.5 });

  // Back wall (z = -5.9): outer windows behind PC 1 & PC 4, solid center wall behind PC 2 & PC 3 (for the large TV)
  const backWallLower = new THREE.Mesh(new THREE.BoxGeometry(13.2, 1.1, 0.25), wallMat);
  backWallLower.position.set(0, 0.55, -5.9);
  backWallLower.receiveShadow = true;
  mainRoomGroup.add(backWallLower);

  const backWallUpper = new THREE.Mesh(new THREE.BoxGeometry(13.2, 0.7, 0.25), wallMat);
  backWallUpper.position.set(0, 3.65, -5.9);
  mainRoomGroup.add(backWallUpper);

  // Solid center wall replacing the 2 middle windows above PC 2 & PC 3 (x = -3.2 to +3.2)
  const backWallCenterSolid = new THREE.Mesh(new THREE.BoxGeometry(6.4, 2.3, 0.25), wallMat);
  backWallCenterSolid.position.set(0, 2.2, -5.9);
  backWallCenterSolid.receiveShadow = true;
  mainRoomGroup.add(backWallCenterSolid);

  const glassMat = new THREE.MeshPhysicalMaterial({
    color: 0xbae6fd,
    transparent: true,
    opacity: 0.35,
    roughness: 0.1,
    metalness: 0.1,
  });

  // Only the 2 outer glass windows on back wall (left: x=-4.8, right: x=+4.8)
  for (const gx of [-4.8, 4.8]) {
    const pane = new THREE.Mesh(new THREE.BoxGeometry(3.2, 2.2, 0.06), glassMat);
    pane.position.set(gx, 2.2, -5.9);
    mainRoomGroup.add(pane);
  }

  for (const wx of [-6.4, -3.2, 3.2, 6.4]) {
    const mullion = new THREE.Mesh(new THREE.BoxGeometry(0.14, 2.3, 0.28), trimMat);
    mullion.position.set(wx, 2.2, -5.9);
    mullion.castShadow = true;
    mainRoomGroup.add(mullion);
  }

  // Left side (x = -6.5): open (no wall blocking the camera view)

  // Right wall (x = +6.5) WITH large glass windows
  const rightWallLower = new THREE.Mesh(new THREE.BoxGeometry(0.25, 1.1, 12.0), wallMat);
  rightWallLower.position.set(6.5, 0.55, 0);
  rightWallLower.receiveShadow = true;
  mainRoomGroup.add(rightWallLower);

  const rightWallUpper = new THREE.Mesh(new THREE.BoxGeometry(0.25, 0.7, 12.0), wallMat);
  rightWallUpper.position.set(6.5, 3.65, 0);
  mainRoomGroup.add(rightWallUpper);

  const rightWindowGlass = new THREE.Mesh(new THREE.BoxGeometry(0.06, 2.2, 11.6), glassMat);
  rightWindowGlass.position.set(6.5, 2.2, 0);
  mainRoomGroup.add(rightWindowGlass);

  for (let wz = -5.8; wz <= 5.85; wz += 2.9) {
    const mullion = new THREE.Mesh(new THREE.BoxGeometry(0.28, 2.3, 0.14), trimMat);
    mullion.position.set(6.5, 2.2, wz);
    mullion.castShadow = true;
    mainRoomGroup.add(mullion);
  }

  // Front/South wall (z = +5.9, behind PC 11..PC 8): solid plain wall with 1 wall-mounted AC
  const southWall = new THREE.Mesh(new THREE.BoxGeometry(13.2, 4.0, 0.25), wallMat);
  southWall.position.set(0, 2.0, 5.9);
  southWall.receiveShadow = true;
  mainRoomGroup.add(southWall);

  // 1 Split AC unit mounted high on the plain wall (facing inward -Z)
  const wallAC = createWallAC(0.0, 3.25, 5.64);
  mainRoomGroup.add(wallAC.group);

  // Potted plants in corners
  mainRoomGroup.add(createPlant(-5.8, -5.1, 0.95));
  mainRoomGroup.add(createPlant(5.8, -5.1, 0.95));
  mainRoomGroup.add(createPlant(-5.8, 5.1, 0.92));
  mainRoomGroup.add(createPlant(5.8, 5.1, 0.92));

  // --- Large Window-Sized Wall TV above PC 2 and PC 3 ---
  const wallTV = createWallTV(0.0, 2.20, -5.72);
  mainRoomGroup.add(wallTV.group);

  // --- Central Cabinet: "kabinet berisi mesin kopi dan tas kerja" (compact width 6.55m above PC 5..7) ---
  const cabinet = createCoffeeAndBagsCabinet(1.12, -0.90, 6.55);
  mainRoomGroup.add(cabinet.group);

  // --- Water Dispenser placed right at the -X end of the coffee cabinet ---
  mainRoomGroup.add(createWaterDispenser(-2.42, -0.90));

  // --- Create 11 Workstations (tighter, denser office layout!) ---
  const chairColors = new Array(11).fill(0x18181b);

  const UPPER_AISLE_Z = -2.55;
  const LOWER_AISLE_Z = 2.35;
  const LEFT_CORRIDOR_X = -3.75;
  const RIGHT_CORRIDOR_X = 5.25;

  const layoutDefs = [
    // Top Row (Left -> Right): PC 1, PC 2, PC 3, PC 4 (facing -Z)
    { pc: 1, x: -3.35, z: -4.55, aisleZ: UPPER_AISLE_Z, faceDirZ: -1 },
    { pc: 2, x: -1.12, z: -4.55, aisleZ: UPPER_AISLE_Z, faceDirZ: -1 },
    { pc: 3, x: 1.12, z: -4.55, aisleZ: UPPER_AISLE_Z, faceDirZ: -1 },
    { pc: 4, x: 3.35, z: -4.55, aisleZ: UPPER_AISLE_Z, faceDirZ: -1 },

    // Middle Row (Left -> Right under Cabinet): PC 5, PC 6, PC 7 (facing -Z)
    { pc: 5, x: -1.06, z: 0.18, aisleZ: LOWER_AISLE_Z, faceDirZ: -1 },
    { pc: 6, x: 1.12, z: 0.18, aisleZ: LOWER_AISLE_Z, faceDirZ: -1 },
    { pc: 7, x: 3.30, z: 0.18, aisleZ: LOWER_AISLE_Z, faceDirZ: -1 },

    // Bottom Row (Right -> Left: PC 8, PC 9, PC 10, PC 11; facing +Z)
    { pc: 8, x: 3.35, z: 4.55, aisleZ: LOWER_AISLE_Z, faceDirZ: 1 },
    { pc: 9, x: 1.12, z: 4.55, aisleZ: LOWER_AISLE_Z, faceDirZ: 1 },
    { pc: 10, x: -1.12, z: 4.55, aisleZ: LOWER_AISLE_Z, faceDirZ: 1 },
    { pc: 11, x: -3.35, z: 4.55, aisleZ: LOWER_AISLE_Z, faceDirZ: 1 },
  ];

  const workstations = layoutDefs.map((def, i) => {
    const ws = createWorkstation(def.pc, def.x, def.z, def.aisleZ, def.faceDirZ, chairColors[i]);
    mainRoomGroup.add(ws.group);
    return ws;
  });

  // --- New Wood Studio Area (Ruang Kayu) in its own separate room group ---
  const studio = buildWoodStudioRoom(scene, 12);
  studio.roomGroup.visible = false; // Hidden until user switches to Ruang Kayu view!
  const allWorkstations = [...workstations, ...studio.studioWorkstations];

  // --- Points of Interest (POIs) matched to tighter Kantor Utama ---
  const pois = [
    {
      id: 'coffee',
      label: 'Membuat Kopi',
      aisleZ: UPPER_AISLE_Z,
      spot: new THREE.Vector3(-0.35, 0, -1.78),
      lookAt: new THREE.Vector3(-0.35, 0, -0.90),
      activity: 'coffee',
    },
    {
      id: 'kettle',
      label: 'Seduh Teh / Air',
      aisleZ: UPPER_AISLE_Z,
      spot: new THREE.Vector3(1.35, 0, -1.78),
      lookAt: new THREE.Vector3(1.35, 0, -0.90),
      activity: 'coffee',
    },
    {
      id: 'bags',
      label: 'Cek Tas Kerja',
      aisleZ: UPPER_AISLE_Z,
      spot: new THREE.Vector3(3.05, 0, -1.78),
      lookAt: new THREE.Vector3(3.05, 0, -0.90),
      activity: 'bags',
    },
    {
      id: 'windowView',
      label: 'Lihat Jendela / Istirahat',
      aisleZ: UPPER_AISLE_Z,
      rightCorridorOnly: true,
      spot: new THREE.Vector3(5.65, 0, -0.4),
      lookAt: new THREE.Vector3(6.5, 0, -0.4),
      activity: 'stretch',
    },
    {
      id: 'dispenser',
      label: 'Ambil Air Dispenser',
      aisleZ: UPPER_AISLE_Z,
      corridorOnly: true,
      spot: new THREE.Vector3(-3.12, 0, -0.90),
      lookAt: new THREE.Vector3(-2.42, 0, -0.90),
      activity: 'coffee',
    },
    {
      id: 'stretch',
      label: 'Peregangan / Santai',
      aisleZ: LOWER_AISLE_Z,
      corridorOnly: true,
      spot: new THREE.Vector3(-4.45, 0, 1.0),
      lookAt: new THREE.Vector3(-6.2, 0, 1.0),
      activity: 'stretch',
    },
  ];

  /**
   * Collision-free waypoint path from a workstation to a POI (supports both Main Office and Wood Studio Room).
   */
  function buildPathToPOI(workstation, poi) {
    if (workstation.room === 'studio') {
      const laneZ = poi.spot.z < 10.45 ? 8.85 : 12.25;
      return [
        workstation.aislePos.clone(),
        new THREE.Vector3(workstation.aislePos.x, 0, laneZ),
        new THREE.Vector3(poi.spot.x, 0, laneZ),
        poi.spot.clone(),
      ];
    }

    const jitterZ = (Math.random() - 0.5) * 0.35;
    const jitterX = (Math.random() - 0.5) * 0.45;
    const startAisleZ = workstation.aisleZ + jitterZ;
    const targetX = poi.spot.x + jitterX;

    if (poi.corridorOnly || poi.rightCorridorOnly) {
      const corridorX = poi.rightCorridorOnly ? RIGHT_CORRIDOR_X : LEFT_CORRIDOR_X;
      return [
        new THREE.Vector3(workstation.aislePos.x, 0, startAisleZ),
        new THREE.Vector3(corridorX + (Math.random() - 0.5) * 0.4, 0, startAisleZ),
        new THREE.Vector3(corridorX + (Math.random() - 0.5) * 0.4, 0, poi.spot.z),
        new THREE.Vector3(poi.spot.x + (Math.random() - 0.5) * 0.25, 0, poi.spot.z + (Math.random() - 0.5) * 0.5),
      ];
    }

    if (Math.abs(workstation.aisleZ - poi.aisleZ) < 0.2) {
      // Same horizontal aisle (e.g. PC 1..4 going to Cabinet!)
      return [
        new THREE.Vector3(workstation.aislePos.x, 0, startAisleZ),
        new THREE.Vector3(targetX, 0, startAisleZ),
        new THREE.Vector3(targetX, 0, poi.spot.z),
      ];
    }

    // Different aisle (e.g. PC 5..11 going to Cabinet): pick closer vertical corridor (left or right)
    const corridorX = (workstation.aislePos.x < 1.2 ? LEFT_CORRIDOR_X : RIGHT_CORRIDOR_X) + (Math.random() - 0.5) * 0.35;
    const endAisleZ = poi.aisleZ + (Math.random() - 0.5) * 0.35;

    return [
      new THREE.Vector3(workstation.aislePos.x, 0, startAisleZ),
      new THREE.Vector3(corridorX, 0, startAisleZ),
      new THREE.Vector3(corridorX, 0, endAisleZ),
      new THREE.Vector3(targetX, 0, endAisleZ),
      new THREE.Vector3(targetX, 0, poi.spot.z),
    ];
  }

  /**
   * Collision-free waypoint path returning from currentPos to workstation.
   */
  function buildPathToDesk(currentPos, workstation, poi) {
    if (workstation.room === 'studio') {
      const laneZ = currentPos.z < 10.45 ? 8.85 : 12.25;
      return [
        new THREE.Vector3(currentPos.x, 0, laneZ),
        new THREE.Vector3(workstation.aislePos.x, 0, laneZ),
        workstation.aislePos.clone(),
      ];
    }

    const jitterZ = (Math.random() - 0.5) * 0.35;
    const destAisleZ = workstation.aisleZ + jitterZ;

    if (poi && (poi.corridorOnly || poi.rightCorridorOnly)) {
      const corridorX = (poi.rightCorridorOnly ? RIGHT_CORRIDOR_X : LEFT_CORRIDOR_X) + (Math.random() - 0.5) * 0.35;
      return [
        new THREE.Vector3(corridorX, 0, currentPos.z),
        new THREE.Vector3(corridorX, 0, destAisleZ),
        new THREE.Vector3(workstation.aislePos.x, 0, destAisleZ),
        new THREE.Vector3(workstation.aislePos.x, 0, workstation.aislePos.z),
      ];
    }

    const currAisleZ = currentPos.z < -1.0 ? UPPER_AISLE_Z : LOWER_AISLE_Z;
    if (Math.abs(currAisleZ - workstation.aisleZ) < 0.2) {
      return [
        new THREE.Vector3(currentPos.x, 0, destAisleZ),
        new THREE.Vector3(workstation.aislePos.x, 0, destAisleZ),
        new THREE.Vector3(workstation.aislePos.x, 0, workstation.aislePos.z),
      ];
    }

    const corridorX = (workstation.aislePos.x < 1.2 ? LEFT_CORRIDOR_X : RIGHT_CORRIDOR_X) + (Math.random() - 0.5) * 0.35;
    const startAisleZ = currAisleZ + (Math.random() - 0.5) * 0.3;

    return [
      new THREE.Vector3(currentPos.x, 0, startAisleZ),
      new THREE.Vector3(corridorX, 0, startAisleZ),
      new THREE.Vector3(corridorX, 0, destAisleZ),
      new THREE.Vector3(workstation.aislePos.x, 0, destAisleZ),
      new THREE.Vector3(workstation.aislePos.x, 0, workstation.aislePos.z),
    ];
  }

  function updateEnvironment(time) {
    cabinet.updateCoffeeSteam(time);
    wallAC.updateAC(time);
  }

  return {
    mainRoomGroup,
    studioRoomGroup: studio.roomGroup,
    workstations: allWorkstations,
    mainWorkstations: workstations,
    studioWorkstations: studio.studioWorkstations,
    pois,
    studioPois: studio.studioPois,
    studioCeiling: studio.ceilingGroup,
    wallTV,
    updateEnvironment,
    buildPathToPOI,
    buildPathToDesk,
  };
}
