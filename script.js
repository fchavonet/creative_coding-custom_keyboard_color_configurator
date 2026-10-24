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


/********************
* KEYBOARD BEHAVIOR *
********************/

const keycap = document.querySelector('.keycap[data-code="Escape"]');

// Press the key.
function pressKey() {
  keycap.classList.add("pressed");
}

// Release the key.
function releaseKey() {
  keycap.classList.remove("pressed");
}

// Physical keyboard events.
document.addEventListener("keydown", function (event) {
  if (event.code === "Escape" && !event.repeat) {
    pressKey();
  }
});

document.addEventListener("keyup", function (event) {
  if (event.code === "Escape") {
    releaseKey();
  }
});

// Mouse and touch events.
keycap.addEventListener("pointerdown", pressKey);
keycap.addEventListener("pointerup", releaseKey);
keycap.addEventListener("pointerleave", releaseKey);
keycap.addEventListener("pointercancel", releaseKey);

// Reset the key when the window loses focus.
window.addEventListener("blur", releaseKey);
