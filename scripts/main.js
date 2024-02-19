//------------------------------------------------------------------------------
import {
  publicToken,
  mainSceneUUID,
  characterControllerSceneUUID,
  spawnPosition
} from "../config.js";

import { lockPointer } from "./utils.js";

import { 
  initDeviceDetection, 
  initControlKeySettings,
  adjustDeviceSensitivity, 
  openSettingsModal
} from "./settings.js";


//------------------------------------------------------------------------------
window.addEventListener("load", initApp);

//------------------------------------------------------------------------------
async function initApp() {
    const canvas = document.getElementById("display-canvas");

    // We can add parameters to the session creation. To make our loading
    // screen more dynamic, we pass callbacks to the onFindingSession, 
    // onStartingStreamer and onLoadingAssets parameters which will be executed
    // at key moment during the session creation/joining.
    const sessionParameters = {
        userToken: publicToken,
        sceneUUID: mainSceneUUID,
        canvas: canvas,
        createDefaultCamera: false,
        startSimulation: "on-assets-loaded",
        onFindingSession: () => changeLoadingInfo("Looking for sessions..."),
        onStartingStreamer: () => changeLoadingInfo("Starting streamer..."),
        onLoadingAssets: () => changeLoadingInfo("Loading assets..."),
    }

    await SDK3DVerse.joinOrStartSession(sessionParameters);

    // To spawn a character controller we need to instantiate the 
    // "characterControllerSceneUUID" subscene into our main scene.
    const characterController = await initFirstPersonController(
        characterControllerSceneUUID
    );

    initDeviceDetection(characterController);
    adjustDeviceSensitivity(characterController);
    
    // Hiding the loading screen once the experience becomes playable.
    hideLoadingScreen();

    initPointerLockEvents(characterController);
    initControlKeySettings();
    handleClientDisconnection();
}

//------------------------------------------------------------------------------
async function initFirstPersonController(charCtlSceneUUID) {
    // To spawn an entity we need to create an EntityTemplate and specify the
    // components we want to attach to it. In this case we only want a scene_ref
    // that points to the character controller scene.
    const playerTemplate = new SDK3DVerse.EntityTemplate();
    playerTemplate.attachComponent("scene_ref", { value: charCtlSceneUUID });
    playerTemplate.attachComponent("local_transform", { position: spawnPosition });
    // Passing null as parent entity will instantiate our new entity at the root
    // of the main scene.
    const parentEntity = null;
    // Setting this option to true will ensure that our entity will be destroyed
    // when the client is disconnected from the session, making sure we don't
    // leave our 'dead' player body behind.
    const deleteOnClientDisconnection = true;
    // We don't want the player to be saved forever in the scene, so we
    // instantiate a transient entity.
    // Note that an entity template can be instantiated multiple times.
    // Each instantiation results in a new entity.
    const playerSceneEntity = await playerTemplate.instantiateTransientEntity(
      "Player",
      parentEntity,
      deleteOnClientDisconnection
    );

    // The character controller scene is setup as having a single entity at its
    // root which is the first person controller itself.
    const firstPersonController = (await playerSceneEntity.getChildren())[0];
    // Look for the first person camera in the children of the controller.
    const children = await firstPersonController.getChildren();
    const firstPersonCamera = children.find((child) =>
      child.isAttached("camera")
    );

    // We need to assign the current client to the first person controller
    // script which is attached to the firstPersonController entity.
    // This allows the script to know which client inputs it should read.
    SDK3DVerse.engineAPI.assignClientToScripts(firstPersonController);

    // Finally set the first person camera as the main camera.
    await SDK3DVerse.setMainCamera(firstPersonCamera);

    return firstPersonController;
}

//------------------------------------------------------------------------------
function changeLoadingInfo(newInfo) {
    document.getElementById("loading-info").innerHTML = newInfo;
}

//------------------------------------------------------------------------------
function hideLoadingScreen() {
    document.getElementById("loading-screen").classList.remove('active');
}

//------------------------------------------------------------------------------
function handleClientDisconnection() {
    // Users are considered inactive after 5 minutes of inactivity and are
    // kicked after 30 seconds of inactivity. Setting an inactivity callback 
    // with a 30 seconds cooldown allows us to open a popup when the user gets
    // disconnected.
    SDK3DVerse.setInactivityCallback(showInactivityPopup);

    // The following does the same but in case the disconnection is 
    // requested by the server.
    SDK3DVerse.notifier.on("onConnectionClosed", showDisconnectedPopup);
}

//------------------------------------------------------------------------------
function showInactivityPopup() {
    document.getElementById("resume").addEventListener('click', closeInactivityPopup);
    document.getElementById("inactivity-modal").parentNode.classList.add('active');
}

//------------------------------------------------------------------------------
function closeInactivityPopup() {
    document.getElementById("resume").removeEventListener('click', closeInactivityPopup);
    document.getElementById("inactivity-modal").parentNode.classList.remove('active');
}

//------------------------------------------------------------------------------
function showDisconnectedPopup() {
    document.getElementById("reload-session").addEventListener('click', () => window.location.reload());
    document.getElementById("disconnected-modal").parentNode.classList.add('active');
}

//------------------------------------------------------------------------------
function initPointerLockEvents(characterController) {
    const canvas = document.getElementById("display-canvas");
    canvas.addEventListener('mousedown', lockPointer);

    // If the user leaves the pointerlock, we open the settings popup and
    // disable their influence over the character controller.
    document.addEventListener('keydown', (event) => {
        if(event.code === 'Escape') {
            SDK3DVerse.disableInputs();
            openSettingsModal(characterController);
        }
    });
    
    // Web browsers have a safety mechanism preventing the pointerlock to be
    // instantly requested after being naturally exited, if the user tries to
    // relock the pointer too quickly, we wait a second before requesting 
    // pointer lock again.
    document.addEventListener('pointerlockerror', async () => {
        if (document.pointerLockElement === null) {
            await new Promise(resolve => setTimeout(resolve, 1000));
            await lockPointer();
            SDK3DVerse.enableInputs();
        }
    });
}