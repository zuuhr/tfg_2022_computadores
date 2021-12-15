
import { CreateSceneClass } from "../createScene";

import { Engine } from "babylonjs";
import { Scene } from "babylonjs";
import { FlyCamera } from "babylonjs";
import { Vector3 } from "babylonjs";
import { HemisphericLight } from "babylonjs";
import { SphereBuilder } from "babylonjs";
import { GroundBuilder } from "babylonjs";
import { BlackAndWhitePostProcess } from "babylonjs";
import { SSAORenderingPipeline } from "babylonjs";
import { Color3 } from "babylonjs";


export class TestScene implements CreateSceneClass {
    createScene = async (engine: Engine, canvas: HTMLCanvasElement):
        Promise<Scene> => {
        const scene = new Scene(engine);

        const camera = new FlyCamera(
            "main",
            new Vector3(0, 1, -5),
            scene,
            true
        )
        camera.attachControl(true);

        // This creates a light, aiming 0,1,0 - to the sky (non-mesh)
        const light = new HemisphericLight(
            "light",
            new Vector3(0, 1, 0),
            scene
        );

        // Default intensity is 1. Let's dim the light a small amount
        light.intensity = 0.7;

        // Our built-in 'sphere' shape.
        const sphere = SphereBuilder.CreateSphere(
            "sphere",
            { diameter: 2, segments: 32 },
            scene
        );

        const color = new Color3(0, 0.5, 0.5);

        // Move the sphere upward 1/2 its height
        sphere.position.y = 1;

        // Our built-in 'ground' shape.
        const ground = GroundBuilder.CreateGround(
            "ground",
            { width: 6, height: 6 },
            scene
        );

        //Create a pipeline

        // var postProcess = new BlackAndWhitePostProcess("bandw", 1.0, camera);
        // var kernel = 256.0;	
        // var postProcess2 = new BlurPostProcess("Horizontal blur", new Vector2(1.0, 0), kernel, 0.25, camera);

        // var pipeline = new BABYLON.PostProcessRenderPil

        //var depth = scene.enableDepthRenderer();

        var ssaoRatio = {
            ssaoRatio: 0.5, // Ratio of the SSAO post-process, in a lower resolution
            combineRatio: 1.0 // Ratio of the combine post-process (combines the SSAO and the scene)
        };


        var ssao = new SSAORenderingPipeline("ssao", scene, ssaoRatio);
        ssao.fallOff = 0.00001;
        ssao.area = 1;
        ssao.radius = 0.0001;
        ssao.totalStrength = 1.0;
        ssao.base = 0.5;

        // Attach camera to the SSAO render pipeline
        scene.postProcessRenderPipelineManager.attachCamerasToRenderPipeline("ssao", camera);

        // Manage SSAO
        var isAttached = true;
        window.addEventListener("keydown", function (evt) {
            // draw SSAO with scene when pressed "1"
            if (evt.keyCode === 49) {
                if (!isAttached) {
                    isAttached = true;
                    scene.postProcessRenderPipelineManager.attachCamerasToRenderPipeline("ssao", camera);
                }
                scene.postProcessRenderPipelineManager.enableEffectInPipeline("ssao", ssao.SSAOCombineRenderEffect, camera);
            }
            // draw without SSAO when pressed "2"
            else if (evt.keyCode === 50) {
                isAttached = false;
                scene.postProcessRenderPipelineManager.detachCamerasFromRenderPipeline("ssao", camera);
            }
            // draw only SSAO when pressed "2"
            else if (evt.keyCode === 51) {
                if (!isAttached) {
                    isAttached = true;
                    scene.postProcessRenderPipelineManager.attachCamerasToRenderPipeline("ssao", camera);
                }
                scene.postProcessRenderPipelineManager.disableEffectInPipeline("ssao", ssao.SSAOCombineRenderEffect, camera);
            }
        });

        return scene;

    };
}

export default new TestScene();