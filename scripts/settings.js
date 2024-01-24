//------------------------------------------------------------------------------
import {
    characterControllerSceneUUID,
    characterControllerScriptUUID,
    clientData
} from "../config.js";

import { LockPointer } from "./utils.js";

window.EditControl = EditControl;
window.CancelControlKeyEdit = CancelControlKeyEdit;
var specialKeys = {
    " ": "SPACE",
    "\r": "ENTER",
    "\b": "BACKSPACE",
    "\t": "TAB",
    "\x10": "SHIFT",
    "\x11": "CTRL",
    "\x12": "ALT",
    "\x14": "CAPSLOCK",
    "&": "ARROW UP",
    "(": "ARROW DOWN",
    "%": "ARROW LEFT",
    "'": "ARROW RIGHT",
}

//------------------------------------------------------------------------------
export async function InitDeviceDetection() {
    if(navigator.getGamepads().length > 0) {
        await SetDevice('gamepad');
        ResetMouseDetection();
    } else {
        ResetGamepadDetection();
    }
}

//------------------------------------------------------------------------------
async function ResetGamepadDetection() {
    window.addEventListener(
        'gamepadconnected', 
        async () => {
            await SetDevice('gamepad');
            AdjustDeviceSensitivity();
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
            await SetDevice('mouse');
            AdjustDeviceSensitivity();
            ResetGamepadDetection();
        },
        { once: true }
    );
}

//------------------------------------------------------------------------------
export async function AdjustDeviceSensitivity() {
    // We recover the device and the sensitivity from the settings modal inputs.
    const device = GetDevice();
    const sensitivitySetting = GetSensitivity();
    
    // We adjust the sensitivity depending on the device. The joysticks on 
    // gamepads produce less sensitive values than the mouse. The new 
    // sensitivity for gamepad has to be higher. Around ~0.x sensitivity for 
    // mouse and ~x.0 for gamepad within the current asset script for character 
    // controller camera management.
    if ( device ==  "gamepad" ){
        var newSensitivity = sensitivitySetting / 5;
    } else { //if ( device == "mouse" ){
        var newSensitivity = sensitivitySetting / 100;
    }

    // We update the inputs of the Asset Script attached to the character 
    // controller, specifically the sensitivity. Asset Scripts inputs are 
    // accessed through the "script_map" component of an entity.
    clientData.characterController.setScriptInputValues(
        characterControllerScriptUUID, 
        { sensitivity: newSensitivity }
    );

    // This should be removed when setScriptInputValues() is fixed, it's just 
    // that since setScriptInputValues doesn't return a promise, we must make 
    // sure that the script inputs have been updated before reassignign client 
    // to script.
    await SDK3DVerse.engineAPI.findEntitiesByEUID(characterControllerSceneUUID); 

    // Reassign the client's inputs to the Asset Script of the character 
    // controller
    SDK3DVerse.engineAPI.assignClientToScripts(clientData.characterController);  
}

//------------------------------------------------------------------------------
export function GetSensitivity() {
    return document.getElementById("sensitivity-slider").value;
}

//------------------------------------------------------------------------------
export function GetDevice() {
    return document.getElementById("device").value;
}

//------------------------------------------------------------------------------
export async function SetDevice(device) {
    document.getElementById("device").value = device;
}

//------------------------------------------------------------------------------
export async function EditControl(actionButton) {
    ShowControlKeyEditModal();
    
    let controlsCaptureTimeout = setTimeout(() => { 
        controlsCaptureTimeout = null;
        CloseControlKeyEditModal();
    }, 5 * 60 * 1000);

    // The user edits the keys of an action by pressing keys.
    document.addEventListener('keydown', (event) => {
        HandleKeyDownControlEdit(event, actionButton, controlsCaptureTimeout)
    }, { once: true });
}

