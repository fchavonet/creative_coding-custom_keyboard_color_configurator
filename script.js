/******************************
* RESPONSIVE WARNING BEHAVIOR *
******************************/

const responsiveWarning = document.getElementById("responsive-warning");
// Enable/disable responsive warning.
const responsiveDesign = false;
// Mobile width limit.
const threshold = 900;

// Show or hide modal based on screen size.
function checkResponsiveState() {
  const small = window.innerWidth <= threshold;

  if (!responsiveDesign && small) {
    if (!responsiveWarning.open) {
      responsiveWarning.showModal();
      document.body.classList.add("overflow-hidden");
    }
  } else {
    if (responsiveWarning.open) {
      responsiveWarning.close();
      document.body.classList.remove("overflow-hidden");
    }
  }
}

// Initial check.
checkResponsiveState();

// Real-time resize detection.
window.addEventListener("resize", checkResponsiveState);


/**********************
* KEYBOARD GENERATION *
**********************/

const keyboardBackground = document.getElementById("keyboard_background");
const keycapTemplate = document.getElementById("keycap_template");

// Create all five rows from a keyboard layout.
function createKeyboard(keyboardLayout) {
  const fragment = document.createDocumentFragment();

  keyboardLayout.forEach(function (keys) {
    const row = document.createElement("div");
    row.classList.add("keyboard_row");

    keys.forEach(function (data) {
      const key = keycapTemplate.content.firstElementChild.cloneNode(true);
      const shadow = key.querySelector(".keycap_shadow");
      const top = key.querySelector(".keycap_top");
      const text = key.querySelector(".keycap_text");

      key.dataset.code = data.code;
      key.classList.add(data.category);
      top.classList.add(data.category);

      // Keep the original dimensions of special keys.
      if (data.size) {
        key.classList.add(data.size);
        shadow.classList.add(data.size);
      }

      // Keep the original arrow labels and Ubuntu logo.
      if (data.category === "arrow_pad") {
        text.classList.add("arrow_pad_text");
      }

      if (data.logo) {
        text.id = "logo";
        text.setAttribute("role", "img");
        text.setAttribute("aria-label", "Ubuntu logo");
      } else {
        text.innerHTML = data.label;
      }

      row.appendChild(key);
    });

    fragment.appendChild(row);
  });

  // Replace the previous layout when loading a new one.
  keyboardBackground.replaceChildren(fragment);
}



/******************
* KEYBOARD SOUND *
******************/

const soundToggle = document.getElementById("sound_toggle");
const soundIcon = soundToggle.querySelector("i");
const soundPath = "./assets/audio/keyboard_key.mp3";

let soundEnabled = true;
let soundContext = null;
let soundBuffer = null;
let soundGain = null;

const activeSounds = [];
const maxSimultaneousSounds = 4;
const maxSoundDuration = 0.24;

// Restore the saved sound preference.
try {
  const savedSound = localStorage.getItem("keyboard_sound");

  if (savedSound === "false") {
    soundEnabled = false;
  }
} catch (error) {
  console.warn("Unable to restore keyboard sound:", error);
}

// Update the sound button appearance.
function updateSoundButton() {
  soundToggle.setAttribute("aria-pressed", String(soundEnabled));

  if (soundEnabled) {
    soundIcon.className = "bi bi-volume-up-fill text-lg";
    soundToggle.setAttribute("aria-label", "Mute keyboard sound");
    soundToggle.title = "Mute keyboard sound";
  } else {
    soundIcon.className = "bi bi-volume-mute-fill text-lg";
    soundToggle.setAttribute("aria-label", "Enable keyboard sound");
    soundToggle.title = "Enable keyboard sound";
  }
}

// Load and decode the audio file once.
async function loadSound() {
  if (soundContext) {
    return;
  }

  const AudioContextClass = window.AudioContext || window.webkitAudioContext;

  if (!AudioContextClass) {
    console.warn("Web Audio API is not supported by this browser.");
    return;
  }

  try {
    soundContext = new AudioContextClass();

    if (soundContext.state === "suspended") {
      soundContext.resume().catch(function (error) {
        console.warn("Unable to resume keyboard sound:", error);
      });
    }

    const response = await fetch(soundPath);

    if (!response.ok) {
      throw new Error("Failed to load keyboard sound.");
    }

    const buffer = await response.arrayBuffer();
    soundBuffer = await soundContext.decodeAudioData(buffer);

    // Control the overall volume.
    soundGain = soundContext.createGain();
    soundGain.gain.value = 0.28;

    // Smooth out simultaneous keypress peaks.
    const compressor = soundContext.createDynamicsCompressor();

    compressor.threshold.value = -24;
    compressor.knee.value = 12;
    compressor.ratio.value = 3;
    compressor.attack.value = 0.003;
    compressor.release.value = 0.12;

    soundGain.connect(compressor);
    compressor.connect(soundContext.destination);
  } catch (error) {
    console.error("Keyboard sound loading error:", error);
  }
}

