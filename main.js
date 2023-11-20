//------------------------------------------------------------------------------
import { publicToken, sceneUUID, charSceneUUID } from "./config.js";

//------------------------------------------------------------------------------
window.addEventListener("load", InitApp);

//------------------------------------------------------------------------------
async function InitApp() {
  await SDK3DVerse.joinOrStartSession({
    userToken: publicToken,
    sceneUUID: sceneUUID,
    canvas: document.getElementById("display-canvas"),
    maxDimension: 1920,
    connectToEditor: true,
    startSimulation: "on-assets-loaded",
  });

  await InitPlayer(charSceneUUID);
}

//------------------------------------------------------------------------------
async function InitPlayer(characterSceneUUID) {
  const { playerEntity, cameraEntity } = await SpawnPlayer(characterSceneUUID);

  AttachClientToScripts(playerEntity);
  await AttachCameraToViewport(cameraEntity);
}

//------------------------------------------------------------------------------
async function SpawnPlayer(characterControllerSceneUUID) {
  const playerTemplate = new EntityTemplate();
  playerTemplate.attachComponent("scene_ref", {
    value: characterControllerSceneUUID,
  });

  const playerSceneEntity = await playerTemplate.spawn("Player", true);
  const fpcEntity = (await playerSceneEntity.getChildren())[0];
  const children = await SDK3DVerse.engineAPI.getEntityChildren(fpcEntity);
  const cameraEntity = children.find((child) => child.isAttached("camera"));

  return { playerEntity: fpcEntity, cameraEntity };
}

//------------------------------------------------------------------------------
function AttachClientToScripts(playerEntity) {
  const scriptUUID = Object.keys(
    playerEntity.getComponent("script_map").elements
  ).pop();

  SDK3DVerse.engineAPI.attachToScript(playerEntity, scriptUUID);
}

//------------------------------------------------------------------------------
async function AttachCameraToViewport(cameraEntity) {
  const cameraComponent =
    SDK3DVerse.engineAPI.cameraAPI.getDefaultCameraValues();

  const viewports = [
    {
      id: 0,
      left: 0,
      top: 0,
      width: 1,
      height: 1,
      camera: cameraEntity,
      // Use the default_camera_component scene settings for the 3rd person
      // camera of the player
      defaultCameraValues: cameraComponent,
    },
  ];
  await SDK3DVerse.setViewports(viewports);
}

//------------------------------------------------------------------------------
// TO DELETE: This should be provided by the SDK
//------------------------------------------------------------------------------
class EntityTemplate {
  entityTemplate = { debug_name: { value: "" } };

  attachComponent(type, value) {
    if (this.entityTemplate[type] === undefined) {
      SDK3DVerse.utils.resolveComponentDependencies(this.entityTemplate, type);
    }
    this.entityTemplate[type] = value;
  }

  async spawn(instanceName = "unamed entity", unspawnOnUnload = false) {
    this.entityTemplate.debug_name.value = instanceName;
    const entity = await SDK3DVerse.engineAPI.spawnEntity(
      null,
      this.entityTemplate
    );

    if (unspawnOnUnload) {
      window.onbeforeunload = () => {
        SDK3DVerse.engineAPI.deleteEntities([this.entity]);
        return null;
      };
    }

    return entity;
  }
}
