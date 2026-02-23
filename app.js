const NOTES = [
  "C",
  "C#/D♭",
  "D",
  "D#/E♭",
  "E",
  "F",
  "F#/G♭",
  "G",
  "G#/A♭",
  "A",
  "A#/B♭",
  "B",
];

const BLACK_KEYS = new Set([1, 3, 6, 8, 10]);
const FULL_CIRCLE = Math.PI * 2;
const STEP_ANGLE = FULL_CIRCLE / 12;

const svg = document.getElementById("dial");
const outerRing = document.getElementById("outer-ring");
const innerRotor = document.getElementById("inner-rotor");
const rotationInput = document.getElementById("rotation");
const stepLeftButton = document.getElementById("step-left");
const stepRightButton = document.getElementById("step-right");
const presetAltoButton = document.getElementById("preset-eb-alto");
const presetResetButton = document.getElementById("preset-reset");
const mappingText = document.getElementById("mapping-text");

let rotationStep = 9; // E♭ Alto to concert quick conversion
let selectedOuterIndex = 0;
let dragStartAngle = null;
let dragStartStep = rotationStep;

function polarToCartesian(cx, cy, r, angle) {
  return {
    x: cx + r * Math.cos(angle),
    y: cy + r * Math.sin(angle),
  };
}

function annularSlicePath(cx, cy, outerR, innerR, startAngle, endAngle) {
  const largeArc = endAngle - startAngle > Math.PI ? 1 : 0;
  const p1 = polarToCartesian(cx, cy, outerR, startAngle);
  const p2 = polarToCartesian(cx, cy, outerR, endAngle);
  const p3 = polarToCartesian(cx, cy, innerR, endAngle);
  const p4 = polarToCartesian(cx, cy, innerR, startAngle);

  return [
    `M ${p1.x} ${p1.y}`,
    `A ${outerR} ${outerR} 0 ${largeArc} 1 ${p2.x} ${p2.y}`,
    `L ${p3.x} ${p3.y}`,
    `A ${innerR} ${innerR} 0 ${largeArc} 0 ${p4.x} ${p4.y}`,
    "Z",
  ].join(" ");
}

function createSlice(group, index, outerR, innerR, ringClass) {
  // Keep the center of C exactly at 12 o'clock.
  const start = -Math.PI / 2 - STEP_ANGLE / 2 + index * STEP_ANGLE;
  const end = start + STEP_ANGLE;
  const isBlack = BLACK_KEYS.has(index);
  const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
  path.setAttribute("d", annularSlicePath(300, 300, outerR, innerR, start, end));
  path.classList.add("slice", isBlack ? "black" : "white", ringClass);
  path.dataset.index = String(index);
  group.appendChild(path);

  const mid = start + STEP_ANGLE / 2;
  const labelPos = polarToCartesian(300, 300, (outerR + innerR) / 2, mid);
  const text = document.createElementNS("http://www.w3.org/2000/svg", "text");
  text.setAttribute("x", String(labelPos.x));
  text.setAttribute("y", String(labelPos.y + 7));
  text.setAttribute("text-anchor", "middle");
  text.classList.add("note-label");
  if (ringClass === "inner") {
    text.classList.add("inner");
  }
  if (isBlack) {
    text.classList.add("black");
  }
  const radialDeg = (mid * 180) / Math.PI;
  // Rotate each label so its "up" direction points from center to outside.
  text.setAttribute(
    "transform",
    `rotate(${radialDeg + 90} ${labelPos.x} ${labelPos.y + 7})`
  );
  text.textContent = isBlack ? "" : NOTES[index].split("/")[0];
  group.appendChild(text);

  return path;
}

const outerSlices = [];
for (let i = 0; i < 12; i += 1) {
  const path = createSlice(outerRing, i, 280, 190, "outer");
  outerSlices.push(path);
}

for (let i = 0; i < 12; i += 1) {
  createSlice(innerRotor, i, 180, 90, "inner");
}

function normalizeStep(step) {
  return ((step % 12) + 12) % 12;
}

function updateRotation(newStep) {
  rotationStep = normalizeStep(newStep);
  rotationInput.value = String(rotationStep);
  innerRotor.setAttribute(
    "transform",
    `rotate(${rotationStep * 30} 300 300)`
  );
  updateMappingText();
}

function updateSelectedOuter(index) {
  selectedOuterIndex = index;
  for (const slice of outerSlices) {
    slice.classList.remove("selected-stroke");
  }
  outerSlices[index].classList.add("selected-stroke");
  updateMappingText();
}

function updateMappingText() {
  const convertedIndex = normalizeStep(selectedOuterIndex - rotationStep);
  mappingText.textContent =
    `${NOTES[selectedOuterIndex]} を選択中: 変換先は ${NOTES[convertedIndex]}`;
}

rotationInput.addEventListener("input", (event) => {
  updateRotation(Number(event.target.value));
});

stepLeftButton.addEventListener("click", () => {
  updateRotation(rotationStep - 1);
});

stepRightButton.addEventListener("click", () => {
  updateRotation(rotationStep + 1);
});

presetAltoButton.addEventListener("click", () => {
  updateRotation(9);
});

presetResetButton.addEventListener("click", () => {
  updateRotation(0);
});

outerRing.addEventListener("click", (event) => {
  const target = event.target;
  if (!(target instanceof SVGPathElement)) {
    return;
  }
  const idx = Number(target.dataset.index);
  if (Number.isInteger(idx)) {
    updateSelectedOuter(idx);
  }
});

function pointerAngle(clientX, clientY) {
  const rect = svg.getBoundingClientRect();
  const cx = rect.left + rect.width / 2;
  const cy = rect.top + rect.height / 2;
  return Math.atan2(clientY - cy, clientX - cx);
}

innerRotor.addEventListener("pointerdown", (event) => {
  dragStartAngle = pointerAngle(event.clientX, event.clientY);
  dragStartStep = rotationStep;
  innerRotor.setPointerCapture(event.pointerId);
});

innerRotor.addEventListener("pointermove", (event) => {
  if (dragStartAngle === null) {
    return;
  }
  const current = pointerAngle(event.clientX, event.clientY);
  const diff = current - dragStartAngle;
  const rawSteps = diff / STEP_ANGLE;
  const snapped = Math.round(rawSteps);
  updateRotation(dragStartStep + snapped);
});

function releaseDrag() {
  dragStartAngle = null;
}

innerRotor.addEventListener("pointerup", releaseDrag);
innerRotor.addEventListener("pointercancel", releaseDrag);
innerRotor.addEventListener("lostpointercapture", releaseDrag);

updateSelectedOuter(0);
updateRotation(9);

if ("serviceWorker" in navigator && window.location.protocol !== "file:") {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("./sw.js").catch((error) => {
      console.error("Service Worker registration failed:", error);
    });
  });
}