// Stop an older sound smoothly.
function fadeOutSound(voice) {
  if (!soundContext) {
    return;
  }

  const now = soundContext.currentTime;

  voice.gain.gain.cancelScheduledValues(now);
  voice.gain.gain.setValueAtTime(0.15, now);
  voice.gain.gain.linearRampToValueAtTime(0, now + 0.015);

  try {
    voice.source.stop(now + 0.02);
  } catch (error) {
    // The source may already have stopped.
  }
}

// Play a slightly different sound for each keypress.
function playSound(code = "") {
  if (!soundEnabled || !soundContext || !soundBuffer || !soundGain) {
    return;
  }

  if (soundContext.state === "suspended") {
    soundContext.resume().catch(function (error) {
      console.warn("Unable to resume keyboard sound:", error);
    });
  }

  const now = soundContext.currentTime;

  // Introduce subtle natural variations.
  let playbackRate = 0.96 + Math.random() * 0.08;
  let volume = 0.75 + Math.random() * 0.20;

  // Larger keys produce slightly deeper sounds.
  if (code === "Space") {
    playbackRate *= 0.90;
    volume *= 1.05;
  } else if (code === "Enter" || code === "Backspace") {
    playbackRate *= 0.95;
  } else if (
    code.startsWith("Shift") ||
    code.startsWith("Control") ||
    code.startsWith("Alt")
  ) {
    playbackRate *= 0.97;
    volume *= 0.90;
  }

  // Prevent excessive overlapping sounds.
  if (activeSounds.length >= maxSimultaneousSounds) {
    const oldestSound = activeSounds.shift();
    fadeOutSound(oldestSound);
  }

  const source = soundContext.createBufferSource();
  const gain = soundContext.createGain();

  source.buffer = soundBuffer;
  source.playbackRate.value = playbackRate;

  // Limit playback duration to reduce excessive overlap.
  const duration = Math.min(
    soundBuffer.duration / playbackRate,
    maxSoundDuration
  );

  const fadeDuration = Math.min(0.06, duration * 0.3);
  const endTime = now + duration;

  // Short attack and progressive release.
  gain.gain.setValueAtTime(0, now);
  gain.gain.linearRampToValueAtTime(volume, now + 0.002);
  gain.gain.setValueAtTime(volume, endTime - fadeDuration);
  gain.gain.linearRampToValueAtTime(0, endTime);

  source.connect(gain);
  gain.connect(soundGain);

  const voice = { source, gain };

  activeSounds.push(voice);

  // Remove completed sounds from the active list.
  source.onended = function () {
    const index = activeSounds.indexOf(voice);

    if (index !== -1) {
      activeSounds.splice(index, 1);
    }

    source.disconnect();
    gain.disconnect();
  };

  source.start(now);
  source.stop(endTime);
}

// Enable or disable the keyboard sound.
soundToggle.addEventListener("click", function () {
  soundEnabled = !soundEnabled;
  updateSoundButton();

  try {
    localStorage.setItem("keyboard_sound", String(soundEnabled));
  } catch (error) {
    console.warn("Unable to save keyboard sound:", error);
  }
});

// Initial setup.
updateSoundButton();

document.addEventListener("click", loadSound, {
  once: true,
  capture: true
});

document.addEventListener("keydown", loadSound, {
  once: true,
  capture: true
});


/********************
* KEYBOARD BEHAVIOR *
********************/

// Press a key.
function pressKey(key) {
  if (key && !key.classList.contains("pressed")) {
    key.classList.add("pressed");
    playSound(key.dataset.code);
  }
}

// Release a key.
function releaseKey(key) {
  if (key) {
    key.classList.remove("pressed");
  }
}

