import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls";

let scene, renderer, camera, camcontrols;
let objetos = [];
let buildingBoxes = []; // Para colisiones
let nodes = [],
  ways = [];

// Coordenadas del mapa
let minlon = -15.46945,
  maxlon = -15.39203;
let minlat = 28.07653,
  maxlat = 28.18235;
let mapa,
  mapsx,
  mapsy,
  scale = 150;

const worldScale = 5;

let stats = { buildings: 0, streets: 0, points: 0 };

let uiContainer, statsDiv, layerControls;
let visibleLayers = { buildings: true, streets: true, points: true };

let isFirstPerson = false;
let fpCamera;
let moveSpeed = 0.08;
let lookSpeed = 0.002;
let velocity = new THREE.Vector3();
let moveState = { forward: false, backward: false, left: false, right: false };
let euler = new THREE.Euler(0, 0, 0, "YXZ");
let pointerLocked = false;

// Ciclo día-noche
let dayNightCycle = 0; // 0 a 1, donde 0 es amanecer, 0.5 es atardecer, 1 es próximo amanecer
let cycleStartTime = Date.now();
const cycleDuration = 3 * 60 * 1000; // 3 minutos en milisegundos
let sun, moon, starfield;

init();
animate();

// --------------------------- INIT ---------------------------

function init() {
  createUI();

  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x87ceeb); // Cielo azul
  scene.fog = new THREE.Fog(0x87ceeb, 100, 500);

  // Cámaras
  camera = new THREE.PerspectiveCamera(
    45,
    window.innerWidth / window.innerHeight,
    0.1,
    5000
  );
  camera.position.set(0, 5 * worldScale, 15 * worldScale);

  fpCamera = new THREE.PerspectiveCamera(
    75,
    window.innerWidth / window.innerHeight,
    0.1,
    1000
  );
  fpCamera.position.set(-50 * worldScale, 1.7 * worldScale, -50 * worldScale);

  // Renderer
  renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  document.body.appendChild(renderer.domElement);

  // Controles orbitales
  camcontrols = new OrbitControls(camera, renderer.domElement);
  camcontrols.enableDamping = true;
  camcontrols.dampingFactor = 0.05;

  // Luces
  const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
  scene.add(ambientLight);

  const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
  directionalLight.position.set(100, 200, 100);
  directionalLight.castShadow = true;
  directionalLight.shadow.camera.left = -200;
  directionalLight.shadow.camera.right = 200;
  directionalLight.shadow.camera.top = 200;
  directionalLight.shadow.camera.bottom = -200;
  directionalLight.shadow.mapSize.width = 2048;
  directionalLight.shadow.mapSize.height = 2048;
  scene.add(directionalLight);

  // Crear Sol y Luna
  createCelestialBodies();

  const loader = new THREE.TextureLoader();
  loader.load(
    "src/mapaLPGC.png",
    function (texture) {
      const txaspectRatio = texture.image.width / texture.image.height;
      mapsy = scale * worldScale;
      mapsx = mapsy * txaspectRatio;

      const geometry = new THREE.PlaneGeometry(mapsx, mapsy);
      const material = new THREE.MeshBasicMaterial({
        map: texture,
        transparent: true,
        opacity: 0.8,
      });
      mapa = new THREE.Mesh(geometry, material);
      mapa.rotation.x = -Math.PI / 2;
      mapa.position.y = 0;
      mapa.receiveShadow = true;
      scene.add(mapa);

      loadOSMData();
    },
    undefined,
    function () {
      mapsy = scale * worldScale;
      mapsx = mapsy * 1.5;
      createPlaneWithoutTexture();
      loadOSMData();
    }
  );

  window.addEventListener("resize", onWindowResize);
  window.addEventListener("keydown", onKeyDown);
  window.addEventListener("keyup", onKeyUp);
  renderer.domElement.addEventListener("click", onCanvasClick);
  document.addEventListener("mousemove", onMouseMove);
  document.addEventListener("pointerlockchange", onPointerLockChange);

  moveSpeed *= worldScale * 0.5;
}

// --------------------------- Ciclo día-noche ---------------------------

