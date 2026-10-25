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
  const AudioContextClass = window.AudioContext || window.webkitAudioContext;

  if (!AudioContextClass) {
    console.warn("Web Audio API is not supported by this browser.");
    return;
  }

  try {
    const response = await fetch(soundPath);

    if (!response.ok) {
      throw new Error("Failed to load keyboard sound.");
    }

    const buffer = await response.arrayBuffer();
    soundContext = new AudioContextClass();
    soundBuffer = await soundContext.decodeAudioData(buffer);

    // Keep the volume comfortable during rapid typing.
    soundGain = soundContext.createGain();
    soundGain.gain.value = 0.3;
    soundGain.connect(soundContext.destination);
  } catch (error) {
    console.error("Keyboard sound loading error:", error);
  }
}

// Play a new sound for each key press.
function playSound() {
  if (!soundEnabled || !soundContext || !soundBuffer || !soundGain) {
    return;
  }

  if (soundContext.state === "suspended") {
    soundContext.resume().catch(function (error) {
      console.warn("Unable to resume keyboard sound:", error);
    });
  }

  const source = soundContext.createBufferSource();
  source.buffer = soundBuffer;
  source.connect(soundGain);
  source.start(0);
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
loadSound();

/********************
* KEYBOARD BEHAVIOR *
********************/

// Press a key.
function pressKey(key) {
  if (key && !key.classList.contains("pressed")) {
    key.classList.add("pressed");
    playSound();
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
function getVirtualCharacter(key) {
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

  // Original AZERTY labels display shifted characters first.
  if (currentLayout === "azerty" && characters.length > 1) {
    character = characters[characters.length - 1];
  }

  // Use lowercase letters by default.
  if (/^[A-Z]$/.test(character)) {
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

  updateTypingPreview(event.code, event.key);
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
