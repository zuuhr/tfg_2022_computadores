import { FreeCamera } from '@babylonjs/core/Cameras/freeCamera';
import { Engine } from '@babylonjs/core/Engines/engine';
import { Vector2, Vector3 } from '@babylonjs/core/Maths/math.vector';
import { CreateSphere } from '@babylonjs/core/Meshes/Builders/sphereBuilder';
import '@babylonjs/core/scene';
import '@babylonjs/core/Materials/standardMaterial';
import { SceneLoader } from '@babylonjs/core/Loading/sceneLoader';
import '@babylonjs/loaders/glTF'
import * as BABYLON from '@babylonjs/core/Legacy/legacy';
import { Color3, Effect, Mesh, PointLight, StandardMaterial } from '@babylonjs/core/Legacy/legacy';

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

// SceneLoader.ImportMesh("", "viking.glb", "", scene);

var noiseTexture = new BABYLON.Texture("Noise.png", scene, false, false, 1);
noiseTexture.wrapU = BABYLON.Texture.WRAP_ADDRESSMODE;
noiseTexture.wrapV = BABYLON.Texture.WRAP_ADDRESSMODE;

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

  console.log(sample.toString());

  kernelSphere.push(parseFloat(sample.x.toString()));
  kernelSphere.push(parseFloat(sample.y.toString()));
  kernelSphere.push(parseFloat(sample.z.toString()));
}

var passPostProcess = new BABYLON.PassPostProcess("Scene copy", 1.0, camera);

var ssaoPostProcess = new BABYLON.PostProcess(
  'SSAO',
  "./shaders/ssdoDDP",
  ['projection', 'dirLight', 'lightColor', 'aoRadius', 'ssdoRadius', 'aoIntensity', 'ssdoIntensity', 'numSamples', 'kernelSphere', 'noiseTiling'],
  ['depthTex', 'normalTex', 'noiseTex'],
  1.0,
  camera
);

ssaoPostProcess.onApply = function (effect) {
  // effect.setTexture("depthTex", geometryBuffer.getGBuffer().textures[0]);
  effect.setTexture("depthTex", depthBuffer.getDepthMap());
  effect.setTexture("normalTex", geometryBuffer.getGBuffer().textures[1]);
  effect.setTexture("noiseTex", noiseTexture);
  effect.setVector2("noiseTiling", new Vector2(canvas.width / 200.0, canvas.height / 200.0));
  effect.setMatrix("projection", scene.getProjectionMatrix());
  effect.setInt("numSamples", numSamples);
  effect.setArray3("kernelSphere", kernelSphere);
  effect.setFloat("aoRadius", 0.1);
  effect.setFloat("ssdoRadius", 0.4);
  effect.setFloat("aoIntensity", 1.0);
  effect.setFloat("ssdoIntensity", 5.0);
  effect.setVector3("pointLight", (Vector3.TransformCoordinates(pointLight.position, scene.getViewMatrix())));
  effect.setVector3("lightColor", new Vector3(lightColor.r, lightColor.g, lightColor.b));
};

// var cocBlur = new BABYLON.CircleOfConfusionPostProcess("COC BLUR", depthBuffer.getDepthMap(), 1, camera );
// cocBlur.focusDistance = 0.5;
// cocBlur.onApply = function {

// }
var kernel = 32.0;
// var dofBlur = new BABYLON.DepthOfFieldBlurPostProcess("DOF BLUR", scene,new BABYLON.Vector2(0, 0), kernel, 1, camera, cocBlur );
// var HBlurPostProcess = new BABYLON.BlurPostProcess("Horizontal blur", new BABYLON.Vector2(1.0, 0), kernel, 1.0, camera);
// var VBlurPostProcess = new BABYLON.BlurPostProcess("Vertical blur", new BABYLON.Vector2(0, 1.0), kernel, 1.0, camera);

// Default = 1.0
var blurWidth = 4.0;
var screenSize = new BABYLON.Vector2(1.0 / canvas.width, 1.0 / canvas.height);

var HGaussianBlurPostProcess = new BABYLON.PostProcess(
  'Horizontal Gaussian Blur',
  "./shaders/gaussianBlur",
  ["screenSize", "direction", "blurWidth"],
  [],
  1.0,
  camera
);

HGaussianBlurPostProcess.onApply = function (effect) {
  effect.setVector2("screenSize", screenSize);
  effect.setVector2("direction", new BABYLON.Vector2(1, 0));
  effect.setFloat("blurWidth", blurWidth);
  effect.setTexture("depthTex", depthBuffer.getDepthMap());
};

var VGaussianBlurPostProcess = new BABYLON.PostProcess(
  'Horizontal Gaussian Blur',
  "./shaders/gaussianBlur",
  ["screenSize", "direction", "blurWidth"],
  [],
  1.0,
  camera
  );
  
  VGaussianBlurPostProcess.onApply = function (effect) {
    effect.setVector2("screenSize", screenSize);
    effect.setVector2("direction", new BABYLON.Vector2(0, 1));
    effect.setFloat("blurWidth", blurWidth);
    effect.setTexture("depthTex", depthBuffer.getDepthMap());
};

var combinePostProcess = new BABYLON.PostProcess(
  'Combine',
  "./shaders/combine",
  [],
  ['ssdoTex'],
  1.0,
  camera
);

combinePostProcess.onApply = function (effect) {
  effect.setTextureFromPostProcessOutput("ssdoTex", VGaussianBlurPostProcess);
  effect.setTextureFromPostProcessOutput("textureSampler", passPostProcess);
};

// Render every frame
engine.runRenderLoop(() => {
  scene.render();

  // kernelSphere = [];
  // for (let index = 0; index < numSamples; index++) {
  //   var sample = new BABYLON.Vector3(
  //       Math.random() * 2.0 - 1.0,
  //       Math.random() * 2.0 - 1.0,
  //       Math.random());
  //   sample.normalize();
  //   var scale = index / numSamples;
  //   //improve distribution
  //   scale = BABYLON.Scalar.Lerp(0.1, 1.0, scale * scale);
  //   sample.scale(scale);
  
  //   sample.x = +sample.x.toFixed(3);
  //   sample.y = +sample.y.toFixed(3);
  //   sample.z = +sample.z.toFixed(3);
  
  //   kernelSphere.push(parseFloat(sample.x.toString()));
  //   kernelSphere.push(parseFloat(sample.y.toString()));
  //   kernelSphere.push(parseFloat(sample.z.toString()));
  // }
  // ssaoPostProcess.updateEffect("", ["kernelSphere"], [], null, function (effect) {  effect.setArray3("kernelSphere", kernelSphere);});
});