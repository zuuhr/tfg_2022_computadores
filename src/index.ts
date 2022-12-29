import { FreeCamera } from '@babylonjs/core/Cameras/freeCamera';
import { Engine } from '@babylonjs/core/Engines/engine';
import { HemisphericLight } from '@babylonjs/core/Lights/hemisphericLight';
import { Material } from '@babylonjs/core/Materials/material';
import { Vector3 } from '@babylonjs/core/Maths/math.vector';
import { CreateSphere } from '@babylonjs/core/Meshes/Builders/sphereBuilder';
import { Scene } from '@babylonjs/core/scene';
import '@babylonjs/core/scene';
import '@babylonjs/core/Materials/standardMaterial';
import { SceneLoader } from '@babylonjs/core/Loading/sceneLoader';
import '@babylonjs/loaders/glTF'
import * as BABYLON from '@babylonjs/core/Legacy/legacy';
import { DirectionalLight } from '@babylonjs/core/Lights/directionalLight';

// Get the canvas element from the DOM.
const canvas = document.getElementById("renderCanvas") as HTMLCanvasElement;
const engine = new Engine(canvas);
var scene = new BABYLON.Scene(engine);

// This creates and positions a free camera (non-mesh)
var camera = new FreeCamera("camera1", new Vector3(0, 2, 6), scene);
camera.setTarget(new Vector3(0, 1.25, 0));
camera.attachControl(canvas, true);

// This creates a light, aiming 0,1,0 - to the sky (non-mesh)
var topLight = new HemisphericLight("topLight", new Vector3(0, 1, 0), scene);
var bottomLight = new HemisphericLight("bottomLight", new Vector3(0, -1, 0), scene);

// Default intensity is 1. Let's dim the light a small amount
topLight.intensity = 0.7;
bottomLight.intensity = 0.7;

var dirLight = new DirectionalLight("dirLight", new Vector3(1, 1, 0.5), scene);


var sphere = CreateSphere('sphere1', { segments: 16, diameter: 1 }, scene);
sphere.position.y = 2;

SceneLoader.ImportMesh("", "cornellBox.glb", "", scene, function(meshes, materials){
  sphere.material = meshes[3].material;
});
const geometryBuffer = scene.enableGeometryBufferRenderer();
const depthBuffer = scene.enableDepthRenderer(camera, false);

var ssaoPostProcessPass = new BABYLON.PostProcess(
  'SSAO',
  "./shaders/ssao",
  ['projection', 'dirLight'],
  ['depthTex', 'normalTex'],
  1.0,
  camera
);

ssaoPostProcessPass.onApply = function (effect) {
  effect.setTexture("depthTex", geometryBuffer.getGBuffer().textures[0]);
  effect.setTexture("depthTex", depthBuffer.getDepthMap());
  effect.setTexture("normalTex", geometryBuffer.getGBuffer().textures[1]);
  effect.setMatrix("projection", scene.getProjectionMatrix());
  effect.setVector3("dirLight", (Vector3.TransformNormal(dirLight.direction, scene.getViewMatrix())).normalize());
};

// Render every frame
engine.runRenderLoop(() => {
  scene.render();
});