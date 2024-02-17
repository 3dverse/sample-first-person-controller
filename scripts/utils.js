//------------------------------------------------------------------------------
export async function lockPointer() {
    const canvas = document.getElementById("display-canvas");
    canvas.removeEventListener('mousedown', lockPointer);

    canvas.requestPointerLock = (
        canvas.requestPointerLock 
        || canvas.mozRequestPointerLock 
        || canvas.webkitPointerLockElement
    );
    await canvas.requestPointerLock();
    // Focusing the canvas is necessary to make user's inputs work since most
    // user inputs are detected through Web "onkeydown" Event Listeners
    // attached to the canvas.
    canvas.focus();
    canvas.addEventListener('mouseup', unlockPointer);
}

//------------------------------------------------------------------------------
export async function unlockPointer() {
    const canvas = document.getElementById("display-canvas");
    canvas.removeEventListener('mouseup', unlockPointer);
    
    document.exitPointerLock = (
      document.exitPointerLock 
        || document.mozExitPointerLock 
        || document.webkitExitPointerLock
    );
    await document.exitPointerLock();
    canvas.addEventListener('mousedown', lockPointer);
}

//------------------------------------------------------------------------------
export function recoverPitchAndYawFromQuat(quaternion) {
    const eulerAngle = SDK3DVerse.utils.quaternionToEuler(quaternion);

    let yaw, pitch;
    if((eulerAngle[2] < 90) && (eulerAngle[2] > -90)) {
        pitch = eulerAngle[0];
        yaw = 180 + eulerAngle[1];
    } else {
        if(eulerAngle[0] > 0) {
            pitch = eulerAngle[0] - 180;
        } else {
            pitch = eulerAngle[0] + 180;
        }
        yaw = -eulerAngle[1];
    }
    return {yaw:yaw, pitch:pitch}
  }