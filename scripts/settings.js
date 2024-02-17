//------------------------------------------------------------------------------
import {
    lockPointer,
    recoverPitchAndYawFromQuat,
    unlockPointer,
} from "./utils.js";

//------------------------------------------------------------------------------
var characterController;
var device = "mouse";
const PHYSICAL_ACTION_KEYS = {
    "LOOK_AROUND": ["LEFT CLICK", "MOUSE MOVE"],
    "MOVE_FORWARD": ["KeyW"],
    "MOVE_BACKWARD": ["KeyS"],
    "MOVE_LEFT": ["KeyA"],
    "MOVE_RIGHT": ["KeyD"],
    "DANCE": ["KeyE"],
    "JUMP": ["SPACE"],
    "SPRINT": ["SHIFT"],
}

// If the browser supports keyboard layout detection, we display layout based 
// keys instead of physical keys.
if ('keyboard' in navigator && 'getLayoutMap' in navigator.keyboard) {
    getActionKey = getLayoutBasedActionKey;
}

//------------------------------------------------------------------------------
export function initControlKeySettings() {
    const actionKeysElements = document.getElementsByClassName("action-keys");
    let action, displayedKeys;
    Array.from(actionKeysElements).forEach(async (element) => {
        action = element.getAttribute("data-action")     
        displayedKeys = '';
        for (const key of PHYSICAL_ACTION_KEYS[action]) {
            displayedKeys += (await getActionKey(key)) + " + ";
        }
        displayedKeys = displayedKeys.slice(0, -3);
        element.innerHTML = displayedKeys;
    });
}

//------------------------------------------------------------------------------
export async function adjustDeviceSensitivity() {
    // We recover the device and the sensitivity from the settings modal inputs.
    const sensitivitySetting = getSensitivity();
    
    // We adjust the sensitivity depending on the device. The joysticks on 
    // gamepads produce less sensitive values than the mouse. The new 
    // sensitivity for gamepad has to be higher. Around ~0.x sensitivity for 
    // mouse and ~x.0 for gamepad within the current asset script for character 
    // controller camera management.
    let newSensitivity;
    if(device ===  "gamepad"){
        newSensitivity = sensitivitySetting / 5;
    } else { //if(device === "mouse"){
        newSensitivity = sensitivitySetting / 100;
    }

    // By default, the camera orientation is reset when calling 
    // "setScriptInputValues()".  We pass the current pitch and yaw of the 
    // camera to the Asset Script to keep the camera orientation.
    // Camera orientation can be obtained from the viewport orientation.
    const activeViewports = SDK3DVerse.engineAPI.cameraAPI.getActiveViewports();
    const viewportOrientation = activeViewports[0].getTransform().orientation;
    const { pitch, yaw } = recoverPitchAndYawFromQuat(viewportOrientation);

    // We update the inputs of the Asset Script attached to the character 
    // controller, specifically the sensitivity. Asset Scripts inputs are 
    // accessed through the "script_map" component of an entity.
    const characterControllerScriptUUID = Object.keys(characterController.getComponent("script_map").elements)[0];
    characterController.setScriptInputValues(
        characterControllerScriptUUID, 
        {
            pitch: pitch,
            yaw: yaw,
            sensitivity: newSensitivity,
        }
    );

    // This should be removed when setScriptInputValues() is fixed, it's just 
    // that since setScriptInputValues doesn't return a promise, we must make 
    // sure that the script inputs have been updated before reassignign client 
    // to script.
    await new Promise((resolve) => setTimeout(resolve, 100));
    
    // Reassign the client's inputs to the Asset Script of the character 
    // controller
    SDK3DVerse.engineAPI.assignClientToScripts(characterController);  
}

//------------------------------------------------------------------------------
function getSensitivity() {
    return document.getElementById("sensitivity-slider").value;
}

//------------------------------------------------------------------------------
function getActionKey(physicalActionKey) {
    return physicalActionKey.replace("Key", "");
}

//------------------------------------------------------------------------------
async function getLayoutBasedActionKey(physicalActionKey) {
    // For none layout affected keys, (Space, Shift, etc.)
    if(!physicalActionKey.includes("Key")) {
        return physicalActionKey;
    }

    const keyboardLayoutMap = await navigator.keyboard.getLayoutMap()
    const layoutActionKey = keyboardLayoutMap.get(physicalActionKey)
    return layoutActionKey ? layoutActionKey.toUpperCase() : "UNKNOWN";
}

//------------------------------------------------------------------------------
export function initDeviceDetection() {
    resetGamepadDetection();
}

//------------------------------------------------------------------------------
function resetGamepadDetection() {
    window.addEventListener(
        'gamepadconnected', 
        () => {
            device = 'gamepad';
            adjustDeviceSensitivity();
            lockPointer();
            resetMouseDetection();
        }, 
        { once: true } 
    );
}

//------------------------------------------------------------------------------
function resetMouseDetection() {
    window.addEventListener(
        'mousemove', 
        () => { 
            device = 'mouse';
            adjustDeviceSensitivity();
            unlockPointer();
            resetGamepadDetection();
        },
        { once: true }
    );
}

//------------------------------------------------------------------------------
export function openSettingsModal() {
    const settingsContainer = document.getElementById("settings-modal").parentNode;
    settingsContainer.classList.add('active');
    const close = document.getElementById("close");
    close.addEventListener('click', closeSettingsModal);
}

//------------------------------------------------------------------------------
export function closeSettingsModal() {
    const settingsContainer = document.getElementById("settings-modal").parentNode;
    settingsContainer.classList.remove('active');
    adjustDeviceSensitivity();
    SDK3DVerse.enableInputs();
    const close = document.getElementById("close");
    close.removeEventListener('click', closeSettingsModal); 
}

//------------------------------------------------------------------------------
export function setCharacterController(value) {
    characterController = value;
}