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
const SCALES = {
  major_pentatonic: [0, 2, 4, 7, 9],
  minor_pentatonic: [0, 3, 5, 7, 10],
};
const CHORDS = {
  major: [0, 4, 7],
  minor: [0, 3, 7],
  dominant7: [0, 4, 7, 10],
  minor7: [0, 3, 7, 10],
  major7: [0, 4, 7, 11],
  minor7b5: [0, 3, 6, 10],
  diminished: [0, 3, 6],
  diminished7: [0, 3, 6, 9],
  augmented: [0, 4, 8],
  sus2: [0, 2, 7],
  sus4: [0, 5, 7],
  sixth: [0, 4, 7, 9],
  minor6: [0, 3, 7, 9],
  add9: [0, 4, 7, 14],
  dominant9: [0, 4, 7, 10, 14],
  major9: [0, 4, 7, 11, 14],
  minor9: [0, 3, 7, 10, 14],
  dominant11: [0, 4, 7, 10, 14, 17],
  dominant13: [0, 4, 7, 10, 14, 17, 21],
  dominant7b9: [0, 4, 7, 10, 13],
  dominant7sharp9: [0, 4, 7, 10, 15],
};

const BLACK_KEYS = new Set([1, 3, 6, 8, 10]);
const FULL_CIRCLE = Math.PI * 2;
const STEP_ANGLE = FULL_CIRCLE / 12;

const svg = document.getElementById("dial");
const outerRing = document.getElementById("outer-ring");
const highlightRing = document.getElementById("highlight-ring");
const innerRotor = document.getElementById("inner-rotor");
const majorPentatonicButton = document.getElementById("scale-major-pentatonic");
const minorPentatonicButton = document.getElementById("scale-minor-pentatonic");
const chordButtons = Array.from(document.querySelectorAll("[data-chord-key]"));

let rotationStep = 9; // E♭ Alto to concert quick conversion
let dragStartAngle = null;
let dragStartStep = rotationStep;
let activeScale = null;
let activeChord = null;

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

function createSlice(group, index, outerR, innerR, ringClass, showLabel = true) {
  // Keep the center of C exactly at 12 o'clock.
  const start = -Math.PI / 2 - STEP_ANGLE / 2 + index * STEP_ANGLE;
  const end = start + STEP_ANGLE;
  const isBlack = BLACK_KEYS.has(index);
  const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
  path.setAttribute("d", annularSlicePath(300, 300, outerR, innerR, start, end));
  path.classList.add("slice", isBlack ? "black" : "white", ringClass);
  path.dataset.index = String(index);
  group.appendChild(path);

  if (!showLabel) {
    return path;
  }

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

for (let i = 0; i < 12; i += 1) {
  createSlice(outerRing, i, 280, 190, "outer");
}

const highlightSlices = [];
for (let i = 0; i < 12; i += 1) {
  highlightSlices.push(createSlice(highlightRing, i, 188, 182, "highlight", false));
}

for (let i = 0; i < 12; i += 1) {
  createSlice(innerRotor, i, 180, 90, "inner");
}

function normalizeStep(step) {
  return ((step % 12) + 12) % 12;
}

function updateRotation(newStep) {
  rotationStep = normalizeStep(newStep);
  const displayStep = normalizeStep(-rotationStep);
  innerRotor.setAttribute(
    "transform",
    `rotate(${displayStep * 30} 300 300)`
  );
}

function updateScaleButtons() {
  majorPentatonicButton.classList.toggle(
    "is-active",
    activeScale === "major_pentatonic"
  );
  minorPentatonicButton.classList.toggle(
    "is-active",
    activeScale === "minor_pentatonic"
  );
  majorPentatonicButton.setAttribute(
    "aria-pressed",
    String(activeScale === "major_pentatonic")
  );
  minorPentatonicButton.setAttribute(
    "aria-pressed",
    String(activeScale === "minor_pentatonic")
  );
}

function updateChordButtons() {
  for (const button of chordButtons) {
    const chordKey = button.dataset.chordKey;
    const isActive = chordKey === activeChord;
    button.classList.toggle("is-active", isActive);
    button.setAttribute("aria-pressed", String(isActive));
  }
}

function chordNoteSet(rootIndex, chordKey) {
  const intervals = CHORDS[chordKey];
  const notes = new Set();
  for (const interval of intervals) {
    notes.add(normalizeStep(rootIndex + interval));
  }
  return notes;
}

function updateScaleHighlight() {
  let activeNotes = null;
  if (activeChord) {
    activeNotes = chordNoteSet(0, activeChord);
  } else if (activeScale) {
    activeNotes = new Set(SCALES[activeScale]);
  }
  for (let i = 0; i < highlightSlices.length; i += 1) {
    const shouldHighlight = activeNotes ? activeNotes.has(i) : false;
    highlightSlices[i].classList.toggle("scale-note", shouldHighlight);
  }
}

function toggleScale(nextScale) {
  activeScale = activeScale === nextScale ? null : nextScale;
  if (activeScale) {
    activeChord = null;
  }
  updateScaleButtons();
  updateChordButtons();
  updateScaleHighlight();
}

function toggleChord(nextChord) {
  activeChord = activeChord === nextChord ? null : nextChord;
  if (activeChord) {
    activeScale = null;
  }
  updateScaleButtons();
  updateChordButtons();
  updateScaleHighlight();
}

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
  updateRotation(dragStartStep - snapped);
});

function releaseDrag() {
  dragStartAngle = null;
}

innerRotor.addEventListener("pointerup", releaseDrag);
innerRotor.addEventListener("pointercancel", releaseDrag);
innerRotor.addEventListener("lostpointercapture", releaseDrag);

majorPentatonicButton.addEventListener("click", () => {
  toggleScale("major_pentatonic");
});

minorPentatonicButton.addEventListener("click", () => {
  toggleScale("minor_pentatonic");
});

for (const button of chordButtons) {
  button.addEventListener("click", () => {
    toggleChord(button.dataset.chordKey);
  });
}

updateRotation(9);
updateScaleButtons();
updateChordButtons();
updateScaleHighlight();

if ("serviceWorker" in navigator && window.location.protocol !== "file:") {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("./sw.js").catch((error) => {
      console.error("Service Worker registration failed:", error);
    });
  });
}
