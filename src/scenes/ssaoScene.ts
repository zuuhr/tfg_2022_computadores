import { CreateSceneClass } from "../createScene";
import * as BABYLON from 'babylonjs';
import "./shaders/base.fragment.fx"
import "./shaders/ssao.fragment.fx"
// import "./shaders/ssdo.fragment.fx"

export class SSAOScene implements CreateSceneClass {

    createScene = async (engine: BABYLON.Engine, canvas: HTMLCanvasElement):
        Promise<BABYLON.Scene> => {
        // Create scene
        var scene = new BABYLON.Scene(engine);
        scene.clearColor = new BABYLON.Color4(0.2, 0.2, 0.2, 1);

        // Create camera
        var camera = new BABYLON.FreeCamera("camera", new BABYLON.Vector3(29, 13, 23), scene);
        camera.setTarget(new BABYLON.Vector3(0, 0, 0));
        camera.attachControl(canvas);

        // Create some boxes and deactivate lighting (specular color and back faces)
        var boxMaterial = new BABYLON.StandardMaterial("boxMaterail", scene);
        boxMaterial.diffuseTexture = new BABYLON.Texture("./ground.jpg", scene);
        boxMaterial.specularColor = BABYLON.Color3.Black();
        // boxMaterial.emissiveColor = BABYLON.Color3.White();

        var boxMaterial2 = new BABYLON.StandardMaterial("boxMaterail2", scene);
        boxMaterial2.diffuseTexture = new BABYLON.Texture("./ground2.jpg", scene);
        boxMaterial2.specularColor = BABYLON.Color3.Black();

        for (var i = 0; i < 10; i++) {
            for (var j = 0; j < 10; j++) {
                var box = BABYLON.Mesh.CreateBox("box" + i + " - " + j, 5, scene);
                box.position = new BABYLON.Vector3(i * 5, 2.5, j * 5);
                box.rotation = new BABYLON.Vector3(i, i * j, j);

                if (j % 2 == 0) box.material = boxMaterial;
                else box.material = boxMaterial2;
            }
        }


        var dirLight = new BABYLON.DirectionalLight("dirLight", new BABYLON.Vector3(0, -1, -1), scene);
        // scene.ambientColor = new BABYLON.Color3(0.9, 1, 1);

        var ratios = {
            ssaoRatio: 0.5, 
            combineRatio: 1.0,
            ssdoRatio: 0.5
        };

        // preSSAO variables
        var depthTexture = scene.enableDepthRenderer().getDepthMap(); // Force depth renderer "on"
        var gBufferPostProcess = new BABYLON.PassPostProcess("gBufferPostProcess", ratios.ssaoRatio, camera, BABYLON.Texture.TRILINEAR_SAMPLINGMODE, engine);

        // SSAO variables
        var firstUpdate = true;
        var ssaoFallOff = 0.000001;
        var ssaoArea = 0.0075;
        var ssaoRadius = 0.0001;
        var ssaoTotalStrength = 1.0;
        var ssaoBase = 0.5;
        var numSamples = 16;
        var samplesFactor = 1.0 / numSamples;

        //Generate random dome
        // var kernelSphere = new BABYLON.SmartArray(16);
        // for (let index = 0; index < numSamples; index++) {
        //     var sample = new BABYLON.Vector3(
        //         Math.random() * 2.0 - 1.0,
        //         Math.random() * 2.0 - 1.0,
        //         Math.random());
        //     sample.normalize();
        //     var scale = index / numSamples;
        //     //improve distribution
        //     BABYLON.Scalar.Lerp(0.1, 1.0, scale * scale);
        //     sample.scale(scale);
        //     //sample.scale(BABYLON.Scalar.RandomRange(0, 1));
        //     kernelSphere.push(sample);
        // }
        // var kernelSphereData = kernelSphere.data.map(Number);

        
        var kernelSphereData = [
            0.5381, 0.1856, -0.4319,
            0.1379, 0.2486, 0.4430,
            0.3371, 0.5679, -0.0057,
            -0.6999, -0.0451, -0.0019,
            0.0689, -0.1598, -0.8547,
            0.0560, 0.0069, -0.1843,
            -0.0146, 0.1402, 0.0762,
            0.0100, -0.1924, -0.0344,
            -0.3577, -0.5301, -0.4358,
            -0.3169, 0.1063, 0.0158,
            0.0103, -0.5869, 0.0046,
            -0.0897, -0.4940, 0.3287,
            0.7119, -0.0154, -0.0918,
            -0.0533, 0.0596, -0.5411,
            0.0352, -0.0631, 0.5460,
            -0.4776, 0.2847, -0.0271
        ];
        var randomTexture = this._createRandomTexture(scene);

        // var postProcess = new BABYLON.PostProcess("s", "base", [], [], 0.5, camera,
        //     BABYLON.Texture.BILINEAR_SAMPLINGMODE,
        //     scene.getEngine(),
        //     false,
        // );


        // 
        var ssdoPostProcess = new BABYLON.PostProcess("occlusion", "ssao",
        [
            "sampleSphere", "samplesFactor", "randTextureTiles", "totalStrength", "radius",
            "area", "fallOff", "base", "range", "viewport"
        ],
        ["randomSampler"],
            ratios.ssaoRatio,
            camera,
            BABYLON.Texture.BILINEAR_SAMPLINGMODE,
            scene.getEngine(),
            false,
        );
        
        ssdoPostProcess.restoreDefaultInputTexture();
        ssdoPostProcess.onApply = function (effect) {
            if (firstUpdate) {
                effect.setArray3("kernelSphere", kernelSphereData);
                //We then create a 4x4 texture that holds the random rotation vectors; make sure to set its wrapping method to GL_REPEAT so it properly tiles over the screen.
                effect.setFloat("randTextureTiles", 4.0);
                effect.setFloat("samplesFactor", samplesFactor);
            }
            // firstUpdate = false;
            effect.setFloat("area", ssaoArea);
            effect.setFloat("fallOff", ssaoFallOff);
            effect.setFloat("radius", ssaoRadius);
            effect.setFloat("totalStrength", ssaoTotalStrength);
            effect.setFloat("base", ssaoBase);

            effect.setTexture("textureSampler", depthTexture);
            effect.setTexture("randomSampler", randomTexture);
        };


        var ssao = new BABYLON.SSAORenderingPipeline("ssao", scene, ratios.ssaoRatio, camera._cameraRigParams);
        // console.log(ssao.isSupported);
        
        // var lightRadius = 0.01;

        
        // var ssdoEffect = new BABYLON.PostProcess("ssdoEffect", "ssdo2",
        // [],
        // [],
        // ratios.ssdoRatio,
        // null,
        // BABYLON.Texture.BILINEAR_SAMPLINGMODE,
        // engine);



        // ssdoEffect.onApply = function (effect){

            
        //     effect.setTexture("textureSampler", depthTexture);
        // }
        // ssao.addEffect(new BABYLON.PostProcessRenderEffect(engine, "ssdo2",() => ssdoEffect, true));

        // // // Attach camera to the SSAO render pipeline
        scene.postProcessRenderPipelineManager.attachCamerasToRenderPipeline("ssao", camera);

        // // Manage SSAO
        // var isAttached = true;
        // window.addEventListener("keydown", function (evt) {
        //     // draw SSAO with scene when pressed "1"
        //     if (evt.keyCode === 49) {
        //         if (!isAttached) {
        //             isAttached = true;
        //             scene.postProcessRenderPipelineManager.attachCamerasToRenderPipeline("ssao", camera);
        //         }
        //         scene.postProcessRenderPipelineManager.enableEffectInPipeline("ssao", ssao.SSAOCombineRenderEffect, camera);
        //     }
        //     // draw without SSAO when pressed "2"
        //     else if (evt.keyCode === 50) {
        //         isAttached = false;
        //         scene.postProcessRenderPipelineManager.detachCamerasFromRenderPipeline("ssao", camera);
        //     }
        //     // draw only SSAO when pressed "2"
        //     else if (evt.keyCode === 51) {
        //         if (!isAttached) {
        //             isAttached = true;
        //             scene.postProcessRenderPipelineManager.attachCamerasToRenderPipeline("ssao", camera);
        //         }
        //         scene.postProcessRenderPipelineManager.disableEffectInPipeline("ssao", ssao.SSAOCombineRenderEffect, camera);
        //     }
        // });
        return scene;
    }

