/******************************
* RESPONSIVE WARNING BEHAVIOR *
******************************/

const responsiveWarning = document.getElementById("responsive-warning");
// Enable/disable responsive warning.
const responsiveDesign = false;
// Mobile width limit.
const threshold = 768;

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


/********************
* KEYBOARD BEHAVIOR *
********************/

// Press a key.
function pressKey(key) {
  if (key) {
    key.classList.add("pressed");
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

// Load a keyboard layout from a local JSON file.
async function loadKeyboard(layout) {
  try {
    const response = await fetch(`./layouts/${layout}.json`);

    if (!response.ok) {
      throw new Error(`Failed to load the ${layout} layout.`);
    }

    const keyboardLayout = await response.json();

    createKeyboard(keyboardLayout);
    initializeKeycapEvents();
    resizeKeyboard();
  } catch (error) {
    console.error("Keyboard loading error:", error);
  }
}

// Default layout.
loadKeyboard("qwerty");