function createCelestialBodies() {
  // Sol
  const sunGeometry = new THREE.SphereGeometry(15 * worldScale, 32, 32);
  const sunMaterial = new THREE.MeshBasicMaterial({
    color: 0xffdd00,
    emissive: 0xffaa00,
  });
  sun = new THREE.Mesh(sunGeometry, sunMaterial);
  scene.add(sun);

  // Luna
  const moonGeometry = new THREE.SphereGeometry(12 * worldScale, 32, 32);
  const moonMaterial = new THREE.MeshBasicMaterial({
    color: 0xe0e0e0,
    emissive: 0x888888,
  });
  moon = new THREE.Mesh(moonGeometry, moonMaterial);
  scene.add(moon);

  // Crear campo de estrellas
  createStarfield();
}

function createStarfield() {
  const starsGeometry = new THREE.BufferGeometry();
  const starsMaterial = new THREE.PointsMaterial({
    color: 0xffffff,
    size: 5,
    sizeAttenuation: true,
  });

  const starsVertices = [];
  for (let i = 0; i < 1000; i++) {
    const x = (Math.random() - 0.5) * 2000;
    const y = Math.random() * 1000 + 200;
    const z = (Math.random() - 0.5) * 2000;
    starsVertices.push(x, y, z);
  }

  starsGeometry.setAttribute(
    "position",
    new THREE.BufferAttribute(new Float32Array(starsVertices), 3)
  );
  starfield = new THREE.Points(starsGeometry, starsMaterial);
  starfield.visible = false;
  scene.add(starfield);
}

function updateStarsVisibility() {
  if (starfield) {
    // Mostrar estrellas entre las 18:00 (0.75) y las 6:00 (0.25)
    const isNight = dayNightCycle < 0.25 || dayNightCycle > 0.75;

    if (isNight) {
      // Calcular opacidad de estrellas
      let opacity = 0;
      if (dayNightCycle < 0.25) {
        // Atardecer a noche (18 a 6): mayor opacidad cerca de la media noche
        opacity =
          Math.sin((dayNightCycle / 0.25) * Math.PI + Math.PI) * 0.5 + 0.5;
      } else if (dayNightCycle > 0.75) {
        // Noche (18 a 24): opacidad variable
        opacity =
          Math.sin(((dayNightCycle - 0.75) / 0.25) * Math.PI) * 0.5 + 0.5;
      }
      starfield.material.opacity = opacity;
      starfield.material.transparent = true;
      starfield.visible = true;
    } else {
      starfield.visible = false;
    }
  }
}

