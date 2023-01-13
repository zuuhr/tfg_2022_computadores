import { FreeCamera } from '@babylonjs/core/Cameras/freeCamera';
import { Engine } from '@babylonjs/core/Engines/engine';
import { HemisphericLight } from '@babylonjs/core/Lights/hemisphericLight';
import { Vector3 } from '@babylonjs/core/Maths/math.vector';
import { CreateSphere } from '@babylonjs/core/Meshes/Builders/sphereBuilder';
import '@babylonjs/core/scene';
import '@babylonjs/core/Materials/standardMaterial';
import { SceneLoader } from '@babylonjs/core/Loading/sceneLoader';
import '@babylonjs/loaders/glTF'
import * as BABYLON from '@babylonjs/core/Legacy/legacy';
import { DirectionalLight } from '@babylonjs/core/Lights/directionalLight';
import { Color3, Mesh, PointLight, StandardMaterial } from '@babylonjs/core/Legacy/legacy';

// Get the canvas element from the DOM.
const canvas = document.getElementById("renderCanvas") as HTMLCanvasElement;
const engine = new Engine(canvas);
var scene = new BABYLON.Scene(engine);

// This creates and positions a free camera (non-mesh)
var camera = new FreeCamera("camera1", new Vector3(0, 2, 6), scene);
camera.setTarget(new Vector3(0, 1.25, 0));
camera.attachControl(canvas, true);

// // This creates a light, aiming 0,1,0 - to the sky (non-mesh)
// var topLight = new HemisphericLight("topLight", new Vector3(0, 1, 0), scene);
// var bottomLight = new HemisphericLight("bottomLight", new Vector3(0, -1, 0), scene);

// // Defaulit intensity s 1. Let's dim the light a small amount
// topLight.intensity = 0.7;
// bottomLight.intensity = 0.7;

// var dirLight = new DirectionalLight("dirLight", new Vector3(-3, 1, -0.5), scene);
// var pointLight = new PointLight("pointLight", new Vector3(0, 2.8, 0), scene);
var pointLight = new PointLight("pointLight", new Vector3(0, 1.4, 1), scene);

// Shadow generator
const shadowGenerator = new BABYLON.ShadowGenerator(1024, pointLight);

var emissiveMat = new StandardMaterial("light", scene);
emissiveMat.emissiveColor = Color3.White();

var sphere = CreateSphere('sphere1', { segments: 16, diameter: 1 }, scene);
sphere.position.y = 2;
sphere.position.x = -2;
sphere.receiveShadows = true;
shadowGenerator.addShadowCaster(sphere);

SceneLoader.ImportMesh("", "cornellBox.glb", "", scene, function (meshes, materials) {
  sphere.material = meshes[3].material;
  meshes.forEach(element => {
    shadowGenerator.addShadowCaster(element);
    element.receiveShadows = true;
  });
  // light.000 mesh set to emissive
  meshes[6].material = emissiveMat;
});

const geometryBuffer = scene.enableGeometryBufferRenderer();
const depthBuffer = scene.enableDepthRenderer(camera, false);

var passPostProcess = new BABYLON.PassPostProcess("Scene copy", 1.0, camera);

var ssaoPostProcess = new BABYLON.PostProcess(
  'SSAO',
  "./shaders/ssdoDDP",
  ['projection', 'dirLight'],
  ['depthTex', 'normalTex'],
  1.0,
  camera
);

ssaoPostProcess.onApply = function (effect) {
  effect.setTexture("depthTex", geometryBuffer.getGBuffer().textures[0]);
  effect.setTexture("depthTex", depthBuffer.getDepthMap());
  effect.setTexture("normalTex", geometryBuffer.getGBuffer().textures[1]);
  effect.setMatrix("projection", scene.getProjectionMatrix());
  // effect.setVector3("dirLight", (Vector3.TransformNormal(dirLight.direction, scene.getViewMatrix())).normalize());
  effect.setVector3("pointLight", (Vector3.TransformCoordinates(pointLight.position, scene.getViewMatrix())));
  // effect.setTexture("shadowTex", shadowGenerator.getShadowMap);
};

var kernel = 32.0;
var HBlurPostProcess = new BABYLON.BlurPostProcess("Horizontal blur", new BABYLON.Vector2(1.0, 0), kernel, 1.0, camera);
var VBlurPostProcess = new BABYLON.BlurPostProcess("Vertical blur", new BABYLON.Vector2(0, 1.0), kernel, 1.0, camera);

var combinePostProcess = new BABYLON.PostProcess(
  'Combine',
  "./shaders/combine",
  [],
  ['ssdoTex'],
  1.0,
  camera
);

combinePostProcess.onApply = function (effect) {
  effect.setTextureFromPostProcessOutput("ssdoTex", VBlurPostProcess);
  effect.setTextureFromPostProcessOutput("textureSampler", passPostProcess);
};

// Render every frame
engine.runRenderLoop(() => {
  scene.render();
});