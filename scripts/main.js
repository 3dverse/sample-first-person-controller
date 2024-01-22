//------------------------------------------------------------------------------
import {
  publicToken,
  mainSceneUUID,
  characterControllerSceneUUID,
  clientData,
} from "../config.js";

import { LockPointer } from "./utils.js";

import { OpenSettingsModal, AdjustDeviceSensitivity, InitDeviceDetection, LoadControlKeySettings } from "./settings.js";

//------------------------------------------------------------------------------
window.addEventListener("load", InitApp);

//------------------------------------------------------------------------------
async function InitApp() {

  // Recovers informations from the local storage in case the user tries to
  // join a session he got kicked from or force a new session creation.
  const connectionMode = localStorage.getItem("connectionMode");
  localStorage.removeItem("connectionMode");

  let canvas = document.getElementById("display-canvas");

  // We can add parameters to the session creation. To make our loading
  // screen more dynamic, we pass callbacks to the onFindingSession, 
  // onStartingStreamer and onLoadingAssets parameters which will be executed
  // at key moment during the session creation/joining.
  let sessionParameters = {
      userToken: publicToken,
      sceneUUID: mainSceneUUID,
      canvas: canvas,
      createDefaultCamera: false,
      startSimulation: "on-assets-loaded",
      onFindingSession: () => ChangeLoadingInfo("Looking for sessions..."),
      onStartingStreamer: () => ChangeLoadingInfo("Starting streamer..."),
      onLoadingAssets: () => ChangeLoadingInfo("Loading assets..."),
  }

  // Depending the connection mode choosen by the user, we either create a new
  // session or try to join an existing one.
  if(connectionMode === "create-session"){
      await SDK3DVerse.startSession(sessionParameters);
  } else { //connectionMode === null or "rejoin"
      // If the user tries to rejoin the session he was previously in, we
      // recover its session id from the local storage and adds it to the
      // session parameters.
      sessionParameters.sessionId = localStorage.getItem("sessionId");
      localStorage.removeItem("sessionId");
      try{
          await SDK3DVerse.joinOrStartSession(sessionParameters);
      } catch (error) {
          // If the previous session has been closed or that the user tries 
          //to join a random session among the existing ones, we remove the 
          // session id from the session parameters.
          delete sessionParameters.sessionId;
          await SDK3DVerse.joinOrStartSession(sessionParameters);
      }
  }

  // We store the current session id in the clientData object.
  clientData.sessionId = SDK3DVerse.webAPI.sessionId;

  // To spawn a character controller and store it in the clientData object
  // for easier access.
  clientData.characterController = await InitFirstPersonController(
      canvas,
      characterControllerSceneUUID
  );
  
  InitDeviceDetection();
  AdjustDeviceSensitivity();
  
  // Hiding the loading screen once the experience becomes playable.
  HideLoadingScreen();
  InitPointerLockEvents();
  HandleClientDisconnection();
  
  LoadControlKeySettings();
}

//------------------------------------------------------------------------------
async function InitFirstPersonController(canvas, charCtlSceneUUID) {
  // To spawn an entity we need to create an EntityTemplate and specify the
  // components we want to attach to it. In this case we only want a scene_ref
  // that points to the character controller scene.
  const playerTemplate = new SDK3DVerse.EntityTemplate();
  playerTemplate.attachComponent("scene_ref", { value: charCtlSceneUUID });

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
  SDK3DVerse.setMainCamera(firstPersonCamera);
  
  // We disable the inputs until the pointer is locked. Pointer can't be 
  // locked before a user input.
  SDK3DVerse.disableInputs()
  canvas.addEventListener('click', () => { LockPointer(); SDK3DVerse.enableInputs()});

  // By default camera controls require a click and drag. Since this is a 
  // first person experience, we remove the click requirement.
  SetFirstPersonCameraControls();

  return firstPersonController;
}

//------------------------------------------------------------------------------
async function SetFirstPersonCameraControls(canvas){
  // We remove the required click for the camera actions so that only mouse
  // movements remain.
  SDK3DVerse.actionMap.values["LOOK_LEFT"][0] = ["MOUSE_AXIS_X_POS"];
  SDK3DVerse.actionMap.values["LOOK_RIGHT"][0] = ["MOUSE_AXIS_X_NEG"];
  SDK3DVerse.actionMap.values["LOOK_DOWN"][0] = ["MOUSE_AXIS_Y_NEG"];
  SDK3DVerse.actionMap.values["LOOK_UP"][0] = ["MOUSE_AXIS_Y_POS"];
  SDK3DVerse.actionMap.propagate();
};

//------------------------------------------------------------------------------
async function ChangeLoadingInfo(newInfo) {
  document.getElementById("loading-info").innerHTML = newInfo;
}

//------------------------------------------------------------------------------
async function HideLoadingScreen() {
  document.getElementById("loading-screen").classList.remove('active');
}

//------------------------------------------------------------------------------
async function HandleClientDisconnection() {
  // Users are considered inactive after 5 minutes of inactivity and are
  // kicked after 30 seconds of inactivity. Setting an inactivity callback 
  // with a 30 seconds cooldown allows us to open a popup when the user gets
  // disconnected.
  SDK3DVerse.setInactivityCallback(() => {
      setTimeout(() => { 
          showDisconnectedPopup() 
      }, 30 * 1000); 
  });

  // The following does the same but in case the disconnection is 
  // requested by the server.
  SDK3DVerse.notifier.on("onConnectionClosed", () => { 
      SDK3DVerse.setInactivityCallback(()=>{});
      showDisconnectedPopup()
  });

  document.getElementById("rejoin-session").addEventListener('click', rejoinSession);
  document.getElementById("create-new-session").addEventListener('click', createNewSession);
}

//------------------------------------------------------------------------------
async function showDisconnectedPopup() {
  document.getElementById("disconnected-modal").parentNode.classList.add('active');
}

//------------------------------------------------------------------------------
async function rejoinSession() {
  localStorage.setItem("connectionMode", "rejoin-session");
  localStorage.setItem("sessionId", clientData.sessionId);
  window.location.reload()
}

//------------------------------------------------------------------------------
async function createNewSession() {
  localStorage.setItem("connectionMode", "create-session");
  window.location.reload()
}


//------------------------------------------------------------------------------
async function InitPointerLockEvents() {
  // If the user leaves the pointerlock, we open the settings popup and
  // disable his influence over the character controller.
  document.addEventListener('pointerlockchange', () => {
      if (document.pointerLockElement === null) {
          SDK3DVerse.disableInputs();
          OpenSettingsModal();
      }
  });
  
  // Web browsers have a safety mechanism preventing the pointerlock to be
  // instantly requested after being naturally exited, if the user tries to
  // relock the pointer too quickly, we wait a second before requesting 
  // pointer lock again.
  document.addEventListener('pointerlockerror', async () => {
      if (document.pointerLockElement === null) {
          await new Promise(resolve => setTimeout(resolve, 1000));
          await LockPointer();
          SDK3DVerse.enableInputs();
      }
  });
}