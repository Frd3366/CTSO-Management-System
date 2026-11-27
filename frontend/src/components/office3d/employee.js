import * as THREE from 'three';

export const EMPLOYEE_STATES = {
  WORKING: 'WORKING',
  STANDING_UP: 'STANDING_UP',
  WALKING_TO_POI: 'WALKING_TO_POI',
  AT_POI: 'AT_POI',
  WALKING_BACK: 'WALKING_BACK',
  SITTING_DOWN: 'SITTING_DOWN',
};

export const EMPLOYEE_PROFILES = [
  { name: 'Andi Pratama', role: 'Frontend Dev', gender: 'male', blazer: '#181b22', pants: '#232732', tie: '#38bdf8', skin: '#f2c29b', hair: '#2c1e16', eyeColor: '#1e293b', glasses: true, prop: 'phone' },
  { name: 'Budi Santoso', role: 'Backend Dev', gender: 'male', blazer: '#1b202c', pants: '#262b38', tie: '#facc15', skin: '#e4b087', hair: '#1c1917', eyeColor: '#1e1b18', glasses: false, prop: 'phone' },
  { name: 'Citra Lestari', role: 'UI/UX Designer', gender: 'female', blazer: '#181b22', pants: '#252a36', tie: null, skin: '#f6cca8', hair: '#3d2518', eyeColor: '#2c1e16', glasses: false, prop: 'phone' },
  { name: 'Dewi Anggraini', role: 'Product Manager', gender: 'female', blazer: '#1e222d', pants: '#282d3a', tie: null, skin: '#f0be96', hair: '#261a14', eyeColor: '#1e293b', glasses: true, prop: 'notebook' },
  { name: 'Eko Wijaya', role: 'DevOps Engineer', gender: 'male', blazer: '#171a21', pants: '#222630', tie: '#60a5fa', skin: '#dfa87e', hair: '#221b17', eyeColor: '#18181b', glasses: false, prop: 'phone' },
  { name: 'Fitri Handayani', role: 'QA Engineer', gender: 'female', blazer: '#1a1e28', pants: '#262b36', tie: null, skin: '#f4c7a2', hair: '#4a2e1e', eyeColor: '#2c1e16', glasses: true, prop: 'notebook' },
  { name: 'Gilang Ramadhan', role: 'Data Analyst', gender: 'male', blazer: '#1c212e', pants: '#252a36', tie: '#38bdf8', skin: '#e8b58d', hair: '#241c18', eyeColor: '#1e293b', glasses: false, prop: 'phone' },
  { name: 'Hana Permata', role: 'HR Specialist', gender: 'female', blazer: '#181b22', pants: '#242934', tie: null, skin: '#f7d0ae', hair: '#312018', eyeColor: '#2c1e16', glasses: false, prop: 'phone' },
  { name: 'Indra Kusuma', role: 'Mobile Dev', gender: 'male', blazer: '#191d26', pants: '#232833', tie: '#facc15', skin: '#ebb992', hair: '#28201b', eyeColor: '#1e293b', glasses: true, prop: 'phone' },
  { name: 'Joko Susilo', role: 'Tech Lead', gender: 'male', blazer: '#161920', pants: '#20242e', tie: '#60a5fa', skin: '#e2ac84', hair: '#2a221d', eyeColor: '#18181b', glasses: true, prop: 'phone' },
];

export const STUDIO_PROFILES = [
  { name: 'Kevin Pratama', role: 'Lead Architect', gender: 'male', blazer: '#181b22', pants: '#222630', tie: '#38bdf8', skin: '#f0be96', hair: '#261b15', eyeColor: '#1e293b', glasses: true, prop: 'phone' },
  { name: 'Laras Wulandari', role: 'Design Lead', gender: 'female', blazer: '#1b202c', pants: '#252a36', tie: null, skin: '#f7d0ae', hair: '#382419', eyeColor: '#2c1e16', glasses: false, prop: 'notebook' },
  { name: 'Dimas Aditya', role: 'Senior Engineer', gender: 'male', blazer: '#171a21', pants: '#20242e', tie: '#facc15', skin: '#e5b28a', hair: '#1f1916', eyeColor: '#18181b', glasses: false, prop: 'phone' },
  { name: 'Nadia Putri', role: 'Product Lead', gender: 'female', blazer: '#191d26', pants: '#242934', tie: null, skin: '#f5c9a4', hair: '#2e1e16', eyeColor: '#1e293b', glasses: true, prop: 'notebook' },
];

function lerp(a, b, t) {
  return a + (b - a) * Math.min(1, t);
}

function lerpAngle(current, target, t) {
  let diff = ((target - current + Math.PI) % (Math.PI * 2)) - Math.PI;
  if (diff < -Math.PI) diff += Math.PI * 2;
  return current + diff * Math.min(1, t);
}

function makePixelTexture(canvas) {
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.magFilter = THREE.NearestFilter;
  tex.minFilter = THREE.NearestFilter;
  tex.generateMipmaps = false;
  return tex;
}

/**
 * Creates crisp 16x16 Minecraft-style pixel-art head textures with clearly visible face,
 * open forehead, expressive eyes, optional glasses, and blinking/talking support.
 */