// Find a key from its physical keyboard code.
function getKey(code) {
  return document.querySelector(`#keyboard .keycap[data-code="${code}"]`);
}

// Physical keyboard events.
document.addEventListener("keydown", function (event) {
  if (event.repeat) {
    return;
  }

  pressKey(getKey(event.code));
});

document.addEventListener("keyup", function (event) {
  releaseKey(getKey(event.code));
});

// Mouse and touch events for the current layout.
function initializeKeycapEvents() {
  const keycaps = document.querySelectorAll("#keyboard .keycap");

  keycaps.forEach(function (key) {
    key.addEventListener("pointerdown", function () {
      pressKey(key);
    });

    key.addEventListener("pointerup", function () {
      releaseKey(key);
    });

    key.addEventListener("pointerleave", function () {
      releaseKey(key);
    });

    key.addEventListener("pointercancel", function () {
      releaseKey(key);
    });
  });
}

// Reset keys when the window loses focus.
window.addEventListener("blur", function () {
  const keycaps = document.querySelectorAll("#keyboard .keycap");

  keycaps.forEach(function (key) {
    releaseKey(key);
  });
});


/***********************
* RESPONSIVE KEYBOARD *
***********************/

const keyboard = document.getElementById("keyboard");
const keyboardContainer = document.getElementById("keyboard_container");
const keyboardWrapper = document.getElementById("keyboard_wrapper");

// Keep the original keyboard proportions at every screen size.
function resizeKeyboard() {
  const keyboardWidth = keyboard.offsetWidth;
  const keyboardHeight = keyboard.offsetHeight;
  const availableWidth = keyboardContainer.clientWidth;

  if (keyboardWidth === 0 || availableWidth === 0) {
    return;
  }

  const scale = Math.min(1, availableWidth / keyboardWidth);

  keyboard.style.transform = `scale(${scale})`;
  keyboardWrapper.style.width = `${keyboardWidth * scale}px`;
  keyboardWrapper.style.height = `${keyboardHeight * scale}px`;
}

// Update when the container changes size.
const keyboardObserver = new ResizeObserver(resizeKeyboard);
keyboardObserver.observe(keyboardContainer);


/*******************
* KEYBOARD LOADING *
*******************/

const layoutSelector = document.getElementById("keyboard_layout");
const validLayouts = ["qwerty", "azerty"];
let currentLayout = "qwerty";
let lastLoadRequest = 0;

// Load a keyboard layout from a local JSON file.
async function loadKeyboard(layout) {
  if (!validLayouts.includes(layout)) {
    return;
  }

  // Ignore outdated responses when switching layouts quickly.
  const request = ++lastLoadRequest;

  try {
    const response = await fetch(`./layouts/${layout}.json`);

    if (!response.ok) {
      throw new Error(`Failed to load the ${layout} layout.`);
    }

    const keyboardLayout = await response.json();

    if (request !== lastLoadRequest) {
      return;
    }

    createKeyboard(keyboardLayout);
    initializeKeycapEvents();
    resizeKeyboard();

    currentLayout = layout;
    layoutSelector.value = layout;

    // Remember the selected layout for the next visit.
    try {
      localStorage.setItem("keyboard_layout", layout);
    } catch (error) {
      console.warn("Unable to save keyboard layout:", error);
    }
  } catch (error) {
    if (request === lastLoadRequest) {
      console.error("Keyboard loading error:", error);
      layoutSelector.value = currentLayout;
    }
  }
}

// Restore the previously selected layout, if available.
function getInitialLayout() {
  try {
    const savedLayout = localStorage.getItem("keyboard_layout");

    if (validLayouts.includes(savedLayout)) {
      return savedLayout;
    }
  } catch (error) {
    console.warn("Unable to restore keyboard layout:", error);
  }

  return "qwerty";
}

// Change the layout without reloading the page.
layoutSelector.addEventListener("change", function () {
  loadKeyboard(layoutSelector.value);

  // Release focus from the layout selector.
  layoutSelector.blur();

  // Restore focus after the native dropdown has closed.
  setTimeout(function () {
    typingPreview.focus({ preventScroll: true });
  }, 0);
});

// Default layout (or saved preference).
const initialLayout = getInitialLayout();
layoutSelector.value = initialLayout;
loadKeyboard(initialLayout);


/****************
* COLOR PICKUP *
****************/

const colorPickup = document.getElementById("color_pickup_container");