function updateDayNightCycle() {
  const elapsed = Date.now() - cycleStartTime;
  dayNightCycle = (elapsed % cycleDuration) / cycleDuration;

  // Posición del sol (0 = amanecer a la izquierda, 0.5 = atardecer a la derecha)
  const sunAngle = dayNightCycle * Math.PI;
  const sunDistance = 300;
  sun.position.x = Math.cos(sunAngle - Math.PI / 2) * sunDistance;
  sun.position.y = Math.sin(sunAngle - Math.PI / 2) * sunDistance + 100;
  sun.position.z = 0;

  // Posición de la luna (opuesta al sol)
  const moonAngle = sunAngle + Math.PI;
  moon.position.x = Math.cos(moonAngle - Math.PI / 2) * sunDistance;
  moon.position.y = Math.sin(moonAngle - Math.PI / 2) * sunDistance + 100;
  moon.position.z = 0;

  // Actualizar luz ambiental según el ciclo
  const ambientLight = scene.children.find(
    (child) => child instanceof THREE.AmbientLight
  );
  if (ambientLight) {
    // Mínimo brillo a media noche, máximo a mediodía
    const brightness = 0.2 + Math.max(0, Math.sin(sunAngle)) * 0.6;
    ambientLight.intensity = brightness;
  }

  // Cambiar color del cielo y la niebla según la hora
  let skyColor;

  // Definir puntos de referencia del ciclo con sus colores
  const colorKeyframes = [
    { time: 0.0, color: [0.6, 0.3, 0.05] }, // Noche (00:00)
    { time: 0.25, color: [0.6, 0.3, 0.05] }, // Noche (06:00)
    { time: 0.3, color: [0.05, 0.9, 0.35] }, // Amanecer naranja (07:12)
    { time: 0.35, color: [0.05, 0.7, 0.5] }, // Amanecer amarillo (08:24)
    { time: 0.45, color: [0.6, 0.7, 0.7] }, // Mañana azul claro (10:48)
    { time: 0.5, color: [0.6, 0.7, 0.75] }, // Mediodía inicio (12:00)
    { time: 0.6, color: [0.6, 0.7, 0.8] }, // Mediodía pico (14:24)
    { time: 0.7, color: [0.6, 0.7, 0.7] }, // Tarde (16:48)
    { time: 0.75, color: [0.05, 0.8, 0.45] }, // Atardecer naranja (18:00)
    { time: 0.8, color: [0.05, 0.5, 0.25] }, // Atardecer rojo (19:12)
    { time: 0.9, color: [0.6, 0.4, 0.1] }, // Anochecer (21:36)
    { time: 1.0, color: [0.6, 0.3, 0.05] }, // Noche (24:00)
  ];

  // Encontrar los dos puntos de referencia más cercanos
  let keyframe1 = colorKeyframes[0];
  let keyframe2 = colorKeyframes[1];

  for (let i = 0; i < colorKeyframes.length - 1; i++) {
    if (
      dayNightCycle >= colorKeyframes[i].time &&
      dayNightCycle <= colorKeyframes[i + 1].time
    ) {
      keyframe1 = colorKeyframes[i];
      keyframe2 = colorKeyframes[i + 1];
      break;
    }
  }

  // Interpolar entre los dos keyframes
  const t =
    (dayNightCycle - keyframe1.time) / (keyframe2.time - keyframe1.time);
  const h = keyframe1.color[0] + (keyframe2.color[0] - keyframe1.color[0]) * t;
  const s = keyframe1.color[1] + (keyframe2.color[1] - keyframe1.color[1]) * t;
  const l = keyframe1.color[2] + (keyframe2.color[2] - keyframe1.color[2]) * t;

  skyColor = new THREE.Color().setHSL(h, s, l);

  scene.background = skyColor;
  scene.fog.color = skyColor;

  // Mostrar/ocultar estrellas según la hora
  updateStarsVisibility();

  // Actualizar temporizador en la UI
  updateTimeDisplay();
}

function updateTimeDisplay() {
  let timeDisplay = document.getElementById("time-display");
  if (!timeDisplay) {
    timeDisplay = document.createElement("div");
    timeDisplay.id = "time-display";
    timeDisplay.style.cssText = `
      position: absolute;
      top: 80px;
      left: 20px;
      background: rgba(15, 23, 42, 0.9);
      backdrop-filter: blur(10px);
      border-radius: 12px;
      padding: 15px 25px;
      border: 1px solid rgba(100, 181, 246, 0.3);
      pointer-events: auto;
      color: white;
      font-size: 16px;
      font-weight: bold;
      font-family: 'Courier New', monospace;
    `;
    document.body.appendChild(timeDisplay);
  }

  // Calcular hora (0-24)
  const hour = Math.floor(dayNightCycle * 24);
  const minute = Math.floor((dayNightCycle * 24 - hour) * 60);
  const timeString = `${hour.toString().padStart(2, "0")}:${minute
    .toString()
    .padStart(2, "0")}`;
  const timeOfDay = hour >= 6 && hour < 18 ? "Día" : "Noche";

  timeDisplay.textContent = ` ${timeString} (${timeOfDay})`;
}

