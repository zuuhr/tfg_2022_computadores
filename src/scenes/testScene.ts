
import { CreateSceneClass } from "../createScene";
import * as BABYLON from 'babylonjs';
import { myRenderPipeline } from "../pipelines/myRenderPipeline";
import { PostProcess, Vector3, Vector2 } from "babylonjs";
import "../shaders/ssdo.fragment.fx";


export class TestScene implements CreateSceneClass {
    createScene = async (engine: BABYLON.Engine, canvas: HTMLCanvasElement):
        Promise<BABYLON.Scene> => {
        const scene = new BABYLON.Scene(engine);

        const camera = new BABYLON.FlyCamera(
            "main",
            new BABYLON.Vector3(0, 1, -5),
            scene,
            true
        )
        camera.attachControl(true);

        // This creates a light, aiming 0,1,0 - to the sky (non-mesh)
        const light = new BABYLON.HemisphericLight(
            "light",
            new BABYLON.Vector3(0, 1, 0),
            scene
        );

        // Default intensity is 1. Let's dim the light a small amount
        light.intensity = 0.7;

        // Our built-in 'sphere' shape.
        const sphere = BABYLON.SphereBuilder.CreateSphere(
            "sphere",
            { diameter: 2, segments: 32 },
            scene
        );

        const color = new BABYLON.Color3(0, 0.95, 0.95);
        const mat = new BABYLON.StandardMaterial("mat_sphere", scene);
        mat.diffuseColor = color;
        sphere.material = mat;
        // Move the sphere upward 1/2 its height
        sphere.position.y = 1;

        // Our built-in 'ground' shape.
        const ground = BABYLON.GroundBuilder.CreateGround(
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



        // var ssaoRatio = {
        //     ssaoRatio: 0.5, // Ratio of the SSAO post-process, in a lower resolution
        //     combineRatio: 1.0 // Ratio of the combine post-process (combines the SSAO and the scene)
        // };


        // var ssao = new BABYLON.SSAORenderingPipeline("ssao", scene, ssaoRatio);
        // ssao.fallOff = 0.00001;
        // ssao.area = 1;
        // ssao.radius = 0.0001;
        // ssao.totalStrength = 1.0;
        // ssao.base = 0.5;

        // // Attach camera to the SSAO render pipeline
        // scene.postProcessRenderPipelineManager.attachCamerasToRenderPipeline("ssao", camera);

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
        //});

        //RENDER PIPELINE
        // var mySSDORenderPipeline = new BABYLON.PostProcessRenderPipeline(engine, "ssdo");
        var combineRatio = 1.0;

        //#region 1. GENERATE BUFFER WITH DEPTH, POS, N, ALBEDO
        scene.getEngine()._gl.clearDepth(0.0);
        var depthTexture = scene.enableDepthRenderer().getDepthMap().getInternalTexture(); // Force depth renderer "on"

        var gBufferPostProcess = new BABYLON.PassPostProcess("gBufferPostProcess", combineRatio, camera, BABYLON.Texture.TRILINEAR_SAMPLINGMODE, engine);

        //#endregion

        //#region 2. OCCLUSION CALCULATION

        //Kernel quality: 8 samples
        var numSamples = 16;
        var samplesFactor = 1.0/ numSamples;
        //var randomSampleValue = BABYLON.Scalar.RandomRange(0, 1);
        var kernelSphere = new BABYLON.SmartArray(16);
        //radius around the analyzed pixel. Default: 0.0006
        var radius = 0.0006;
        // Default: 0.0075;
        var area = 0.0075;
        /**
        * used to interpolate SSAO samples (second interpolate function input) based on the occlusion difference of each pixel
        * Must not be equal to area and inferior to area.
        * Default: 0.000001
        */
        var fallOff = 0.000001;
        //base color of SSAO
        var base = 0.5;
        //max value of SSAO
        var totalStrength = 1.0;

        //This section is simplified in the babylonjs code
        for (let index = 0; index < numSamples; index++) {
            var sample = new Vector3(
                Math.random() * 2.0 - 1.0,
                Math.random() * 2.0 - 1.0,
                Math.random());
            sample.normalize();
            var scale = index / numSamples;
            //improve distribution
            BABYLON.Scalar.Lerp(0.1, 1.0, scale * scale);
            sample.scale(scale);
            //sample.scale(BABYLON.Scalar.RandomRange(0, 1));
            kernelSphere.push(sample);
        }
        var kernelSphereData = kernelSphere.data.map(Number);
        //noise texture
        var noiseTexture = this._generateNoiseTexture(scene);



        // BABYLON.Effect.ShadersStore["customFragmentShader"] = `
        // #ifdef GL_ES
        //     precision highp float;
        // #endif
    
        // // Samplers
        // varying vec2 vUV;
        // uniform sampler2D textureSampler;

        // //SSAO Variables
        // uniform sampler2D randomSampler;
        // //8 is the number of samples
        // uniform vec3 kernelSphere[16]; 
        // uniform float randTextureTiles;

        // uniform float radius;
        // uniform float area;
        // uniform float fallOff;
        // uniform float totalStrength;
        // uniform float samplesFactor;
        // uniform float base;


        // vec3 normalFromDepth(vec2 coords, float depth){
        //     vec2 offset1 = vec2(0.0, radius);
	    //     vec2 offset2 = vec2(radius, 0.0);
        //     float depth1 = texture2D(textureSampler, coords + offset1).r;
	    //     float depth2 = texture2D(textureSampler, coords + offset2).r;

        //     vec3 p1 = vec3(offset1, depth1 - depth);
        //     vec3 p2 = vec3(offset2, depth2 - depth);

        //     vec3 normal = cross(p1, p2);
        //     normal.z = -normal.z;

        //     return normalize(normal);
        // }

        // void main(void) 
        // {
        //     // //depth buffer check
        //     // float depthTest = texture2D(textureSampler, vUV).r * 1000.0;
        //     // gl_FragColor = vec4(depthTest, depthTest, depthTest, 1);

        //     //gl_FragColor = normalize(texture2D(textureSampler, vUV));
            
        //     float depth = texture2D(textureSampler, vUV).r;
        //     vec3 fragPos = vec3(vUV, depth);
        //     vec3 fragN = normalFromDepth(vUV, depth);
        //     vec3 randomVec = normalize(texture2D(randomSampler, vUV * randTextureTiles).rgb);
            
        //     //to scale it right?
        //     float radiusDepth = radius / depth; 
        //     //IMPORTANTE
        //     float occlusion = 0.0;
            
            
        //     vec3 ray;
        //     vec3 hemiRay;
        //     float occlusionDepth;
        //     float difference;
        //     depth = depth * 1000.0;
            
        //     for (int i = 0; i < 16; i++){
        //         ray = radiusDepth * reflect(kernelSphere[i], randomVec);
        //         hemiRay = fragPos + sign(dot(ray, fragN)) * ray;
        //         occlusionDepth = texture2D(textureSampler, clamp(hemiRay.xy, vec2(0.001, 0.001), vec2(0.999, 0.999))).r;
        //         difference = depth - occlusionDepth;
                
        //         //range check
        //         occlusion += step(fallOff, difference) * (1.0 - smoothstep(fallOff, area, difference));
        //     }
        //     //ao contribution of sample fromm all samples
        //     float ao = 1.0 - totalStrength * occlusion * samplesFactor;
	    //     float result = clamp(ao + base, 0.0, 1.0);

        //     gl_FragColor.rgb = vec3(result);
        //     gl_FragColor.a = 1.0;

        //     //gl_FragColor = texture2D(textureSampler, vUV) * vec4(1000);
        // }
        // `;

        var postProcess = new BABYLON.PostProcess("occlusion", "ssdo",
            ["kernelSphere", "randTextureTiles", "radius", "fallOff", "area", "base", "totalStrength", "samplesFactor"],
            ["randomSampler"],
            0.5,
            camera,
            BABYLON.Texture.BILINEAR_SAMPLINGMODE,
            scene.getEngine(),
            false,
            );

        //postProcess.externalTextureSamplerBinding
        postProcess.onApply = function (effect) {
            effect.setArray3("kernelSphere", kernelSphereData);
            //We then create a 4x4 texture that holds the random rotation vectors; make sure to set its wrapping method to GL_REPEAT so it properly tiles over the screen.
            effect.setFloat("randTextureTiles", 4.0);
            effect.setFloat("samplesFactor", samplesFactor);

            effect.setFloat("area", area);
            effect.setFloat("fallOff", fallOff);
            effect.setFloat("radius", radius);
            effect.setFloat("totalStrength", totalStrength);
            effect.setFloat("base", base);

            effect._bindTexture("textureSampler", depthTexture);
            effect.setTexture("randomSampler", noiseTexture);
        };    
   
         //#endregion
        
        //#region 3. BLUR

        var blurSize = 16;
        var blurRatio = 0.5;
        var blurHPostProcess = new BABYLON.BlurPostProcess("blurH", new Vector2(1, 0), blurSize, blurRatio, camera, BABYLON.Texture.BILINEAR_SAMPLINGMODE);
        var blurVPostProcess = new BABYLON.BlurPostProcess("blurV", new Vector2(0, 1), blurSize, blurRatio, camera, BABYLON.Texture.BILINEAR_SAMPLINGMODE);

        blurHPostProcess.onActivateObservable.add(() => {
            let dw = blurHPostProcess.width / scene.getEngine().getRenderWidth();
            blurHPostProcess.kernel = blurSize * dw;
        });
        blurVPostProcess.onActivateObservable.add(() => {
            let dw = blurHPostProcess.height / scene.getEngine().getRenderHeight();
            blurHPostProcess.kernel = blurSize * dw;
        });
        //#endregion
        
        //#region 4. COMBINE IMAGE

        var combineRatio = 1.0;


        BABYLON.Effect.ShadersStore["combineFragmentShader"] = `
        #ifdef GL_ES
            precision highp float;
        #endif
    
        // Samplers
        varying vec2 vUV;
        uniform sampler2D textureSampler;
        uniform sampler2D originalColor;

        uniform vec4 viewport;

        void main(void){
            vec4 ssaoColor = texture2D(textureSampler, viewport.xy + vUV * viewport.zw);
            vec4 sceneColor = texture2D(originalColor, vUV);

            gl_FragColor = sceneColor * ssaoColor;
        }

        `;
        var combinePostProcess = new BABYLON.PostProcess("combine", "combine",
        [],
        ["originalColor", "viewport"],
        combineRatio,
        camera,
        BABYLON.Texture.BILINEAR_SAMPLINGMODE,
        scene.getEngine(),
        false);
        
        combinePostProcess.onApply = function (effect) {
            effect.setTextureFromPostProcess("originalColor", gBufferPostProcess);
            effect.setVector4("viewport", BABYLON.TmpVectors.Vector4[0].copyFromFloats(0, 0, 1.0, 1.0));
        }
        //#endregion

        // postProcess.onApply = function (effect) {   };
        //mySSDORenderPipeline.addEffect(new BABYLON.PostProcessRenderEffect(engine, "ppRenderEffect",  () => { return this.postProcess;}, true) );

        // mySSDORenderPipeline.addEffect(new BABYLON.PostProcessRenderEffect(engine, "gBufferRE", () => { return gBufferPostProcess;}, true ));
        // mySSDORenderPipeline.addEffect(new BABYLON.PostProcessRenderEffect(engine, "occlusionRE", () => { return postProcess;}, true ));
        // scene.postProcessRenderPipelineManager.addPipeline(mySSDORenderPipeline);
        // scene.postProcessRenderPipelineManager.attachCamerasToRenderPipeline("ssdo", camera);
        return scene;

    };

    private _generateNoiseTexture(scene: BABYLON.Scene): BABYLON.DynamicTexture {
        var size = 512;
        var noiseTexture = new BABYLON.DynamicTexture("noiseTexture", size, scene, false, BABYLON.Texture.TRILINEAR_SAMPLINGMODE);
        noiseTexture.wrapU = BABYLON.Texture.WRAP_ADDRESSMODE;
        noiseTexture.wrapV = BABYLON.Texture.WRAP_ADDRESSMODE;

        var context = noiseTexture.getContext();

        var noiseVector = Vector3.Zero();
        for (let x = 0; x < size; x++) {
            for (let y = 0; y < size; y++) {
                noiseVector.x = Math.floor((Math.random() * 2.0 - 1.0) * 255);
                noiseVector.y = Math.floor((Math.random() * 2.0 - 1.0) * 255);
                noiseVector.z = Math.floor((Math.random() * 2.0 - 1.0) * 255);

                context.fillStyle = 'rgb(' + noiseVector.x + ', ' + noiseVector.y + ', ' + noiseVector.z + ')';
                context.fillRect(x, y, 1, 1);
            }
        }

        return noiseTexture;
    }
}

export default new TestScene();