const colorDefinitions = [
  { id: "keyboard", label: "Keyboard", value: "#232323" },
  { id: "letters", label: "Letters", value: "#7a7a7a" },
  { id: "arrow_pad", label: "Arrows", value: "#b51a00" },
  { id: "control_pad", label: "Control", value: "#7a7a7a" },
  { id: "special", label: "Special", value: "#b51a00" },
  { id: "modifiers", label: "Modifiers", value: "#232323" },
  { id: "numbers", label: "Numbers", value: "#7a7a7a" },
  { id: "escape", label: "Escape", value: "#b51a00" },
  { id: "text", label: "Text", value: "#ebebeb" }
];

const keyboardColors = {};

// Validate and normalize hexadecimal colors.
function normalizeColor(value) {
  let color = value.trim();

  if (!color.startsWith("#")) {
    color = "#" + color;
  }

  if (!/^#[0-9a-fA-F]{6}$/.test(color)) {
    return null;
  }

  return color.toLowerCase();
}

// Apply a color to the keyboard.
function updateKeyboardColor(id, value) {
  keyboardColors[id] = value;

  const property = `--${id.replace(/_/g, "-")}-color`;
  keyboard.style.setProperty(property, value);

  // Save the current colors.
  try {
    localStorage.setItem(
      "keyboard_colors",
      JSON.stringify(keyboardColors)
    );
  } catch (error) {
    console.warn("Unable to save keyboard colors:", error);
  }
}

// Restore previously saved colors.
function getSavedColors() {
  try {
    const saved = localStorage.getItem("keyboard_colors");

    if (saved) {
      const colors = JSON.parse(saved);

      if (colors && typeof colors === "object") {
        return colors;
      }
    }
  } catch (error) {
    console.warn("Unable to restore keyboard colors:", error);
  }

  return {};
}

// Generate the color selectors.
function createColorPickup() {
  const savedColors = getSavedColors();

  colorDefinitions.forEach(function (data) {
    const container = document.createElement("div");
    container.classList.add("color_container");
    container.dataset.colorId = data.id;

    const colorPicker = document.createElement("input");
    colorPicker.type = "color";
    colorPicker.classList.add("color_picker");

    const colorInput = document.createElement("input");
    colorInput.type = "text";
    colorInput.classList.add("color_input");
    colorInput.maxLength = 7;
    colorInput.spellcheck = false;

    const copyButton = document.createElement("button");
    copyButton.type = "button";
    copyButton.classList.add("copy_button");
    copyButton.innerHTML = '<i class="bi bi-copy"></i>';
    copyButton.setAttribute("aria-label", "Copy " + data.label + " color");

    const label = document.createElement("span");
    label.classList.add("color_label");
    label.textContent = data.label;

    // Set the initial color.

    let initialColor = data.value;

    if (typeof savedColors[data.id] === "string") {
      const savedColor = normalizeColor(savedColors[data.id]);

      if (savedColor) {
        initialColor = savedColor;
      }
    }

    colorPicker.value = initialColor;
    colorInput.value = initialColor;
    updateKeyboardColor(data.id, initialColor);

    // Update from the color picker.
    colorPicker.addEventListener("input", function () {
      const color = colorPicker.value.toLowerCase();

      colorInput.value = color;
      updateKeyboardColor(data.id, color);
    });

    // Update from the hexadecimal input.
    colorInput.addEventListener("input", function () {
      const color = normalizeColor(colorInput.value);

      if (color) {
        colorPicker.value = color;
        updateKeyboardColor(data.id, color);
      }
    });

    // Restore the last valid value when leaving the input.
    colorInput.addEventListener("blur", function () {
      colorInput.value = keyboardColors[data.id];
    });

    // Copy the hexadecimal value.
    copyButton.addEventListener("click", async function () {
      try {
        await navigator.clipboard.writeText(
          keyboardColors[data.id]
        );
      } catch (error) {
        console.error("Unable to copy color:", error);
        colorInput.focus();
        colorInput.select();
      }
    });

    container.appendChild(colorPicker);
    container.appendChild(colorInput);
    container.appendChild(copyButton);
    container.appendChild(label);

    colorPickup.appendChild(container);
  });
}

// Initial setup.
createColorPickup();


/****************
* RESET COLORS *
****************/

const resetColorsButton = document.getElementById("reset_colors");