function createUI() {
  uiContainer = document.createElement("div");
  uiContainer.style.position = "absolute";
  uiContainer.style.top = "0";
  uiContainer.style.left = "0";
  uiContainer.style.width = "100%";
  uiContainer.style.height = "100%";
  uiContainer.style.pointerEvents = "none";
  uiContainer.style.fontFamily = "Arial, sans-serif";
  uiContainer.style.zIndex = "1000";
  document.body.appendChild(uiContainer);

  const header = document.createElement("div");
  header.style.cssText = `
    background: linear-gradient(90deg, rgba(15, 23, 42, 0.9), rgba(30, 41, 59, 0.9));
    backdrop-filter: blur(10px);
    padding: 20px 30px;
    border-bottom: 2px solid rgba(100, 181, 246, 0.3);
    pointer-events: auto;
  `;
  header.innerHTML = `
    <h1 style="color: white; margin: 0 0 5px 0;">Visualización Geográfica 3D</h1>
    <p style="color: #64b5f6; margin: 0;">Las Palmas de Gran Canaria - Mesa y López</p>
  `;
  uiContainer.appendChild(header);

  // Info de controles
  const controlsInfo = document.createElement("div");
  controlsInfo.style.cssText = `
    position: absolute;
    bottom: 20px;
    left: 20px;
    background: rgba(15, 23, 42, 0.9);
    backdrop-filter: blur(10px);
    border-radius: 12px;
    padding: 15px;
    border: 1px solid rgba(100, 181, 246, 0.3);
    pointer-events: auto;
    color: white;
    font-size: 12px;
  `;
  controlsInfo.innerHTML = `
    <strong>Controles:</strong><br>
    <span style="color: #64b5f6;">Vista Orbital:</span><br>
     Click izq + arrastrar: Rotar<br>
     Scroll: Zoom<br>
     Click der + arrastrar: Mover<br>
    <br>
    <span style="color: #4caf50;">Vista Primera Persona:</span><br>
     WASD: Movimiento<br>
     Ratón: Mirar alrededor<br>
    <br>
     <strong>V</strong>: Cambiar vista
  `;
  uiContainer.appendChild(controlsInfo);
}

function createPlaneWithoutTexture() {
  const geometry = new THREE.PlaneGeometry(mapsx, mapsy);
  const material = new THREE.MeshStandardMaterial({
    color: 0x3a5f3a,
    roughness: 0.8,
  });
  mapa = new THREE.Mesh(geometry, material);
  mapa.rotation.x = -Math.PI / 2;
  mapa.position.y = 0;
  mapa.receiveShadow = true;
  scene.add(mapa);
}

// --------------------------- OSM + Construcción ---------------------------

function loadOSMData() {
  const loader = new THREE.FileLoader();
  loader.load(
    "src/mapLPGC_MyL2025.osm",
    (text) => parseOSMData(text),
    undefined,
    () => createSampleData()
  );
}

function parseOSMData(text) {
  const parser = new DOMParser();
  const xmlDoc = parser.parseFromString(text, "application/xml");

  const nodeElements = xmlDoc.getElementsByTagName("node");
  const wayElements = xmlDoc.getElementsByTagName("way");

  for (let i = 0; i < wayElements.length; i++) {
    const way = wayElements[i];
    const tags = way.getElementsByTagName("tag");
    let isBuilding = false;
    let isHighway = false;

    for (let j = 0; j < tags.length; j++) {
      const key = tags[j].getAttribute("k");
      if (key === "building") isBuilding = true;
      if (key === "highway") isHighway = true;
    }

    const nds = way.getElementsByTagName("nd");
    const points = [];

    for (let k = 0; k < nds.length; k++) {
      const ref = nds[k].getAttribute("ref");
      for (let n = 0; n < nodeElements.length; n++) {
        if (nodeElements[n].getAttribute("id") === ref) {
          const lat = parseFloat(nodeElements[n].getAttribute("lat"));
          const lon = parseFloat(nodeElements[n].getAttribute("lon"));
          const mlon = map2Range(lon, minlon, maxlon, -mapsx / 2, mapsx / 2);

          // Usar diferentes mapeos según el tipo
          let mlat;
          if (isBuilding) {
            mlat = map2Range(lat, minlat, maxlat, -mapsy / 2, mapsy / 2);
          } else {
            mlat = map2Range(lat, minlat, maxlat, mapsy / 2, -mapsy / 2);
          }

          points.push(new THREE.Vector3(mlon, 0, mlat));
          break;
        }
      }
    }

    if (points.length > 0) {
      if (isBuilding) {
        createBuilding(points);
        stats.buildings++;
      } else if (isHighway) {
        createStreet(points);
        stats.streets++;
      }
      stats.points += points.length;
    }
  }

  console.log(
    `Cargados: ${stats.buildings} edificios, ${stats.streets} calles`
  );
}