function createMinecraftHeadMaterials(profile) {
  const isFemale = profile.gender === 'female';

  // --- Front Face (16x16 pixel art, animated for blink & talk) ---
  const faceCanvas = document.createElement('canvas');
  faceCanvas.width = 16;
  faceCanvas.height = 16;
  const fctx = faceCanvas.getContext('2d');
  const faceTex = makePixelTexture(faceCanvas);

  let lastFaceKey = '';
  function drawFace(blink = false, talk = false) {
    const key = `${blink ? 1 : 0}_${talk ? 1 : 0}`;
    if (key === lastFaceKey) return;
    lastFaceKey = key;

    // Skin base
    fctx.fillStyle = profile.skin;
    fctx.fillRect(0, 0, 16, 16);

    // Subtle cheek shade / blush
    fctx.fillStyle = isFemale ? 'rgba(244, 114, 140, 0.35)' : 'rgba(210, 130, 100, 0.16)';
    fctx.fillRect(2, 10, 2, 2);
    fctx.fillRect(12, 10, 2, 2);

    // Top hairline / bangs (ONLY top 3-4 rows so face & forehead are 100% clearly visible!)
    fctx.fillStyle = profile.hair;
    fctx.fillRect(0, 0, 16, 3);
    // Side framing strands
    fctx.fillRect(0, 3, 2, isFemale ? 11 : 4);
    fctx.fillRect(14, 3, 2, isFemale ? 11 : 4);
    // Cute asymmetric fringe pixels
    fctx.fillRect(2, 3, 3, 1);
    fctx.fillRect(11, 3, 3, 1);
    if (isFemale) {
      fctx.fillRect(2, 4, 1, 2);
      fctx.fillRect(13, 4, 1, 2);
    }

    // Eyebrows (row 5)
    fctx.fillStyle = profile.hair;
    fctx.fillRect(3, 5, 3, 1);
    fctx.fillRect(10, 5, 3, 1);

    // Eyes (rows 7-8 — classic crisp Minecraft eyes!)
    if (blink) {
      fctx.fillStyle = '#1e1b18';
      fctx.fillRect(3, 8, 3, 1);
      fctx.fillRect(10, 8, 3, 1);
    } else {
      // White sclera
      fctx.fillStyle = '#ffffff';
      fctx.fillRect(3, 7, 3, 2);
      fctx.fillRect(10, 7, 3, 2);
      // Dark iris/pupil
      fctx.fillStyle = profile.eyeColor;
      fctx.fillRect(4, 7, 2, 2);
      fctx.fillRect(10, 7, 2, 2);
      // Subtle white glint pixel
      fctx.fillStyle = '#ffffff';
      fctx.fillRect(4, 7, 1, 1);
      fctx.fillRect(10, 7, 1, 1);
      // Lash pixel for female
      if (isFemale) {
        fctx.fillStyle = '#18181b';
        fctx.fillRect(2, 7, 1, 1);
        fctx.fillRect(13, 7, 1, 1);
      }
    }

    // Optional pixel glasses
    if (profile.glasses) {
      fctx.fillStyle = '#1e293b';
      // Top & bottom rims
      fctx.fillRect(2, 6, 5, 1);
      fctx.fillRect(9, 6, 5, 1);
      fctx.fillRect(2, 9, 5, 1);
      fctx.fillRect(9, 9, 5, 1);
      // Sides & bridge
      fctx.fillRect(2, 7, 1, 2);
      fctx.fillRect(6, 7, 1, 2);
      fctx.fillRect(9, 7, 1, 2);
      fctx.fillRect(13, 7, 1, 2);
      fctx.fillRect(7, 7, 2, 1);
    }

    // Subtle nose shade (row 10)
    fctx.fillStyle = 'rgba(155, 95, 70, 0.35)';
    fctx.fillRect(7, 10, 2, 1);

    // Friendly smile / talking mouth (rows 12-13)
    if (talk) {
      fctx.fillStyle = '#9f3a44';
      fctx.fillRect(6, 12, 4, 2);
      fctx.fillStyle = '#ffffff';
      fctx.fillRect(7, 12, 2, 1);
    } else {
      fctx.fillStyle = isFemale ? '#d46372' : '#9c5a4a';
      fctx.fillRect(6, 12, 4, 1);
      fctx.fillRect(5, 11, 1, 1);
      fctx.fillRect(10, 11, 1, 1);
    }

    faceTex.needsUpdate = true;
  }
  drawFace(false, false);

  // --- Side Faces (Left & Right, 16x16) ---
  function makeSideMat(flip) {
    const c = document.createElement('canvas');
    c.width = 16;
    c.height = 16;
    const ctx = c.getContext('2d');
    ctx.fillStyle = profile.skin;
    ctx.fillRect(0, 0, 16, 16);

    ctx.fillStyle = profile.hair;
    ctx.fillRect(0, 0, 16, 4);
    if (isFemale) {
      ctx.fillRect(flip ? 0 : 3, 4, 13, 12);
    } else {
      ctx.fillRect(flip ? 0 : 4, 4, 12, 5);
      ctx.fillRect(flip ? 0 : 9, 9, 7, 4);
      // Sideburn pixel
      ctx.fillRect(flip ? 11 : 3, 4, 2, 5);
    }
    return new THREE.MeshStandardMaterial({ map: makePixelTexture(c), roughness: 0.75 });
  }

  // --- Top & Back Hair (16x16 with subtle pixel texture variation) ---
  const hairCanvas = document.createElement('canvas');
  hairCanvas.width = 16;
  hairCanvas.height = 16;
  const hctx = hairCanvas.getContext('2d');
  hctx.fillStyle = profile.hair;
  hctx.fillRect(0, 0, 16, 16);
  hctx.fillStyle = 'rgba(255,255,255,0.06)';
  for (let i = 0; i < 16; i += 2) {
    hctx.fillRect(i, (i * 3) % 14, 1, 3);
  }
  const hairBlockMat = new THREE.MeshStandardMaterial({ map: makePixelTexture(hairCanvas), roughness: 0.78 });
  const skinBottomMat = new THREE.MeshStandardMaterial({ color: profile.skin, roughness: 0.75 });
  const faceMat = new THREE.MeshStandardMaterial({ map: faceTex, roughness: 0.72 });

  // BoxGeometry face order: +X, -X, +Y, -Y, +Z (front), -Z (back)
  const materials = [
    makeSideMat(false),
    makeSideMat(true),
    hairBlockMat,
    skinBottomMat,
    faceMat,
    hairBlockMat,
  ];

  return { materials, drawFace };
}

/**
 * Creates crisp 16x16 Minecraft pixel-art dark formal suit textures for the torso.
 */
function createMinecraftSuitMaterials(profile) {
  const isFemale = profile.gender === 'female';

  // Front torso (16x20 pixel art)
  const front = document.createElement('canvas');
  front.width = 16;
  front.height = 20;
  const ctx = front.getContext('2d');

  // Dark formal blazer base
  ctx.fillStyle = profile.blazer;
  ctx.fillRect(0, 0, 16, 20);

  // Darker lapel trim
  ctx.fillStyle = '#0f1117';
  ctx.fillRect(4, 0, 1, 11);
  ctx.fillRect(11, 0, 1, 11);
  ctx.fillRect(5, 11, 6, 1);

  // Crisp white inner dress shirt V
  ctx.fillStyle = '#f8fafc';
  ctx.fillRect(5, 0, 6, 6);
  ctx.fillRect(6, 6, 4, 4);
  ctx.fillRect(7, 10, 2, 2);

  // Slim formal tie for male staff
  if (!isFemale && profile.tie) {
    ctx.fillStyle = profile.tie;
    ctx.fillRect(7, 1, 2, 10);
  }

  // Yellow company badge pixel logo on left chest
  ctx.fillStyle = '#facc15';
  ctx.fillRect(11, 4, 2, 2);

  // Belt & silver buckle at bottom of torso
  ctx.fillStyle = '#090a0f';
  ctx.fillRect(0, 17, 16, 2);
  ctx.fillStyle = '#cbd5e1';
  ctx.fillRect(7, 17, 2, 2);

  // Back torso (16x20 pixel art with yellow company emblem)
  const back = document.createElement('canvas');
  back.width = 16;
  back.height = 20;
  const bctx = back.getContext('2d');
  bctx.fillStyle = profile.blazer;
  bctx.fillRect(0, 0, 16, 20);
  bctx.fillStyle = '#facc15';
  bctx.fillRect(6, 5, 4, 4);
  bctx.fillStyle = profile.blazer;
  bctx.fillRect(7, 6, 2, 2);
  bctx.fillStyle = '#090a0f';
  bctx.fillRect(0, 17, 16, 2);

  const solidBlazer = new THREE.MeshStandardMaterial({ color: profile.blazer, roughness: 0.72 });
  const frontMat = new THREE.MeshStandardMaterial({ map: makePixelTexture(front), roughness: 0.70 });
  const backMat = new THREE.MeshStandardMaterial({ map: makePixelTexture(back), roughness: 0.70 });

  return [solidBlazer, solidBlazer, solidBlazer, solidBlazer, frontMat, backMat];
}

/**
 * Creates a small floating rounded badge sprite for activity icons (☕, 💧, 💬, 🧘, 🎒).
 */
