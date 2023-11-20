# First Person Controller

![First Person Character Controller](https://github.com/3dverse/sample-first-person-controller/blob/main/screenshot.png?raw=true)

## Try it out

[Try it out](https://3dverse.github.io/sample-first-person-controller/)

## Description

Simple first person template application with character and camera controller. Character can be idle, walk, run, jump and emote depending on user inputs.

Functions with gamepad and mouse/keyboard.

Multiplayer.

### Controls

|             | Gamepad        | Mouse/Keyboard |
| ----------- | -------------- | -------------- |
| Move around | Left Joystick  | WASD           |
| Look around | Right Joystick | LMB            |
| Run         | Right Trigger  | Shift          |
| Jump        | A              | Spacebar       |
| Emote       | Y              | E              |

# How does it work?

Every client that runs this application will either start a new session of the scene named 'Main Scene', or join an ongoing session if there is one running already. After 'Main Scene' is opened and the physics simulation is started, the application spawns the character. Every new client will appear as a character in the scene. For the best experience, limit the number of players to a maximum of 4.

## Assets inside

/Public

- Main Scene: `scene` containing the level that your character will move in. The level is physics-ready, with colliders around all of the meshes.
- Character Controller: `scene` containing the character controller set up, referencing the character model, the animation graph, and the first-person controller script.
- First Person Controller: `script` containing character controller and camera controller movement logic. Also contains logic to trigger states in the animation graph.
- AG_Locomotion: `animation graph` containing logic to go from idle to locomotion to jump to emote states

/X3DV_Droid

- X3DV_Droid: `scene` containing with the animated model of the 3dverse bot named X3DV_Droid
- SKM_X3DV_Droid: skinned `mesh` of X3DV_Droid
- SK_X3DV_Droid: `skeleton` of X3DV_Droid
- AS_X3DV_Droid: `animation set` of X3DV_Droid. Gathers the animations found in the /X3DV_Droid/Animations file and associates them to nodes in the animation graph
- /Materials contains `material`s of X3DV_Droid
- /Animations contains `animation`s of X3DV_Droid

/Level Design

- SM_Cube: `mesh` of a cube that is used to create the level in 'Main Scene'
- 4 `material`s titled as 'MAT_LD\_\<COLOR\>' that are used to create the level in 'Main Scene'

## Run it locally

Replace the following values in [config.js](https://github.com/3dverse/sample-first-person-controller/blob/main/config.js):

- '%YOUR_PUBLIC_TOKEN%' by the public token of your application found in the "API Access" section.
- '%YOUR_MAIN_SCENE_UUID%' by the UUID of the main scene generated in the Public folder of the "Asset browser" section.
- '%YOUR_CHARACTER_CONTROLLER_SCENE_UUID%' by the UUID of the character controller scene generated in the Public folder of the "Asset browser" section.

The application is a static frontend that can be served by any web server of your convenience.

### Node

You can use the [serve](https://www.npmjs.com/package/serve) package:

```
npx serve
```

### Python

You can use the [http.serve](https://docs.python.org/3/library/http.server.html) command:

```
python -m http.server
```

Now open your web browser at the url indicated by your server (http://localhost:XXXX) to run your application.

## What's next

### View and edit with Scene Editor

While your application is running, navigate to "Sessions" and join the ongoing session of your application.

You have now joined the application's session in the Scene Editor, where you can view and live edit your application.

### Edit with Animation Graph Editor

Open your animation graph and try playing with its logic using the animations found in /X3DV_Droid/Animations.

Change the animations that are referenced in the animation set entries, or affect the playback speed of an Animation Sample node.

After publishing, modifications in the animation graph can be seen live in your sessions.

This allows you to work on your animation graph while your application is running and seeing the changes in real time.

For information about how to edit the animation graph and skeletal animation in 3dverse, [see here](https://3dverse.com/docs/deep-dive/skeletal-animation/).

### Replace X3DV_Droid with your own character model

Upload your skinned model in the Asset Browser.

Upload some idle, walk, run, jump and optionally, emote animations.

If you're uploading the animations in separate files, specify your model's skeleton as the skeleton to use in the conversion process.

Open the 'AG_Locomotion' animation graph in the Animation Graph Editor.

Create a new animation set in the Animation Set Editor tab and call it 'AS\_\<MyCharacterName\>'.

Drag your own model's animations to match the animation set's entries (idle, walk, run, etc.).

Open your model's scene and attach 'AG_Locomotion' and 'AS\_\<MyCharacterName\>' to the animation controller component.

In the 'Character Controller' scene, replace the X3DV_Droid entity by an entity referencing your model's scene.

Set the First-Person Controller script input named 'AnimationController' to the entity coming from your model's scene that has the animation controller component.

Enable debug lines and if needed, adjust capsule geometry so that it fits your character, and adjust the camera's local transform so that it's in front of your character's face.

Run your application.

The character should now be your model.
