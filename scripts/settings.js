//------------------------------------------------------------------------------
import {
    lockPointer,
    unlockPointer,
} from "./utils.js";

//------------------------------------------------------------------------------
let device = "mouse";
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
// We iterate over the action keys elements and set the DOM Elements from 
// the settings modal to the corresponding keys based on the keyboard layout
// map if available.
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
export async function adjustDeviceSensitivity(characterController) {
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

    // We update the inputs of the Asset Script attached to the character 
    // controller, specifically the sensitivity. Asset Scripts inputs are 
    // accessed through the "script_map" component of an entity.
    const characterControllerScriptUUID = Object.keys(characterController.getComponent("script_map").elements)[0];
    characterController.setScriptInputValues(
        characterControllerScriptUUID, 
        {
            sensitivity: newSensitivity,
        }
    );
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
export function initDeviceDetection(characterController) {
    detectGamepad(characterController);
}

//------------------------------------------------------------------------------
function detectGamepad(characterController) {
    window.addEventListener(
        'gamepadconnected', 
        () => {
            device = 'gamepad';
            adjustDeviceSensitivity(characterController);
            lockPointer();
            detectMouse(characterController);
        }, 
        { once: true } 
    );
}

//------------------------------------------------------------------------------
function detectMouse(characterController) {
    window.addEventListener(
        'mousemove', 
        () => { 
            device = 'mouse';
            adjustDeviceSensitivity(characterController);
            unlockPointer();
            detectGamepad(characterController);
        },
        { once: true }
    );
}

//------------------------------------------------------------------------------
export function openSettingsModal() {
    const settingsContainer = document.getElementById("settings-modal").parentNode;
    settingsContainer.classList.add('active');
}

//------------------------------------------------------------------------------
export function closeSettingsModal(characterController) {
    const settingsContainer = document.getElementById("settings-modal").parentNode;
    settingsContainer.classList.remove('active');
    adjustDeviceSensitivity(characterController);
}