    private _createRandomTexture(scene: BABYLON.Scene): BABYLON.DynamicTexture {
        var size = 512;

        var randomTexture = new BABYLON.DynamicTexture("SSAORandomTexture", size, scene, false, BABYLON.Texture.TRILINEAR_SAMPLINGMODE);
        randomTexture.wrapU = BABYLON.Texture.WRAP_ADDRESSMODE;
        randomTexture.wrapV = BABYLON.Texture.WRAP_ADDRESSMODE;

        var context = randomTexture.getContext();

        var rand = (min: number, max: number) => {
            return Math.random() * (max - min) + min;
        };

        var randVector = BABYLON.Vector3.Zero();

        for (var x = 0; x < size; x++) {
            for (var y = 0; y < size; y++) {
                randVector.x = Math.floor(rand(-1.0, 1.0) * 255);
                randVector.y = Math.floor(rand(-1.0, 1.0) * 255);
                randVector.z = Math.floor(rand(-1.0, 1.0) * 255);

                context.fillStyle = 'rgb(' + randVector.x + ', ' + randVector.y + ', ' + randVector.z + ')';
                context.fillRect(x, y, 1, 1);
            }
        }
        randomTexture.update(true);
        randomTexture._texture;
        return randomTexture;
    }
}

export default new SSAOScene();