function createStatusBubbleSprite() {
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 128;
  const ctx = canvas.getContext('2d');
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;

  const material = new THREE.SpriteMaterial({
    map: texture,
    transparent: true,
    depthTest: false,
    opacity: 0,
  });
  const sprite = new THREE.Sprite(material);
  sprite.scale.set(0.42, 0.42, 1);

  let lastIcon = '';
  function setIcon(icon) {
    if (icon === lastIcon) return;
    lastIcon = icon;
    ctx.clearRect(0, 0, 128, 128);
    if (!icon) {
      texture.needsUpdate = true;
      return;
    }
    ctx.fillStyle = 'rgba(15, 23, 42, 0.86)';
    ctx.beginPath();
    ctx.arc(64, 64, 48, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = 'rgba(250, 204, 21, 0.8)';
    ctx.lineWidth = 5;
    ctx.stroke();

    ctx.font = '50px "Apple Color Emoji", "Segoe UI Emoji", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(icon, 64, 68);
    texture.needsUpdate = true;
  }

  return { sprite, setIcon };
}

export class Employee {
  constructor(index, profile, workstation, officeAPI) {
    this.index = index;
    this.id = index + 1;
    this.profile = profile;
    this.workstation = workstation;
    this.officeAPI = officeAPI;

    this.state = EMPLOYEE_STATES.WORKING;
    this.stateTimer = 0;
    this.workDuration = 9 + Math.random() * 14;
    this.breakDuration = 4.5 + Math.random() * 4.5;
    this.walkSpeed = 1.65 + Math.random() * 0.35;
    this.walkPhase = Math.random() * Math.PI * 2;
    this.typePhase = Math.random() * Math.PI * 2;

    this.workSubAction = 'typing';
    this.workSubTimer = 3 + Math.random() * 5;

    this.hasDrink = false;
    this.drinkType = 'coffee';
    this.drinkTimer = 0;

    this.discussionTarget = null;
    this.discussedBy = null;
    this.blinkTimer = 1.5 + Math.random() * 3.5;

    this.waypoints = [];
    this.waypointIndex = 0;
    this.currentPOI = null;
    this.selected = false;

    this.sitWorldPos = workstation.sitWorldPos.clone();
    this.chairDir = workstation.chairDir ? workstation.chairDir.clone() : new THREE.Vector3(0, 0, workstation.chairSide);
    this.chairSitPos = workstation.chairSitPos ? workstation.chairSitPos.clone() : new THREE.Vector3(workstation.deskPos.x, 0, workstation.chairSitZ);
    this.chairOutPos = workstation.chairOutPos ? workstation.chairOutPos.clone() : new THREE.Vector3(workstation.deskPos.x, 0, workstation.chairOutZ);
    this.chairSide = workstation.chairSide;
    this.facingAngle = workstation.facingAngle;
    this.aisleFacingAngle = workstation.aisleFacingAngle;

    this.standHipY = 0.86;
    this.sitHipY = 0.56;

    this.group = new THREE.Group();
    this.group.userData.employee = this;
    this.buildModel();

    this.group.position.copy(this.sitWorldPos);
    this.group.rotation.y = this.facingAngle;
    this.workstation.chair.position.copy(this.chairSitPos);
  }

  /**
   * Builds a crisp Minecraft-style voxel character with dark formal office suit
   * and clearly visible pixel-art face (male & female).
   */
  buildModel() {
    const isFemale = this.profile.gender === 'female';

    const blazerMat = new THREE.MeshStandardMaterial({ color: this.profile.blazer, roughness: 0.72 });
    const cuffMat = new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.65 });
    const pantsMat = new THREE.MeshStandardMaterial({ color: this.profile.pants, roughness: 0.78 });
    const skinMat = new THREE.MeshStandardMaterial({ color: this.profile.skin, roughness: 0.72 });
    const hairMat = new THREE.MeshStandardMaterial({ color: this.profile.hair, roughness: 0.8 });
    const shoeMat = new THREE.MeshStandardMaterial({ color: 0x111318, roughness: 0.5 });

    // Selection ring on floor
    this.selectionRing = new THREE.Mesh(
      new THREE.RingGeometry(0.42, 0.52, 32),
      new THREE.MeshBasicMaterial({ color: 0xfacc15, side: THREE.DoubleSide, transparent: true, opacity: 0.9 })
    );
    this.selectionRing.rotation.x = -Math.PI / 2;
    this.selectionRing.position.y = 0.02;
    this.selectionRing.visible = false;
    this.group.add(this.selectionRing);

    // Pelvis
    this.pelvis = new THREE.Group();
    this.pelvis.position.y = this.sitHipY;
    this.group.add(this.pelvis);

    const hipMesh = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.12, 0.20), pantsMat);
    hipMesh.castShadow = true;
    this.pelvis.add(hipMesh);

    // Torso (Minecraft block with crisp pixel-art dark formal suit + tie + yellow badge)
    this.torso = new THREE.Group();
    this.torso.position.y = 0.06;
    this.pelvis.add(this.torso);

    const suitMaterials = createMinecraftSuitMaterials(this.profile);
    const chest = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.44, 0.22), suitMaterials);
    chest.position.y = 0.22;
    chest.castShadow = true;
    chest.receiveShadow = true;
    this.torso.add(chest);

    // Minecraft Cube Head (0.31m cube with crisp 16x16 pixel-art face!)
    this.headGroup = new THREE.Group();
    this.headGroup.position.y = 0.45;
    this.torso.add(this.headGroup);

    this.headCtrl = createMinecraftHeadMaterials(this.profile);
    const head = new THREE.Mesh(new THREE.BoxGeometry(0.31, 0.31, 0.31), this.headCtrl.materials);
    head.position.y = 0.155;
    head.castShadow = true;
    head.receiveShadow = true;
    this.headGroup.add(head);

    // Extra Minecraft 3D pixel hair detail on back for female staff (ponytail / long block)
    if (isFemale) {
      const backHair = new THREE.Mesh(new THREE.BoxGeometry(0.31, 0.18, 0.07), hairMat);
      backHair.position.set(0, 0.04, -0.14);
      backHair.castShadow = true;
      this.headGroup.add(backHair);
    }

    // Minecraft Arms (Left = +X, Right = -X)
    this.leftArm = this.createArm(blazerMat, cuffMat, skinMat);
    this.leftArm.pivot.position.set(0.235, 0.39, 0);
    this.torso.add(this.leftArm.pivot);

    this.rightArm = this.createArm(blazerMat, cuffMat, skinMat);
    this.rightArm.pivot.position.set(-0.235, 0.39, 0);
    this.torso.add(this.rightArm.pivot);

    // Held Coffee / Water Cup (Right Hand)
    this.heldCup = this.createHeldCup();
    this.heldCup.visible = false;
    this.rightArm.handGroup.add(this.heldCup);

    // Sleek Smartphone (Right Hand)
    this.heldPhone = new THREE.Mesh(
      new THREE.BoxGeometry(0.065, 0.115, 0.012),
      new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.3 })
    );
    const phoneScreen = new THREE.Mesh(
      new THREE.PlaneGeometry(0.055, 0.10),
      new THREE.MeshBasicMaterial({ color: 0x38bdf8 })
    );
    phoneScreen.position.z = -0.007;
    phoneScreen.rotation.y = Math.PI;
    this.heldPhone.add(phoneScreen);
    this.heldPhone.position.set(0, -0.01, 0.05);
    this.heldPhone.rotation.x = 0.25;
    this.heldPhone.visible = false;
    this.rightArm.handGroup.add(this.heldPhone);

    // Slim Notebook (Left Hand)
    this.heldNotebook = new THREE.Mesh(
      new THREE.BoxGeometry(0.025, 0.20, 0.15),
      new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.65 })
    );
    this.heldNotebook.position.set(-0.02, -0.03, 0.06);
    this.heldNotebook.visible = false;
    this.leftArm.handGroup.add(this.heldNotebook);

    // Minecraft Legs
    this.leftLeg = this.createLeg(pantsMat, shoeMat);
    this.leftLeg.pivot.position.set(0.095, -0.02, 0);
    this.pelvis.add(this.leftLeg.pivot);

    this.rightLeg = this.createLeg(pantsMat, shoeMat);
    this.rightLeg.pivot.position.set(-0.095, -0.02, 0);
    this.pelvis.add(this.rightLeg.pivot);

    // Floating status icon sprite above head
    this.statusBubble = createStatusBubbleSprite();
    this.statusBubble.sprite.position.set(0, 1.95, 0);
    this.group.add(this.statusBubble.sprite);

    this.group.traverse((obj) => {
      if (obj.isMesh) {
        obj.userData.employee = this;
      }
    });
  }

  createHeldCup() {
    const cupGroup = new THREE.Group();
    cupGroup.position.set(0, -0.02, 0.055);
    cupGroup.rotation.x = Math.PI / 2;

    this.cupBodyMat = new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.35 });
    const cupBody = new THREE.Mesh(new THREE.BoxGeometry(0.068, 0.09, 0.068), this.cupBodyMat);
    cupGroup.add(cupBody);

    this.cupSleeve = new THREE.Mesh(
      new THREE.BoxGeometry(0.072, 0.034, 0.072),
      new THREE.MeshStandardMaterial({ color: 0xb45309, roughness: 0.8 })
    );
    cupGroup.add(this.cupSleeve);

    this.cupLid = new THREE.Mesh(
      new THREE.BoxGeometry(0.074, 0.014, 0.074),
      new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.5 })
    );
    this.cupLid.position.y = 0.048;
    cupGroup.add(this.cupLid);

    return cupGroup;
  }

  setDrinkHeld(hasDrink, type = 'coffee') {
    this.hasDrink = hasDrink;
    this.drinkType = type;
    this.heldCup.visible = hasDrink;
    if (hasDrink) {
      this.heldPhone.visible = false;
      this.drinkTimer = 26 + Math.random() * 14;
      if (type === 'water') {
        this.cupBodyMat.color.setHex(0xbae6fd);
        this.cupSleeve.visible = false;
        this.cupLid.visible = false;
      } else {
        this.cupBodyMat.color.setHex(0xf8fafc);
        this.cupSleeve.visible = true;
        this.cupLid.visible = true;
      }
    }
  }

  createArm(blazerMat, cuffMat, skinMat) {
    const pivot = new THREE.Group();
    const upper = new THREE.Mesh(new THREE.BoxGeometry(0.11, 0.25, 0.11), blazerMat);
    upper.position.y = -0.125;
    upper.castShadow = true;
    pivot.add(upper);

    const forearmPivot = new THREE.Group();
    forearmPivot.position.y = -0.245;
    pivot.add(forearmPivot);

    const lower = new THREE.Mesh(new THREE.BoxGeometry(0.102, 0.19, 0.102), blazerMat);
    lower.position.y = -0.095;
    lower.castShadow = true;
    forearmPivot.add(lower);

    // Crisp white shirt cuff
    const cuff = new THREE.Mesh(new THREE.BoxGeometry(0.104, 0.03, 0.104), cuffMat);
    cuff.position.y = -0.195;
    forearmPivot.add(cuff);

    const handGroup = new THREE.Group();
    handGroup.position.y = -0.245;
    forearmPivot.add(handGroup);

    const hand = new THREE.Mesh(new THREE.BoxGeometry(0.095, 0.08, 0.095), skinMat);
    hand.castShadow = true;
    handGroup.add(hand);

    return { pivot, forearmPivot, handGroup };
  }

  createLeg(pantsMat, shoeMat) {
    const pivot = new THREE.Group();
    const thigh = new THREE.Mesh(new THREE.BoxGeometry(0.135, 0.42, 0.135), pantsMat);
    thigh.position.y = -0.21;
    thigh.castShadow = true;
    pivot.add(thigh);

    const shinPivot = new THREE.Group();
    shinPivot.position.y = -0.42;
    pivot.add(shinPivot);

    const shin = new THREE.Mesh(new THREE.BoxGeometry(0.125, 0.37, 0.125), pantsMat);
    shin.position.y = -0.185;
    shin.castShadow = true;
    shinPivot.add(shin);

    const shoe = new THREE.Mesh(new THREE.BoxGeometry(0.13, 0.07, 0.18), shoeMat);
    shoe.position.set(0, -0.395, 0.025);
    shoe.castShadow = true;
    shinPivot.add(shoe);

    return { pivot, shinPivot };
  }

  setSelected(isSelected) {
    this.selected = isSelected;
    this.selectionRing.visible = isSelected;
  }

  getStatusLabel() {
    switch (this.state) {
      case EMPLOYEE_STATES.WORKING:
        if (this.discussedBy) return `Diskusi dgn ${this.discussedBy.profile.name.split(' ')[0]}`;
        if (this.workSubAction === 'sip') return 'Minum Kopi / Air';
        if (this.workSubAction === 'seated_stretch') return 'Peregangan Ringan';
        if (this.workSubAction === 'thinking') return 'Cek HP / Review';
        return 'Bekerja';
      case EMPLOYEE_STATES.STANDING_UP:
        return 'Berdiri';
      case EMPLOYEE_STATES.WALKING_TO_POI:
        return this.currentPOI ? `Jalan → ${this.currentPOI.label}` : 'Berjalan';
      case EMPLOYEE_STATES.AT_POI:
        return this.currentPOI ? this.currentPOI.label : 'Istirahat';
      case EMPLOYEE_STATES.WALKING_BACK:
        return this.hasDrink ? 'Bawa Minuman ke Meja' : 'Kembali ke Meja';
      case EMPLOYEE_STATES.SITTING_DOWN:
        return 'Duduk';
      default:
        return 'Bekerja';
    }
  }

  getStatusCategory() {
    if (this.state === EMPLOYEE_STATES.WORKING || this.state === EMPLOYEE_STATES.SITTING_DOWN) {
      return 'working';
    }
    if (this.state === EMPLOYEE_STATES.AT_POI) {
      return 'break';
    }
    return 'walking';
  }

  clearDiscussionLink() {
    if (this.discussionTarget && this.discussionTarget.discussedBy === this) {
      this.discussionTarget.discussedBy = null;
    }
    this.discussionTarget = null;
  }

  commandStandAndWalk(specificPOI = null, colleagueToDiscuss = null) {
    if (
      this.state === EMPLOYEE_STATES.WALKING_TO_POI ||
      this.state === EMPLOYEE_STATES.STANDING_UP
    ) {
      return;
    }

    this.clearDiscussionLink();

    let poi = specificPOI;
    if (!poi && colleagueToDiscuss) {
      if (this.workstation.room === 'studio') {
        const spot = colleagueToDiscuss.aislePos.clone();
        spot.z += colleagueToDiscuss.workstation.deskPos.z < 11.0 ? -0.45 : 0.45;
        poi = {
          id: 'discuss',
          room: 'studio',
          label: `Diskusi dgn ${colleagueToDiscuss.profile.name.split(' ')[0]}`,
          spot,
          lookAt: colleagueToDiscuss.workstation.deskPos.clone(),
          activity: 'discuss',
        };
      } else {
        const sideOffset = colleagueToDiscuss.workstation.deskPos.x > 0 ? -0.68 : 0.68;
        const standZ = colleagueToDiscuss.sitWorldPos.z + colleagueToDiscuss.chairSide * 0.62;
        poi = {
          id: 'discuss',
          label: `Diskusi dgn ${colleagueToDiscuss.profile.name.split(' ')[0]}`,
          aisleZ: colleagueToDiscuss.workstation.aisleZ,
          spot: new THREE.Vector3(colleagueToDiscuss.workstation.deskPos.x + sideOffset, 0, standZ),
          lookAt: colleagueToDiscuss.workstation.deskPos.clone(),
          activity: 'discuss',
        };
      }
      this.discussionTarget = colleagueToDiscuss;
    }

    if (!poi) {
      const pois = this.workstation.room === 'studio' ? this.officeAPI.studioPois : this.officeAPI.pois;
      poi = pois[Math.floor(Math.random() * pois.length)];
    }

    this.currentPOI = poi;
    this.breakDuration = poi.activity === 'discuss'
      ? 5.0 + Math.random() * 4.0
      : 4.0 + Math.random() * 4.5;

    if (this.hasDrink) this.setDrinkHeld(false);

    if (this.state === EMPLOYEE_STATES.WORKING || this.state === EMPLOYEE_STATES.SITTING_DOWN) {
      this.state = EMPLOYEE_STATES.STANDING_UP;
      this.stateTimer = 0;
    } else {
      this.waypoints = this.officeAPI.buildPathToPOI(this.workstation, poi);
      this.waypointIndex = 1;
      this.state = EMPLOYEE_STATES.WALKING_TO_POI;
      this.stateTimer = 0;
    }
  }

  commandReturnToWork() {
    this.clearDiscussionLink();
    if (this.state === EMPLOYEE_STATES.WORKING || this.state === EMPLOYEE_STATES.SITTING_DOWN) {
      return;
    }
    if (this.state === EMPLOYEE_STATES.STANDING_UP) {
      this.state = EMPLOYEE_STATES.SITTING_DOWN;
      this.stateTimer = 0;
      return;
    }
    this.waypoints = this.officeAPI.buildPathToDesk(this.group.position, this.workstation, this.currentPOI);
    this.waypointIndex = 0;
    this.state = EMPLOYEE_STATES.WALKING_BACK;
    this.stateTimer = 0;
  }

  updateExpressions(dt, elapsedTime) {
    this.blinkTimer -= dt;
    let isBlink = false;
    if (this.blinkTimer <= 0) {
      if (this.blinkTimer > -0.12) {
        isBlink = true;
      } else {
        this.blinkTimer = 2.5 + Math.random() * 3.8;
      }
    }

    const isTalking =
      (this.state === EMPLOYEE_STATES.AT_POI && this.currentPOI && this.currentPOI.activity === 'discuss') ||
      (this.state === EMPLOYEE_STATES.WORKING && !!this.discussedBy);
    const talkFrame = isTalking && Math.sin(elapsedTime * 10 + this.index) > 0.1;

    this.headCtrl.drawFace(isBlink, talkFrame);
  }

  updateStatusBubble(dt, elapsedTime) {
    let icon = '';
    if (this.state === EMPLOYEE_STATES.AT_POI && this.currentPOI) {
      if (this.currentPOI.id === 'coffee' || this.currentPOI.id === 'kettle') icon = '☕';
      else if (this.currentPOI.id === 'dispenser') icon = '💧';
      else if (this.currentPOI.activity === 'discuss') icon = '💬';
      else if (this.currentPOI.id === 'bags') icon = '🎒';
      else icon = '🧘';
    } else if (this.state === EMPLOYEE_STATES.WALKING_BACK && this.hasDrink) {
      icon = this.drinkType === 'water' ? '💧' : '☕';
    } else if (this.state === EMPLOYEE_STATES.WORKING && this.discussedBy) {
      icon = '💬';
    } else if (this.state === EMPLOYEE_STATES.WORKING && this.workSubAction === 'sip') {
      icon = this.drinkType === 'water' ? '💧' : '☕';
    }

    if (icon) {
      this.statusBubble.setIcon(icon);
      this.statusBubble.sprite.material.opacity = lerp(this.statusBubble.sprite.material.opacity, 0.98, dt * 8);
      // Hay Day bouncy pop-in bubble scale!
      const pop = 0.48 + Math.sin(elapsedTime * 5.0 + this.index) * 0.035;
      this.statusBubble.sprite.scale.set(
        lerp(this.statusBubble.sprite.scale.x, pop, dt * 10),
        lerp(this.statusBubble.sprite.scale.y, pop, dt * 10),
        1
      );
    } else {
      this.statusBubble.sprite.material.opacity = lerp(this.statusBubble.sprite.material.opacity, 0, dt * 8);
      this.statusBubble.sprite.scale.set(
        lerp(this.statusBubble.sprite.scale.x, 0.2, dt * 10),
        lerp(this.statusBubble.sprite.scale.y, 0.2, dt * 10),
        1
      );
    }

    const baseY = this.pelvis.position.y + 1.08;
    this.statusBubble.sprite.position.y = baseY + Math.sin(elapsedTime * 3.6 + this.index) * 0.05;
  }

  pickNextWorkSubAction() {
    const r = Math.random();
    if (this.hasDrink && r < 0.26) {
      this.workSubAction = 'sip';
      this.workSubTimer = 2.6 + Math.random() * 1.4;
    } else if (r < 0.56) {
      this.workSubAction = 'typing';
      this.workSubTimer = 4.5 + Math.random() * 5.0;
    } else if (r < 0.78) {
      this.workSubAction = 'mouse';
      this.workSubTimer = 3.5 + Math.random() * 3.5;
    } else if (r < 0.92) {
      this.workSubAction = 'thinking';
      this.workSubTimer = 3.0 + Math.random() * 2.5;
    } else {
      this.workSubAction = 'seated_stretch';
      this.workSubTimer = 2.4 + Math.random() * 1.2;
    }
  }

  update(dt, elapsedTime, autoSchedule, canStartBreak = () => true, pickColleague = () => null) {
    this.stateTimer += dt;
    this.updateExpressions(dt, elapsedTime);
    this.updateStatusBubble(dt, elapsedTime);

    const showNotebook =
      this.profile.prop === 'notebook' &&
      this.state === EMPLOYEE_STATES.AT_POI &&
      this.currentPOI &&
      this.currentPOI.activity === 'discuss';
    const showPhone =
      !this.hasDrink &&
      ((this.state === EMPLOYEE_STATES.WORKING && this.workSubAction === 'thinking') ||
        (this.state === EMPLOYEE_STATES.AT_POI && this.currentPOI && this.currentPOI.activity === 'discuss' && this.profile.prop === 'phone'));
    this.heldPhone.visible = showPhone;
    this.heldNotebook.visible = showNotebook;

    const chair = this.workstation.chair;
    const swivel = chair.userData.swivel;

    if (this.state === EMPLOYEE_STATES.WORKING) {
      this.group.position.x = lerp(this.group.position.x, this.sitWorldPos.x, dt * 6);
      this.group.position.z = lerp(this.group.position.z, this.sitWorldPos.z, dt * 6);
      this.group.rotation.y = lerpAngle(this.group.rotation.y, this.facingAngle, dt * 6);
      chair.position.x = lerp(chair.position.x, this.chairSitPos.x, dt * 5);
      chair.position.z = lerp(chair.position.z, this.chairSitPos.z, dt * 5);

      this.pelvis.position.y = lerp(this.pelvis.position.y, this.sitHipY, dt * 7);
      const idleBreath = 1.0 + Math.sin(elapsedTime * 3.0 + this.index) * 0.025;
      this.pelvis.scale.set(1.0, idleBreath, 1.0);
      this.pelvis.rotation.z = 0;
      this.torso.rotation.y = 0;
      this.torso.rotation.z = 0;

      this.leftLeg.pivot.rotation.x = lerp(this.leftLeg.pivot.rotation.x, -Math.PI / 2, dt * 7);
      this.rightLeg.pivot.rotation.x = lerp(this.rightLeg.pivot.rotation.x, -Math.PI / 2, dt * 7);
      this.leftLeg.shinPivot.rotation.x = lerp(this.leftLeg.shinPivot.rotation.x, Math.PI / 2, dt * 7);
      this.rightLeg.shinPivot.rotation.x = lerp(this.rightLeg.shinPivot.rotation.x, Math.PI / 2, dt * 7);

      if (this.hasDrink) {
        this.drinkTimer -= dt;
        if (this.drinkTimer <= 0 && this.workSubAction !== 'sip') {
          this.setDrinkHeld(false);
        }
      }

      this.workSubTimer -= dt;
      if (this.workSubTimer <= 0) {
        this.pickNextWorkSubAction();
      }

      if (this.discussedBy) {
        const dx = this.discussedBy.group.position.x - this.group.position.x;
        const turnSign = (dx >= 0 ? 1 : -1) * (this.chairSide);
        this.torso.rotation.x = lerp(this.torso.rotation.x, 0.02, dt * 6);
        this.headGroup.rotation.y = lerp(this.headGroup.rotation.y, turnSign * 0.55, dt * 5);
        this.headGroup.rotation.x = Math.sin(elapsedTime * 3.8 + this.index) * 0.08;
        swivel.rotation.y = lerp(swivel.rotation.y, turnSign * 0.28, dt * 4);

        this.leftArm.pivot.rotation.x = lerp(this.leftArm.pivot.rotation.x, -0.45, dt * 6);
        this.rightArm.pivot.rotation.x = lerp(this.rightArm.pivot.rotation.x, -0.45, dt * 6);
        this.leftArm.forearmPivot.rotation.x = lerp(this.leftArm.forearmPivot.rotation.x, -0.75, dt * 6);
        this.rightArm.forearmPivot.rotation.x = lerp(this.rightArm.forearmPivot.rotation.x, -0.75, dt * 6);
      } else if (this.workSubAction === 'sip' && this.hasDrink) {
        this.torso.rotation.x = lerp(this.torso.rotation.x, -0.04, dt * 5);
        this.rightArm.pivot.rotation.x = lerp(this.rightArm.pivot.rotation.x, -0.95, dt * 5);
        this.rightArm.pivot.rotation.z = lerp(this.rightArm.pivot.rotation.z, 0.25, dt * 5);
        this.rightArm.forearmPivot.rotation.x = lerp(this.rightArm.forearmPivot.rotation.x, -1.35, dt * 5);
        this.leftArm.pivot.rotation.x = lerp(this.leftArm.pivot.rotation.x, -0.5, dt * 6);
        this.leftArm.forearmPivot.rotation.x = lerp(this.leftArm.forearmPivot.rotation.x, -0.8, dt * 6);
        this.headGroup.rotation.x = lerp(this.headGroup.rotation.x, -0.12, dt * 5);
        this.headGroup.rotation.y = lerp(this.headGroup.rotation.y, 0, dt * 5);
      } else if (this.workSubAction === 'seated_stretch') {
        const s = -2.2 + Math.sin(elapsedTime * 2.5 + this.index) * 0.15;
        this.torso.rotation.x = lerp(this.torso.rotation.x, -0.10, dt * 4);
        this.leftArm.pivot.rotation.x = lerp(this.leftArm.pivot.rotation.x, s, dt * 4);
        this.rightArm.pivot.rotation.x = lerp(this.rightArm.pivot.rotation.x, s, dt * 4);
        this.leftArm.pivot.rotation.z = lerp(this.leftArm.pivot.rotation.z, 0.22, dt * 4);
        this.rightArm.pivot.rotation.z = lerp(this.rightArm.pivot.rotation.z, -0.22, dt * 4);
        this.leftArm.forearmPivot.rotation.x = lerp(this.leftArm.forearmPivot.rotation.x, -0.35, dt * 4);
        this.rightArm.forearmPivot.rotation.x = lerp(this.rightArm.forearmPivot.rotation.x, -0.35, dt * 4);
        this.headGroup.rotation.x = lerp(this.headGroup.rotation.x, -0.10, dt * 4);
      } else if (this.workSubAction === 'thinking') {
        this.torso.rotation.x = lerp(this.torso.rotation.x, -0.06, dt * 4);
        this.leftArm.pivot.rotation.x = lerp(this.leftArm.pivot.rotation.x, -0.35, dt * 5);
        this.leftArm.forearmPivot.rotation.x = lerp(this.leftArm.forearmPivot.rotation.x, -0.85, dt * 5);
        this.rightArm.pivot.rotation.x = lerp(this.rightArm.pivot.rotation.x, -0.78, dt * 5);
        this.rightArm.pivot.rotation.z = lerp(this.rightArm.pivot.rotation.z, 0.18, dt * 5);
        this.rightArm.forearmPivot.rotation.x = lerp(this.rightArm.forearmPivot.rotation.x, -1.25, dt * 5);
        this.headGroup.rotation.y = lerp(this.headGroup.rotation.y, -0.15, dt * 5);
        this.headGroup.rotation.x = lerp(this.headGroup.rotation.x, 0.14, dt * 5);
        swivel.rotation.y = Math.sin(elapsedTime * 0.8 + this.index) * 0.10;
      } else if (this.workSubAction === 'mouse') {
        const mouseSweep = Math.sin(elapsedTime * 3.4 + this.index) * 0.14;
        this.torso.rotation.x = lerp(this.torso.rotation.x, 0.06, dt * 6);
        this.leftArm.pivot.rotation.x = lerp(this.leftArm.pivot.rotation.x, -0.58, dt * 8);
        this.leftArm.pivot.rotation.z = lerp(this.leftArm.pivot.rotation.z, -0.12, dt * 8);
        this.leftArm.forearmPivot.rotation.x = lerp(this.leftArm.forearmPivot.rotation.x, -0.86, dt * 8);

        this.rightArm.pivot.rotation.x = lerp(this.rightArm.pivot.rotation.x, -0.66 + mouseSweep * 0.3, dt * 10);
        this.rightArm.pivot.rotation.z = lerp(this.rightArm.pivot.rotation.z, -0.10 + mouseSweep, dt * 10);
        this.rightArm.forearmPivot.rotation.x = lerp(this.rightArm.forearmPivot.rotation.x, -0.82, dt * 10);

        this.headGroup.rotation.y = Math.sin(elapsedTime * 1.4 + this.index) * 0.14;
        this.headGroup.rotation.x = 0.04;
      } else {
        this.torso.rotation.x = lerp(this.torso.rotation.x, 0.08, dt * 6);
        this.typePhase += dt * 11.5;
        const typeL = Math.sin(this.typePhase) * 0.08;
        const typeR = Math.sin(this.typePhase + Math.PI * 0.85) * 0.08;

        this.leftArm.pivot.rotation.x = lerp(this.leftArm.pivot.rotation.x, -0.62 + typeL * 0.5, dt * 10);
        this.rightArm.pivot.rotation.x = lerp(this.rightArm.pivot.rotation.x, -0.62 + typeR * 0.5, dt * 10);
        this.leftArm.pivot.rotation.z = lerp(this.leftArm.pivot.rotation.z, -0.12, dt * 8);
        this.rightArm.pivot.rotation.z = lerp(this.rightArm.pivot.rotation.z, 0.12, dt * 8);
        this.leftArm.forearmPivot.rotation.x = lerp(this.leftArm.forearmPivot.rotation.x, -0.88 + typeL, dt * 12);
        this.rightArm.forearmPivot.rotation.x = lerp(this.rightArm.forearmPivot.rotation.x, -0.88 + typeR, dt * 12);

        this.headGroup.rotation.y = Math.sin(elapsedTime * 1.1 + this.index * 1.7) * 0.12;
        this.headGroup.rotation.x = 0.05 + Math.sin(elapsedTime * 2.2 + this.index) * 0.03;
        swivel.rotation.y = Math.sin(elapsedTime * 0.6 + this.index) * 0.06;
      }

      if (autoSchedule && !this.discussedBy && this.stateTimer >= this.workDuration) {
        if (canStartBreak()) {
          this.workDuration = 12 + Math.random() * 18;
          const colleague = Math.random() < 0.35 ? pickColleague(this) : null;
          this.commandStandAndWalk(null, colleague);
        } else {
          this.stateTimer = this.workDuration - 2.5;
        }
      }
    } else if (this.state === EMPLOYEE_STATES.STANDING_UP) {
      const duration = 0.95;
      const t = Math.min(1, this.stateTimer / duration);

      chair.position.x = lerp(chair.position.x, this.chairOutPos.x, dt * 4.5);
      chair.position.z = lerp(chair.position.z, this.chairOutPos.z, dt * 4.5);
      swivel.rotation.y = lerp(swivel.rotation.y, 0, dt * 6);

      const standStepX = this.sitWorldPos.x + this.chairDir.x * 0.55;
      const standStepZ = this.sitWorldPos.z + this.chairDir.z * 0.55;
      this.group.position.x = lerp(this.group.position.x, standStepX, dt * 3.5);
      this.group.position.z = lerp(this.group.position.z, standStepZ, dt * 3.5);
      this.pelvis.position.y = lerp(this.pelvis.position.y, this.standHipY, dt * 5.5);
      this.torso.rotation.x = lerp(this.torso.rotation.x, 0, dt * 6);

      this.leftLeg.pivot.rotation.x = lerp(this.leftLeg.pivot.rotation.x, 0, dt * 6);
      this.rightLeg.pivot.rotation.x = lerp(this.rightLeg.pivot.rotation.x, 0, dt * 6);
      this.leftLeg.shinPivot.rotation.x = lerp(this.leftLeg.shinPivot.rotation.x, 0, dt * 6);
      this.rightLeg.shinPivot.rotation.x = lerp(this.rightLeg.shinPivot.rotation.x, 0, dt * 6);

      this.leftArm.pivot.rotation.x = lerp(this.leftArm.pivot.rotation.x, 0, dt * 6);
      this.rightArm.pivot.rotation.x = lerp(this.rightArm.pivot.rotation.x, 0, dt * 6);
      this.leftArm.pivot.rotation.z = lerp(this.leftArm.pivot.rotation.z, 0.05, dt * 6);
      this.rightArm.pivot.rotation.z = lerp(this.rightArm.pivot.rotation.z, -0.05, dt * 6);
      this.leftArm.forearmPivot.rotation.x = lerp(this.leftArm.forearmPivot.rotation.x, -0.1, dt * 6);
      this.rightArm.forearmPivot.rotation.x = lerp(this.rightArm.forearmPivot.rotation.x, -0.1, dt * 6);

      if (t > 0.35) {
        this.group.rotation.y = lerpAngle(this.group.rotation.y, this.aisleFacingAngle, dt * 5);
      }

      if (t >= 1) {
        this.waypoints = this.officeAPI.buildPathToPOI(this.workstation, this.currentPOI);
        if (this.workstation.room !== 'studio') {
          this.waypoints[0].z = this.workstation.aislePos.z;
        }
        this.waypointIndex = 0;
        this.state = EMPLOYEE_STATES.WALKING_TO_POI;
        this.stateTimer = 0;
      }
    } else if (
      this.state === EMPLOYEE_STATES.WALKING_TO_POI ||
      this.state === EMPLOYEE_STATES.WALKING_BACK
    ) {
      const target = this.waypoints[this.waypointIndex];
      if (!target) {
        if (this.state === EMPLOYEE_STATES.WALKING_TO_POI) {
          this.state = EMPLOYEE_STATES.AT_POI;
          this.stateTimer = 0;
          if (this.discussionTarget && this.discussionTarget.state === EMPLOYEE_STATES.WORKING) {
            this.discussionTarget.discussedBy = this;
          }
        } else {
          this.state = EMPLOYEE_STATES.SITTING_DOWN;
          this.stateTimer = 0;
        }
        return;
      }

      const dx = target.x - this.group.position.x;
      const dz = target.z - this.group.position.z;
      const dist = Math.hypot(dx, dz);

      if (dist < 0.14) {
        this.waypointIndex++;
      } else {
        const step = Math.min(dist, this.walkSpeed * dt);
        this.group.position.x += (dx / dist) * step;
        this.group.position.z += (dz / dist) * step;

        const desiredYaw = Math.atan2(dx, dz);
        this.group.rotation.y = lerpAngle(this.group.rotation.y, desiredYaw, dt * 9);
      }

      // Hay Day bouncy 2.5D walk cycle with playful squash-and-stretch hop!
      this.walkPhase += dt * this.walkSpeed * 5.2;
      const swing = Math.sin(this.walkPhase);
      const bounce = Math.abs(Math.cos(this.walkPhase));
      const bob = bounce * 0.065;

      this.pelvis.position.y = lerp(this.pelvis.position.y, this.standHipY + bob, dt * 16);
      this.pelvis.scale.set(1.0 + (1 - bounce) * 0.05, 1.0 + (bounce - 0.5) * 0.08, 1.0 + (1 - bounce) * 0.05);
      this.pelvis.rotation.z = lerp(this.pelvis.rotation.z, swing * 0.06, dt * 12);
      this.torso.rotation.x = lerp(this.torso.rotation.x, 0.06, dt * 8);
      this.torso.rotation.y = lerp(this.torso.rotation.y, -swing * 0.08, dt * 10);

      this.leftLeg.pivot.rotation.x = swing * 0.55;
      this.rightLeg.pivot.rotation.x = -swing * 0.55;
      this.leftLeg.shinPivot.rotation.x = Math.max(0, -swing) * 0.50;
      this.rightLeg.shinPivot.rotation.x = Math.max(0, swing) * 0.50;

      this.leftArm.pivot.rotation.x = -swing * 0.45;
      this.leftArm.pivot.rotation.z = lerp(this.leftArm.pivot.rotation.z, 0.05, dt * 8);
      this.leftArm.forearmPivot.rotation.x = -0.18 - Math.max(0, swing) * 0.22;

      if (this.hasDrink) {
        this.rightArm.pivot.rotation.x = lerp(this.rightArm.pivot.rotation.x, -0.32 + swing * 0.05, dt * 10);
        this.rightArm.pivot.rotation.z = lerp(this.rightArm.pivot.rotation.z, 0.06, dt * 8);
        this.rightArm.forearmPivot.rotation.x = lerp(this.rightArm.forearmPivot.rotation.x, -1.18, dt * 10);
      } else {
        this.rightArm.pivot.rotation.x = swing * 0.45;
        this.rightArm.pivot.rotation.z = lerp(this.rightArm.pivot.rotation.z, -0.05, dt * 8);
        this.rightArm.forearmPivot.rotation.x = -0.18 - Math.max(0, -swing) * 0.22;
      }

      this.headGroup.rotation.y = lerp(this.headGroup.rotation.y, 0, dt * 6);
      this.headGroup.rotation.x = lerp(this.headGroup.rotation.x, 0, dt * 6);
    } else if (this.state === EMPLOYEE_STATES.AT_POI) {
      if (this.currentPOI) {
        const dx = this.currentPOI.lookAt.x - this.group.position.x;
        const dz = this.currentPOI.lookAt.z - this.group.position.z;
        this.group.rotation.y = lerpAngle(this.group.rotation.y, Math.atan2(dx, dz), dt * 6);
      }

      this.pelvis.position.y = lerp(this.pelvis.position.y, this.standHipY + Math.sin(elapsedTime * 2 + this.index) * 0.008, dt * 8);
      this.pelvis.rotation.z = 0;
      this.torso.rotation.y = 0;
      this.torso.rotation.z = 0;
      this.torso.rotation.x = lerp(this.torso.rotation.x, 0, dt * 6);
      this.leftLeg.pivot.rotation.x = lerp(this.leftLeg.pivot.rotation.x, 0, dt * 8);
      this.rightLeg.pivot.rotation.x = lerp(this.rightLeg.pivot.rotation.x, 0, dt * 8);
      this.leftLeg.shinPivot.rotation.x = lerp(this.leftLeg.shinPivot.rotation.x, 0, dt * 8);
      this.rightLeg.shinPivot.rotation.x = lerp(this.rightLeg.shinPivot.rotation.x, 0, dt * 8);

      const act = this.currentPOI ? this.currentPOI.activity : 'coffee';

      if (!this.hasDrink && this.stateTimer > 1.6 && this.currentPOI) {
        if (this.currentPOI.id === 'coffee' || this.currentPOI.id === 'kettle') {
          this.setDrinkHeld(true, 'coffee');
        } else if (this.currentPOI.id === 'dispenser') {
          this.setDrinkHeld(true, 'water');
        }
      }

      if (act === 'stretch') {
        const lift = -2.2 + Math.sin(elapsedTime * 2.0 + this.index) * 0.25;
        this.leftArm.pivot.rotation.x = lerp(this.leftArm.pivot.rotation.x, lift, dt * 4);
        this.rightArm.pivot.rotation.x = lerp(this.rightArm.pivot.rotation.x, lift, dt * 4);
        this.leftArm.forearmPivot.rotation.x = lerp(this.leftArm.forearmPivot.rotation.x, -0.3, dt * 5);
        this.rightArm.forearmPivot.rotation.x = lerp(this.rightArm.forearmPivot.rotation.x, -0.3, dt * 5);
      } else if (act === 'discuss') {
        const talkR = -0.82 + Math.sin(elapsedTime * 4.0 + this.index) * 0.22;
        const talkL = showNotebook ? -0.45 : -0.42 + Math.cos(elapsedTime * 3.0 + this.index) * 0.16;
        this.torso.rotation.x = lerp(this.torso.rotation.x, 0.08, dt * 5);
        this.rightArm.pivot.rotation.x = lerp(this.rightArm.pivot.rotation.x, talkR, dt * 8);
        this.rightArm.forearmPivot.rotation.x = lerp(this.rightArm.forearmPivot.rotation.x, showPhone ? -1.1 : -0.5, dt * 8);
        this.leftArm.pivot.rotation.x = lerp(this.leftArm.pivot.rotation.x, talkL, dt * 8);
        this.leftArm.forearmPivot.rotation.x = lerp(this.leftArm.forearmPivot.rotation.x, showNotebook ? -1.2 : -0.65, dt * 8);
        this.headGroup.rotation.y = Math.sin(elapsedTime * 2.4 + this.index) * 0.22;
        this.headGroup.rotation.x = Math.sin(elapsedTime * 4.0 + this.index) * 0.06;
      } else {
        const gesture = -0.65 + Math.sin(elapsedTime * 2.5 + this.index) * 0.18;
        this.rightArm.pivot.rotation.x = lerp(this.rightArm.pivot.rotation.x, gesture, dt * 6);
        this.rightArm.forearmPivot.rotation.x = lerp(this.rightArm.forearmPivot.rotation.x, -0.95, dt * 6);
        this.leftArm.pivot.rotation.x = lerp(this.leftArm.pivot.rotation.x, -0.15, dt * 6);
        this.leftArm.forearmPivot.rotation.x = lerp(this.leftArm.forearmPivot.rotation.x, -0.25, dt * 6);
        this.headGroup.rotation.y = Math.sin(elapsedTime * 1.4 + this.index) * 0.20;
      }

      if (autoSchedule && this.stateTimer >= this.breakDuration) {
        this.commandReturnToWork();
      }
    } else if (this.state === EMPLOYEE_STATES.SITTING_DOWN) {
      const duration = 0.95;
      const t = Math.min(1, this.stateTimer / duration);

      this.group.position.x = lerp(this.group.position.x, this.sitWorldPos.x, dt * 5.5);
      this.group.position.z = lerp(this.group.position.z, this.sitWorldPos.z, dt * 5.5);
      this.group.rotation.y = lerpAngle(this.group.rotation.y, this.facingAngle, dt * 7);
      chair.position.x = lerp(chair.position.x, this.chairSitPos.x, dt * 4.5);
      chair.position.z = lerp(chair.position.z, this.chairSitPos.z, dt * 4.5);

      this.pelvis.position.y = lerp(this.pelvis.position.y, this.sitHipY, dt * 5.5);
      this.leftLeg.pivot.rotation.x = lerp(this.leftLeg.pivot.rotation.x, -Math.PI / 2, dt * 6);
      this.rightLeg.pivot.rotation.x = lerp(this.rightLeg.pivot.rotation.x, -Math.PI / 2, dt * 6);
      this.leftLeg.shinPivot.rotation.x = lerp(this.leftLeg.shinPivot.rotation.x, Math.PI / 2, dt * 6);
      this.rightLeg.shinPivot.rotation.x = lerp(this.rightLeg.shinPivot.rotation.x, Math.PI / 2, dt * 6);

      this.leftArm.pivot.rotation.x = lerp(this.leftArm.pivot.rotation.x, -0.62, dt * 6);
      this.rightArm.pivot.rotation.x = lerp(this.rightArm.pivot.rotation.x, -0.62, dt * 6);
      this.leftArm.forearmPivot.rotation.x = lerp(this.leftArm.forearmPivot.rotation.x, -0.88, dt * 6);
      this.rightArm.forearmPivot.rotation.x = lerp(this.rightArm.forearmPivot.rotation.x, -0.88, dt * 6);

      if (t >= 1) {
        this.currentPOI = null;
        this.state = EMPLOYEE_STATES.WORKING;
        this.stateTimer = 0;
        this.workDuration = 12 + Math.random() * 18;
        this.workSubAction = this.hasDrink ? 'sip' : 'typing';
        this.workSubTimer = this.hasDrink ? 2.5 : 4.5;
      }
    }
  }
}