function createBuilding(points) {
  const shape = new THREE.Shape();
  shape.moveTo(points[0].x, points[0].z);
  for (let i = 1; i < points.length; i++) {
    shape.lineTo(points[i].x, points[i].z);
  }

  const height = (1 + Math.random() * 3) * worldScale; // Edificios más bajos

  const extrudeSettings = {
    steps: 1,
    depth: height,
    bevelEnabled: true,
    bevelThickness: 0.1,
    bevelSize: 0.1,
    bevelSegments: 1,
  };

  const geometry = new THREE.ExtrudeGeometry(shape, extrudeSettings);
  // Rotar para que la extrusión vaya hacia arriba (eje Y+)
  geometry.rotateX(-Math.PI / 2);

  // Colores más realistas para edificios
  const colors = [
    0xf5f5f5, // Blanco
    0xe0e0e0, // Gris claro
    0xd7ccc8, // Beige
    0xbcaaa4, // Marrón claro
    0x90a4ae, // Gris azulado
  ];
  const color = colors[Math.floor(Math.random() * colors.length)];

  const material = new THREE.MeshStandardMaterial({
    color: color,
    roughness: 0.7,
    metalness: 0.2,
  });

  const mesh = new THREE.Mesh(geometry, material);
  mesh.position.y = 0; // Posicionar en el suelo
  mesh.userData.type = "buildings";
  mesh.castShadow = true;
  mesh.receiveShadow = true;

  scene.add(mesh);
  objetos.push(mesh);

  // Crear bounding box para colisiones
  const box = new THREE.Box3().setFromObject(mesh);
  buildingBoxes.push(box);
}

function createStreet(points) {
  // Crear línea de la calle
  const geometry = new THREE.BufferGeometry().setFromPoints(points);
  const line = new THREE.Line(
    geometry,
    new THREE.LineBasicMaterial({ color: 0x444444, linewidth: 2 })
  );
  line.userData.type = "streets";
  scene.add(line);
  objetos.push(line);

  // Añadir puntos de interés en el suelo
  points.forEach((point) => {
    const sphere = new THREE.Mesh(
      new THREE.SphereGeometry(0.15 * worldScale, 16, 16),
      new THREE.MeshStandardMaterial({
        color: 0x7cb342,
        emissive: 0x558b2f,
        emissiveIntensity: 0.3,
      })
    );
    sphere.position.set(point.x, 0.15 * worldScale, point.z);
    sphere.userData.type = "points";
    scene.add(sphere);
    objetos.push(sphere);
  });
}

function createSampleData() {
  for (let i = 0; i < 15; i++) {
    const x = (Math.random() - 0.5) * mapsx * 0.6;
    const z = (Math.random() - 0.5) * mapsy * 0.6;
    const w = (2 + Math.random() * 4) * worldScale; // Edificios más pequeños
    const d = (2 + Math.random() * 4) * worldScale;
    const pts = [
      new THREE.Vector3(x, 0, z),
      new THREE.Vector3(x + w, 0, z),
      new THREE.Vector3(x + w, 0, z + d),
      new THREE.Vector3(x, 0, z + d),
    ];
    createBuilding(pts);
    stats.buildings++;
  }
  console.log(`Edificios de ejemplo creados: ${stats.buildings}`);
}

// --------------------------- Colisiones ---------------------------

function checkCollision(newPosition) {
  const playerRadius = 0.2 * worldScale; // Jugador muy pequeño
  const playerBox = new THREE.Box3(
    new THREE.Vector3(
      newPosition.x - playerRadius,
      0,
      newPosition.z - playerRadius
    ),
    new THREE.Vector3(
      newPosition.x + playerRadius,
      10 * worldScale,
      newPosition.z + playerRadius
    )
  );

  for (let box of buildingBoxes) {
    if (playerBox.intersectsBox(box)) {
      return true;
    }
  }
  return false;
}

// --------------------------- Movimiento ---------------------------

function map2Range(val, vmin, vmax, dmin, dmax) {
  const t = (val - vmin) / (vmax - vmin);
  return dmin + t * (dmax - dmin);
}

function onWindowResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  fpCamera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  fpCamera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
}

function onKeyDown(e) {
  if (e.key === "v" || e.key === "V") {
    toggleView();
    return;
  }
  if (!isFirstPerson) return;
  switch (e.key.toLowerCase()) {
    case "w":
      moveState.forward = true;
      break;
    case "s":
      moveState.backward = true;
      break;
    case "a":
      moveState.left = true;
      break;
    case "d":
      moveState.right = true;
      break;
  }
}

function onKeyUp(e) {
  if (!isFirstPerson) return;
  switch (e.key.toLowerCase()) {
    case "w":
      moveState.forward = false;
      break;
    case "s":
      moveState.backward = false;
      break;
    case "a":
      moveState.left = false;
      break;
    case "d":
      moveState.right = false;
      break;
  }
}