//------------------------------------------------------------------------------
async function HandleKeyDownControlEdit(event, element, controlsCaptureTimeout, newActionKeys=[]) {
    // If the timeout is null, it means that the timeout has been executed and
    // that the key edition session is over.
    if( !controlsCaptureTimeout ) {
        return;
    }

    // We stop the timeout that saves the key edition after a period of time 
    // since the user desires to change his key selection.
    clearTimeout(controlsCaptureTimeout);

    // If escape is pressed (or triggered through the cancel button), we close
    // the key editing popup without saving the changes.
    if( event.key == "Escape" ){
        CloseControlKeyEditModal();
        return;
    }

    const newKey =  "KEY_" + getLayoutAgnosticKeyCode(event);
    // If a new key is assigned to the action, we add it to the list of keys
    // and display it in the key editing popup.
    if(!(newActionKeys.includes(newKey))) {
        newActionKeys.push(newKey);
        document.getElementById("control-key-input").innerHTML = await generateActionKeysDisplay(newActionKeys);
    }

    // We reset the timeout to let more time to the user to add more keys.
    controlsCaptureTimeout = setTimeout(() => { 
        // Setting the timeout to null allows to know if the timeout has been 
        // executed when HandleKeyDownControlEdit() is called on a keydown event 
        // with the timeout variable as argument. controlsCaptureTimeout will
        // be equal to null.
        controlsCaptureTimeout = null;
        replaceActionKeys(element, newActionKeys);
        CloseControlKeyEditModal();
    }, 3 * 1000);

    // We wait for the next keydown event to continue the key edition and pass
    // controlsCaptureTimeout as argument to detect on the next keydown if the
    // key edition session is over. 
    document.addEventListener('keydown', (event) => { 
        HandleKeyDownControlEdit(
            event, 
            element, 
            controlsCaptureTimeout, 
            newActionKeys)
        },
        { once: true });
} 

//------------------------------------------------------------------------------
async function replaceActionKeys(element, newActionKeys) {
    if(newActionKeys.length == 0) {
        return;
    }

    const editingAction = element.getAttribute("data-action");
    const editingIndex = element.getAttribute("data-keys-id");
    SDK3DVerse.actionMap.values[editingAction][editingIndex] = newActionKeys;
    SDK3DVerse.actionMap.propagate();

    element.innerHTML = await generateActionKeysDisplay(newActionKeys);
}

//------------------------------------------------------------------------------
async function generateActionKeysDisplay(actionKeys) {
    let keysString = '';
    for (const key of actionKeys) {
        keysString += (await getLayoutKeyFromActionKey(key)) + " + ";
    }
    keysString = keysString.slice(0, -3);
    // If multiple keys, keyString will be "Z + Q + ARROW UP" for example and 
    // non keyboard agnostic.
    return keysString;
}

//------------------------------------------------------------------------------
async function getLayoutKeyFromActionKey(actionKey) {
    const key = String.fromCharCode(parseInt(actionKey.replace("KEY_", '')));
    if(Object.keys(specialKeys).includes(key)) {
        return specialKeys[key];
    }

    const numericKey = parseInt(key);
    if(!isNaN(numericKey)) {
        return numericKey;
    }
    return (await getNonLayoutAgnosticKey("Key" + key)).toUpperCase();
}

//------------------------------------------------------------------------------
function getLayoutAgnosticKeyCode(event)
{
    const { code, key } = event;
    if(!code?.startsWith('Key')) {
        return event.keyCode;
    }
    const keyFromCode = code[code.length - 1];
    if(keyFromCode !== key) {
        return keyFromCode.charCodeAt(0);
    }
    return event.keyCode;
}

//------------------------------------------------------------------------------
async function getNonLayoutAgnosticKey(layoutAgnosticKey) {
    const keyboardLayoutMap = await navigator.keyboard.getLayoutMap()
    const nonLayoutAgnosticKey = keyboardLayoutMap.get(layoutAgnosticKey);
    return nonLayoutAgnosticKey ? nonLayoutAgnosticKey : "Unknown Key";
}

//------------------------------------------------------------------------------
export async function LoadControlKeySettings() {
    let keyValueHolders = document.getElementsByClassName("edit-action-keys-button");
    let action, index, keys;
    Array.from(keyValueHolders).forEach(async (element) => {
        action = element.getAttribute("data-action")
        index = element.getAttribute("data-keys-id")
        keys = SDK3DVerse.actionMap.values[action][parseInt(index)];
        element.innerHTML = await generateActionKeysDisplay(keys);
    });
}

//------------------------------------------------------------------------------
async function CancelControlKeyEdit() {
    let event = new KeyboardEvent('keydown', {
        key: 'Escape',
        keyCode: 27,
        which: 27,
        code: 'Escape',
      });
    
    // Dispatching the event instead of closing the modal directly allows to 
    // clean the keydown event listeners related to the control keys edition in 
    // HandleKeyDownControlEdit().
    document.dispatchEvent(event);
}

//------------------------------------------------------------------------------
async function ShowControlKeyEditModal() {
    const editActionModal = document.getElementById("control-key-editor")
    editActionModal.parentNode.classList.add('active');
}

//------------------------------------------------------------------------------
async function CloseControlKeyEditModal() {
    const editActionModal = document.getElementById("control-key-editor")
    editActionModal.parentNode.classList.remove('active');

    const editActionModalInput = document.getElementById("control-key-input")
    editActionModalInput.innerHTML = "";
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
    try {
        await LockPointer();
        SDK3DVerse.enableInputs(); 
    } catch (error) {
        console.error("Pointer lock not available");
    }
}
