//------------------------------------------------------------------------------
export async function LockPointer() {
    const canvas = document.getElementById("display-canvas");
    canvas.requestPointerLock = (
      canvas.requestPointerLock 
      || canvas.mozRequestPointerLock 
      || canvas.webkitPointerLockElement
    );
    await canvas.requestPointerLock();
    // Focusing the canvas is necessary to make user's inputs work since most
    // user inputs are detected through Web "onkeydown" Event Listeners attached
    // to the canvas.
    canvas.focus();
}