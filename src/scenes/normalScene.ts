import { CreateSceneClass } from "../createScene";
import * as BABYLON from 'babylonjs';

export class NormalScene implements CreateSceneClass {
    createScene = async (engine: BABYLON.Engine, canvas: HTMLCanvasElement):
        Promise<BABYLON.Scene> => {

        // Create scene
        var scene = new BABYLON.Scene(engine);
        scene.clearColor = new BABYLON.Color4(0, 0, 0, 1);

        // Create camera
        var camera = new BABYLON.FreeCamera("camera", new BABYLON.Vector3(29, 13, 23), scene);
        camera.setTarget(new BABYLON.Vector3(0, 0, 0));
        camera.attachControl(canvas);
        camera.maxZ = 200; //Tweak to see better xd
        camera.minZ = 0.1;

        //Geometry
        var planeH = BABYLON.MeshBuilder.CreatePlane("planeH", { height: 60, width: 60, sideOrientation: 2 });
        planeH.lookAt(new BABYLON.Vector3(0, 1, 0));
        var planeF = BABYLON.MeshBuilder.CreatePlane("planeF", { height: 60, width: 60, sideOrientation: 2 });
        planeF.lookAt(new BABYLON.Vector3(0, 0, -1));
        var planeR = BABYLON.MeshBuilder.CreatePlane("planeR", { height: 60, width: 60, sideOrientation: 2 });
        planeR.lookAt(new BABYLON.Vector3(1, 0, 0));
        // Create some boxes and deactivate lighting (specular color and back faces)
        var boxMaterial = new BABYLON.StandardMaterial("boxMaterail", scene);
        boxMaterial.diffuseTexture = new BABYLON.Texture("./ground.jpg", scene);
        boxMaterial.specularColor = BABYLON.Color3.Black();
        // boxMaterial.emissiveColor = BABYLON.Color3.White();

        var boxMaterial2 = new BABYLON.StandardMaterial("boxMaterail2", scene);
        boxMaterial2.diffuseTexture = new BABYLON.Texture("./ground2.jpg", scene);
        boxMaterial2.specularColor = BABYLON.Color3.Black();

        var boxes: BABYLON.Mesh[] = [];
 
        var sphere = BABYLON.Mesh.CreateSphere("sphere", 5, 20, scene);
        sphere.position = new BABYLON.Vector3(0, 2.5, 20);


        // var sponza = BABYLON.SceneLoader.ImportMeshAsync("", "/assets/", "sponza.babylon"); 
        // var a =   ((await sponza).meshes as unknown as BABYLON.Mesh[]);
        // a.forEach(element => {
        //     // element.scaling(0.5,0.5,0.5);
        //     boxes.push(element); 
        // });
        boxes.push(sphere);
        boxes.push(planeH);
        boxes.push(planeF);
        boxes.push(planeR);
        var angle = 0.02;
        var pivot = new BABYLON.TransformNode("root");
        sphere.parent = pivot;
        scene.registerAfterRender(function () {
            // sphere.rotate(new BABYLON.Vector3(0,1,0), angle, BABYLON.Space.WORLD);
            // pivot.rotate(new BABYLON.Vector3(0,1,0), angle, BABYLON.Space.WORLD);
        });

        // var numBoxes = 2;
        // for (var i = 0; i < numBoxes; i++) {
        //     for (var j = 0; j < numBoxes; j++) {
        //         var box = BABYLON.Mesh.CreateBox("box" + i + " - " + j, 5, scene);
        //         box.position = new BABYLON.Vector3(i * 5, 2.5, j * 5);
        //         box.rotation = new BABYLON.Vector3(i, i * j, j);
        //         boxes.push(box);

        //         // if (j % 2 == 0) box.material = boxMaterial;
        //         // else box.material = boxMaterial2;
        //     }
        // }
        boxes.forEach(element => {
            element.material = boxMaterial;
        });

        var l = new BABYLON.Vector3(0, -1, -1);
        l.normalize();
        var dirLight = new BABYLON.DirectionalLight("dirLight", l, scene);
        
        var shader = "";

        //Normal Texture Pass
        shader = (await fetch("normal.vertex").then(response => response.text())).toString();
        BABYLON.Effect.ShadersStore.normalTextureVertexShader = shader;

        shader = (await fetch("normal.fragment").then(response => response.text())).toString();
        BABYLON.Effect.ShadersStore.normalTextureFragmentShader = shader;

        var normalTextureMaterial = new BABYLON.ShaderMaterial(
            'normal texture material',
            scene,
            'normalTexture',
            {
                attributes: ['position', 'normal', 'uv'],
                uniforms: ['worldViewProjection', 'view', 'worldView', 'world']
            }
        );

        var normalRenderTarget = new BABYLON.RenderTargetTexture('normal texture', canvas, scene, false);
        normalRenderTarget.activeCamera = camera;
        scene.customRenderTargets.push(normalRenderTarget);
        normalRenderTarget.renderList = boxes;

        normalRenderTarget.render();
        normalRenderTarget.setMaterialForRendering(boxes, normalTextureMaterial);

        //SSAO Pass
        var numSamples = 16;
        var kernelSphere = new BABYLON.SmartArray(16);
        //radius around the analyzed pixel. Default: 0.0006
        // var radius = 0.01;
        var radius = 0.01;
        //Bias default: 0.025
        var bias = 0.02;
        //base color of SSAO
        var base = 0.5;
        var kernelSphereData2: number[] = [];
        for (let index = 0; index < numSamples; index++) {
            var sample = new BABYLON.Vector3(
                Math.random() * 2.0 - 1.0,
                Math.random() * 2.0 - 1.0,
                // Math.random());
                Math.random() * 2.0 - 1.0);
            sample.normalize();
            var scale = index / numSamples;
            //improve distribution
            scale = BABYLON.Scalar.Lerp(0.1, 1.0, scale * scale);
            sample.scale(scale);
            //TEST
            sample.x = +sample.x.toFixed(3);
            sample.y = +sample.y.toFixed(3);
            sample.z = +sample.z.toFixed(3);
            //sample.scale(BABYLON.Scalar.RandomRange(0, 1));
            console.log(sample.toString())
            kernelSphere.push(sample);
            kernelSphereData2.push(parseFloat(sample.x.toString()));
            kernelSphereData2.push(parseFloat(sample.y.toString()));
            kernelSphereData2.push(parseFloat(sample.z.toString()));
        }
        var kernelSphereData = kernelSphere.data.map(Number);

        //Noise texture
        var noiseTexture = new BABYLON.Texture("Noise.png", scene);
        noiseTexture.wrapU = BABYLON.Texture.WRAP_ADDRESSMODE;
        noiseTexture.wrapV = BABYLON.Texture.WRAP_ADDRESSMODE;

        //Depth texture
        var depthTexture = scene.enableDepthRenderer(camera, false).getDepthMap(); //false to get linear depht, true to get logarithmic depth

        //SSAO Shader
        
        shader = (await fetch("ssao.fragment").then(response => response.text())).toString();
        BABYLON.Effect.ShadersStore.normalPostProcessFragmentShader = shader;


        var normalPostProcessPass = new BABYLON.PostProcess(
            'Normal Post Process shader',
            'normalPostProcess',
            ['radius', 'numSamples', 'kernelSphere', 'fallOff', 'projection', 'view', 'bias', 'dirLight'],
            ['normalTexture', 'depthTexture', 'noiseTexture'],
            1.0,
            camera,
            BABYLON.Texture.BILINEAR_SAMPLINGMODE,
            engine
        );

        // scene.clearColor = new BABYLON.Color4(0.2, 0.2, 0.2, 1);
        
        //SSAO
        // normalPostProcessPass.onApply = function (effect) {
        //     effect.setFloat("radius", radius);
        //     effect.setInt("numSamples", numSamples);
        //     effect.setArray3("kernelSphere", kernelSphereData2);
        //     effect.setFloat("bias", bias);

        //     effect.setTexture("normalTexture", normalRenderTarget);
        //     effect.setTexture("depthTexture", depthTexture);
        //     effect.setTexture("noiseTexture", noiseTexture);

        //     //we need to set uniform matrices in PostProcess shaders
        //     effect.setMatrix("projection", camera.getProjectionMatrix(true));
        //     effect.setMatrix("view", camera.getViewMatrix(true));

        //     effect.setFloat("near", camera.minZ);
        //     effect.setFloat("far", camera.maxZ);
            
        // }

        //SSDO
        normalPostProcessPass.onApply = function (effect) {
            effect.setFloat("radius", radius);
            effect.setInt("numSamples", numSamples);
            effect.setArray3("kernelSphere", kernelSphereData2);
            effect.setFloat("bias", bias);

            effect.setTexture("normalTexture", normalRenderTarget);
            effect.setTexture("depthTexture", depthTexture);
            effect.setTexture("noiseTexture", noiseTexture);

            //we need to set uniform matrices in PostProcess shaders
            effect.setMatrix("projection", camera.getProjectionMatrix(true));
            effect.setMatrix("view", camera.getViewMatrix(true));

            effect.setFloat("near", camera.minZ);
            effect.setFloat("far", camera.maxZ);
            
            //SSDO
            // effect.setFloat3("dirLight", -dirLight.direction._x, -dirLight.direction._y, -dirLight.direction._z);
        }
        

        //Blur Pass
        //Horizontal & Vertical
        var blurKernelSize = 9;
        var hBlurPass = new BABYLON.BlurPostProcess("Horizontal Blur Post Process", new BABYLON.Vector2(1, 0), blurKernelSize, 0.5, camera);
        var vBlurPass = new BABYLON.BlurPostProcess("Vertical Blur Post Process", new BABYLON.Vector2(0, 1), blurKernelSize, 0.5, camera);
        hBlurPass.apply;
        vBlurPass.apply;

        return scene;
    };
}

export default new NormalScene();