// Restore all default keyboard colors.
function resetKeyboardColors() {
  colorDefinitions.forEach(function (data) {
    // Restore the keyboard color.
    updateKeyboardColor(data.id, data.value);

    // Restore the color picker and hexadecimal input.
    const container = colorPickup.querySelector(
      `[data-color-id="${data.id}"]`
    );

    const colorPicker = container.querySelector(".color_picker");
    const colorInput = container.querySelector(".color_input");

    colorPicker.value = data.value;
    colorInput.value = data.value;
  });

  // Remove saved custom colors.
  try {
    localStorage.removeItem("keyboard_colors");
  } catch (error) {
    console.warn("Unable to reset saved keyboard colors:", error);
  }
}

// Reset colors on click.
resetColorsButton.addEventListener("click", resetKeyboardColors);


/******************
* TYPING PREVIEW *
******************/

const typingPreview = document.getElementById("typing_preview");

// Display a character or handle a special key.

/* TYPING PREVIEW */

// Display a character or handle a special key.
function updateTypingPreview(code, character = "") {
  const start = typingPreview.selectionStart;
  const end = typingPreview.selectionEnd;

  if (code === "Backspace") {
    // Delete selected text.
    if (start !== end) {
      typingPreview.setRangeText("", start, end, "start");
    } else if (start > 0) {
      // Delete the previous character.
      typingPreview.setRangeText("", start - 1, start, "start");
    }
  } else if (code === "Delete") {
    if (start !== end) {
      typingPreview.setRangeText("", start, end, "start");
    } else if (start < typingPreview.value.length) {
      typingPreview.setRangeText("", start, start + 1, "start");
    }
  } else {
    let value = "";

    if (code === "Space") {
      value = " ";
    } else if (character.length === 1) {
      value = character;
    }

    if (value) {
      // Replace selected text or insert at the cursor.
      typingPreview.setRangeText(value, start, end, "end");
    }
  }

  // Keep the typing preview focused.
  typingPreview.focus({ preventScroll: true });
}


// Get the character displayed on a virtual key.
function getVirtualCharacter(key, shifted = false, capsLocked = false) {
  const text = key.querySelector(".keycap_text");

  if (!text) {
    return "";
  }

  const characters = Array.from(text.childNodes)
    .filter(function (node) {
      return node.nodeType === Node.TEXT_NODE &&
        node.textContent.trim() !== "";
    })
    .map(function (node) {
      return node.textContent.trim();
    });

  if (characters.length === 0) {
    return "";
  }

  let character = characters[0];

  // AZERTY labels display shifted characters first.
  if (currentLayout === "azerty" && characters.length > 1) {
    if (!shifted) {
      character = characters[characters.length - 1];
    }
  } else if (shifted && characters.length > 1) {
    character = characters[characters.length - 1];
  }

  // Shift and Caps Lock determine letter case.
  if (/^[A-Z]$/.test(character) && shifted === capsLocked) {
    character = character.toLowerCase();
  }

  return character;
}

// Physical keyboard input.
document.addEventListener("keydown", function (event) {
  if (event.ctrlKey || event.metaKey || event.altKey || event.isComposing) {
    return;
  }

  // Ignore inputs used by the configurator.
  if (event.target instanceof HTMLElement) {
    if (event.target.matches("input:not(#typing_preview), select, button")) {
      return;
    }
  }

  // Resolve the character using the selected keyboard layout.
  const key = getKey(event.code);
  let character = event.key;

  if (key && (
    key.classList.contains("alphanumeric") ||
    key.classList.contains("numbers") ||
    event.code === "Backslash"
  )) {
    character = getVirtualCharacter(
      key,
      event.shiftKey,
      event.getModifierState("CapsLock")
    );
  }

  updateTypingPreview(event.code, character);
});

// Virtual keyboard input.
keyboardBackground.addEventListener("pointerdown", function (event) {
  const key = event.target.closest(".keycap");

  if (!key) {
    return;
  }

  const code = key.dataset.code;

  // Handle special keys.
  if (code === "Backspace" || code === "Enter" || code === "Space") {
    updateTypingPreview(code);
    return;
  }

  // Only printable keys insert characters.
  if (
    key.classList.contains("alphanumeric") ||
    key.classList.contains("numbers") ||
    code === "Backslash"
  ) {
    updateTypingPreview(code, getVirtualCharacter(key));
  }
});
