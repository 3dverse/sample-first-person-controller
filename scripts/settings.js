//------------------------------------------------------------------------------
import {
    characterControllerSceneUUID,
} from "../config.js";

import {
    LockPointer,
    RecoverPitchAndYawFromQuat,
    UnlockPointer
} from "./utils.js";

//------------------------------------------------------------------------------
var device = "mouse";
const PHYSICAL_ACTION_KEYS = {
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
    GetActionKey = GetLayoutBasedActionKey;
}

//------------------------------------------------------------------------------
function GetActionKey(physicalActionKey) {
    return physicalActionKey.replace("Key", "");
}

//------------------------------------------------------------------------------
async function GetLayoutBasedActionKey(physicalActionKey) {
    // For none layout affected keys, (Space, Shift, etc.)
    if(!physicalActionKey.includes("Key")) {
        return physicalActionKey;
    }

    const keyboardLayoutMap = await navigator.keyboard.getLayoutMap()
    const layoutActionKey = keyboardLayoutMap.get(physicalActionKey)
    return layoutActionKey ? layoutActionKey.toUpperCase() : "UNKNOWN";
}

//------------------------------------------------------------------------------
export async function InitControlKeySettings() {
    let actionKeysElements = document.getElementsByClassName("action-keys");
    let action, displayedKeys;
    Array.from(actionKeysElements).forEach(async (element) => {
        action = element.getAttribute("data-action")     
        displayedKeys = '';
        for (const key of PHYSICAL_ACTION_KEYS[action]) {
            displayedKeys += (await GetActionKey(key)) + " + ";
        }
        displayedKeys = displayedKeys.slice(0, -3);
        element.innerHTML = displayedKeys;
    });
}

//------------------------------------------------------------------------------
export async function AdjustDeviceSensitivity() {
    // We recover the device and the sensitivity from the settings modal inputs.
    const sensitivitySetting = GetSensitivity();
    
    // We adjust the sensitivity depending on the device. The joysticks on 
    // gamepads produce less sensitive values than the mouse. The new 
    // sensitivity for gamepad has to be higher. Around ~0.x sensitivity for 
    // mouse and ~x.0 for gamepad within the current asset script for character 
    // controller camera management.
    let newSensitivity;
    if ( device ===  "gamepad" ){
        newSensitivity = sensitivitySetting / 5;
    } else { //if ( device === "mouse" ){
        newSensitivity = sensitivitySetting / 100;
    }

    // By default, the camera orientation is reset when calling 
    // "setScriptInputValues()".  We pass the current pitch and yaw of the 
    // camera to the Asset Script to keep the camera orientation.
    // Camera orientation can be obtained from the viewport orientation.
    const activeViewports = SDK3DVerse.engineAPI.cameraAPI.getActiveViewports();
    const viewportOrientation = activeViewports[0].getTransform().orientation;
    const { pitch, yaw } = RecoverPitchAndYawFromQuat(viewportOrientation);

    // We update the inputs of the Asset Script attached to the character 
    // controller, specifically the sensitivity. Asset Scripts inputs are 
    // accessed through the "script_map" component of an entity.
    const characterControllerScriptUUID = Object.keys(window.characterController.getComponent("script_map").elements)[0];
    window.characterController.setScriptInputValues(
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
    SDK3DVerse.engineAPI.assignClientToScripts(window.characterController);  
}

//------------------------------------------------------------------------------
function GetSensitivity() {
    return document.getElementById("sensitivity-slider").value;
}

//------------------------------------------------------------------------------
export function InitDeviceDetection() {
    ResetGamepadDetection();
}

//------------------------------------------------------------------------------
async function ResetGamepadDetection() {
    window.addEventListener(
        'gamepadconnected', 
        async () => {
            device = 'gamepad';
            AdjustDeviceSensitivity();
            LockPointer();
            ResetMouseDetection();
        }, 
        { once: true } 
    );
}

//------------------------------------------------------------------------------
async function ResetMouseDetection() {
    window.addEventListener(
        'mousemove', 
        async ()=> { 
            device = 'mouse';
            AdjustDeviceSensitivity();
            UnlockPointer();
            ResetGamepadDetection();
        },
        { once: true }
    );
}

//------------------------------------------------------------------------------
export async function OpenSettingsModal() {
    const settingsContainer = document.getElementById("settings-modal").parentNode;
    settingsContainer.classList.add('active');
    const close = document.getElementById("close");
    close.addEventListener('click', CloseSettingsModal);
}

//------------------------------------------------------------------------------
export async function CloseSettingsModal() {
    const settingsContainer = document.getElementById("settings-modal").parentNode;
    settingsContainer.classList.remove('active');
    AdjustDeviceSensitivity();
    SDK3DVerse.enableInputs();
    const close = document.getElementById("close");
    close.removeEventListener('click', CloseSettingsModal); 
}