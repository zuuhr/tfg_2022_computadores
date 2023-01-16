import { FreeCamera } from '@babylonjs/core/Cameras/freeCamera';
import { Engine } from '@babylonjs/core/Engines/engine';
import { Vector3 } from '@babylonjs/core/Maths/math.vector';
import { CreateSphere } from '@babylonjs/core/Meshes/Builders/sphereBuilder';
import '@babylonjs/core/scene';
import '@babylonjs/core/Materials/standardMaterial';
import { SceneLoader } from '@babylonjs/core/Loading/sceneLoader';
import '@babylonjs/loaders/glTF'
import * as BABYLON from '@babylonjs/core/Legacy/legacy';
import { Color3, Mesh, PointLight, StandardMaterial } from '@babylonjs/core/Legacy/legacy';

// Get the canvas element from the DOM.
const canvas = document.getElementById("renderCanvas") as HTMLCanvasElement;
const engine = new Engine(canvas);
var scene = new BABYLON.Scene(engine);

// This creates and positions a free camera (non-mesh)
var camera = new FreeCamera("camera1", new Vector3(0, 2, 6), scene);
camera.setTarget(new Vector3(0, 1.25, 0));
camera.attachControl(canvas, true);

var pointLight = new PointLight("pointLight", new Vector3(0, 2.8, 0), scene);
var lightColor = new Color3(1.0, 1.0, 1.0);
pointLight.diffuse = lightColor;

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

var numSamples = 16;
var kernelSphere: number[] = [];
for (let index = 0; index < numSamples; index++) {
  var sample = new BABYLON.Vector3(
      Math.random() * 2.0 - 1.0,
      Math.random() * 2.0 - 1.0,
      Math.random());
  sample.normalize();
  var scale = index / numSamples;
  //improve distribution
  scale = BABYLON.Scalar.Lerp(0.1, 1.0, scale * scale);
  sample.scale(scale);

  sample.x = +sample.x.toFixed(3);
  sample.y = +sample.y.toFixed(3);
  sample.z = +sample.z.toFixed(3);

  console.log(sample.toString())

  kernelSphere.push(parseFloat(sample.x.toString()));
  kernelSphere.push(parseFloat(sample.y.toString()));
  kernelSphere.push(parseFloat(sample.z.toString()));
}

var passPostProcess = new BABYLON.PassPostProcess("Scene copy", 1.0, camera);

var ssaoPostProcess = new BABYLON.PostProcess(
  'SSAO',
  "./shaders/ssdoDDP",
  ['projection', 'dirLight', 'lightColor', 'aoRadius', 'ssdoRadius', 'aoIntensity', 'ssdoIntensity', 'numSamples', 'kernelSphere'],
  ['depthTex', 'normalTex'],
  1.0,
  camera
);

ssaoPostProcess.onApply = function (effect) {
  effect.setTexture("depthTex", geometryBuffer.getGBuffer().textures[0]);
  effect.setTexture("depthTex", depthBuffer.getDepthMap());
  effect.setTexture("normalTex", geometryBuffer.getGBuffer().textures[1]);
  effect.setMatrix("projection", scene.getProjectionMatrix());
  effect.setInt("numSamples", numSamples);
  effect.setArray3("kernelSphere", kernelSphere);
  effect.setFloat("aoRadius", 0.1);
  effect.setFloat("ssdoRadius", 0.15);
  effect.setFloat("aoIntensity", 10.0);
  effect.setFloat("ssdoIntensity", 20.0);
  effect.setVector3("pointLight", (Vector3.TransformCoordinates(pointLight.position, scene.getViewMatrix())));
  effect.setVector3("lightColor", new Vector3(lightColor.r, lightColor.g, lightColor.b));
};

var kernel = 64.0;
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