function onCanvasClick() {
  if (isFirstPerson && !pointerLocked) renderer.domElement.requestPointerLock();
}

function onMouseMove(e) {
  if (!isFirstPerson || !pointerLocked) return;
  const movementX = e.movementX || 0,
    movementY = e.movementY || 0;
  euler.setFromQuaternion(fpCamera.quaternion);
  euler.y -= movementX * lookSpeed;
  euler.x -= movementY * lookSpeed;
  euler.x = Math.max(-Math.PI / 2, Math.min(Math.PI / 2, euler.x));
  fpCamera.quaternion.setFromEuler(euler);
}

function onPointerLockChange() {
  pointerLocked = document.pointerLockElement === renderer.domElement;
}

function toggleView() {
  isFirstPerson = !isFirstPerson;
  camcontrols.enabled = !isFirstPerson;

  if (isFirstPerson) {
    showViewIndicator("Primera Persona - Click para bloquear cursor");
  } else {
    if (pointerLocked) {
      document.exitPointerLock();
    }
    showViewIndicator("Vista Orbital");
  }
}

function showViewIndicator(text) {
  let indicator = document.getElementById("view-indicator");
  if (!indicator) {
    indicator = document.createElement("div");
    indicator.id = "view-indicator";
    indicator.style.cssText = `
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      background: rgba(15, 23, 42, 0.95);
      color: white;
      padding: 20px 40px;
      border-radius: 12px;
      border: 2px solid #64b5f6;
      font-size: 18px;
      font-weight: bold;
      pointer-events: none;
      z-index: 2000;
      transition: opacity 0.3s;
    `;
    document.body.appendChild(indicator);
  }

  indicator.textContent = text;
  indicator.style.opacity = "1";

  setTimeout(() => {
    indicator.style.opacity = "0";
  }, 2000);
}

function updateFirstPersonMovement() {
  if (!isFirstPerson) return;

  const direction = new THREE.Vector3();
  const right = new THREE.Vector3();
  fpCamera.getWorldDirection(direction);
  direction.y = 0;
  direction.normalize();
  right.crossVectors(fpCamera.up, direction).normalize();

  velocity.set(0, 0, 0);
  if (moveState.forward) velocity.add(direction);
  if (moveState.backward) velocity.sub(direction);
  if (moveState.left) velocity.add(right);
  if (moveState.right) velocity.sub(right);

  if (velocity.length() > 0) {
    velocity.normalize().multiplyScalar(moveSpeed);

    // Nueva posición propuesta
    const newPosition = fpCamera.position.clone().add(velocity);
    newPosition.y = 0.4 * worldScale;

    // Si no hay edificios, siempre permitir movimiento
    if (buildingBoxes.length === 0) {
      fpCamera.position.copy(newPosition);
    } else {
      // Verificar colisiones
      if (!checkCollision(newPosition)) {
        fpCamera.position.copy(newPosition);
      } else {
        // Intentar deslizarse en un solo eje
        const slideX = fpCamera.position.clone();
        slideX.x += velocity.x;
        slideX.y = 0.4 * worldScale;

        const slideZ = fpCamera.position.clone();
        slideZ.z += velocity.z;
        slideZ.y = 0.4 * worldScale;

        if (!checkCollision(slideX)) {
          fpCamera.position.copy(slideX);
        } else if (!checkCollision(slideZ)) {
          fpCamera.position.copy(slideZ);
        }
      }
    }

    // Límites del mapa más amplios
    const margin = 20 * worldScale;
    if (mapsx && mapsy) {
      fpCamera.position.x = Math.max(
        -mapsx / 2 + margin,
        Math.min(mapsx / 2 - margin, fpCamera.position.x)
      );
      fpCamera.position.z = Math.max(
        -mapsy / 2 + margin,
        Math.min(mapsy / 2 - margin, fpCamera.position.z)
      );
    }
  }
}

function animate() {
  requestAnimationFrame(animate);

  // Actualizar ciclo día-noche
  updateDayNightCycle();

  if (isFirstPerson) {
    updateFirstPersonMovement();
    renderer.render(scene, fpCamera);
  } else {
    camcontrols.update();
    renderer.render(scene, camera);
  }
}
