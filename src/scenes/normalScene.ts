import { CreateSceneClass } from "../createScene";
import * as BABYLON from 'babylonjs';
import { postprocessVertexShader } from "babylonjs/Shaders/postprocess.vertex";

export class NormalScene implements CreateSceneClass {
    createScene = async (engine: BABYLON.Engine, canvas : HTMLCanvasElement):
        Promise<BABYLON.Scene> => {

        // Create scene
        var scene = new BABYLON.Scene(engine);
        scene.clearColor = new BABYLON.Color4(0, 0, 0, 1);

        // Create camera
        // var camera = new BABYLON.FreeCamera("camera", new BABYLON.Vector3(29, 13, 23), scene);
        var camera = new BABYLON.FreeCamera("camera", new BABYLON.Vector3(1, 0, 1), scene);
        camera.setTarget(new BABYLON.Vector3(0, 0, 0));
        camera.attachControl(canvas);
        camera.maxZ = 50; //Tweak to see better xd
        camera.minZ = 0.1;

        // Make camera orthographic
        // camera.mode = BABYLON.Camera.ORTHOGRAPHIC_CAMERA;
        // var distance = 20;	
        // var aspect = canvas.height / canvas.width; 
        // camera.orthoLeft = -distance/2;
        // camera.orthoRight = distance / 2;
        // camera.orthoBottom = camera.orthoLeft * aspect;
        // camera.orthoTop = camera.orthoRight * aspect;

        //Materials
        var whiteMaterial = new BABYLON.StandardMaterial("white", scene);
        whiteMaterial.diffuseTexture = new BABYLON.Texture("./whiteTexture.png", scene);

        var cyanMaterial = new BABYLON.StandardMaterial("cyan", scene);
        cyanMaterial.diffuseTexture = new BABYLON.Texture("./cyanTexture.png", scene);

        var greenMaterial = new BABYLON.StandardMaterial("green", scene);
        greenMaterial.diffuseTexture = new BABYLON.Texture("./greenTexture.png", scene);

        var boxMaterial = new BABYLON.StandardMaterial("boxMaterail", scene);
        boxMaterial.diffuseTexture = new BABYLON.Texture("./ground.jpg", scene);
        boxMaterial.specularColor = BABYLON.Color3.Black();
        // boxMaterial.emissiveColor = BABYLON.Color3.White();

        var boxMaterial2 = new BABYLON.StandardMaterial("boxMaterail2", scene);
        boxMaterial2.diffuseTexture = new BABYLON.Texture("./ground2.jpg", scene);
        boxMaterial2.specularColor = BABYLON.Color3.Black();

        //Geometry
        var boxes: BABYLON.Mesh[] = [];

        var planeH = BABYLON.MeshBuilder.CreatePlane("planeH", { height: 10, width: 10, sideOrientation: 2 });
        planeH.lookAt(new BABYLON.Vector3(0, 1, 0));
        planeH.material = whiteMaterial;
        var planeF = BABYLON.MeshBuilder.CreatePlane("planeF", { height: 10, width: 10, sideOrientation: 2 });
        planeF.lookAt(new BABYLON.Vector3(0, 0, -1));
        planeF.material = whiteMaterial;
        var planeR = BABYLON.MeshBuilder.CreatePlane("planeR", { height: 10, width: 10, sideOrientation: 2 });
        planeR.lookAt(new BABYLON.Vector3(1, 0, 0));
        planeR.material = whiteMaterial;
        
        var sphere = BABYLON.Mesh.CreateSphere("sphere", 5, 20, scene);
        sphere.position = new BABYLON.Vector3(0, 2.5, 20);
        sphere.material = whiteMaterial;

        var numBoxes = 4;
        for (var i = 0; i < numBoxes; i++) {
            for (var j = 0; j < numBoxes; j++) {
                var box = BABYLON.Mesh.CreateBox("box" + i + " - " + j, 1, scene);
                box.position = new BABYLON.Vector3(i * 2.25, 0.5, j * 1.25);
                box.rotation = new BABYLON.Vector3(i, i * j, j);
                boxes.push(box);

                if (i % 2 == 0) box.material = greenMaterial;
                else box.material = cyanMaterial;
            }
        }

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

        // boxes.forEach(element => {
        //     element.material = boxMaterial;
        // });

        var l = new BABYLON.Vector3(0, -1, -1);
        l.normalize();

        //Lighting
        var dirLight = new BABYLON.DirectionalLight("dirLight", l, scene);

        var ambient = new BABYLON.HemisphericLight("ambient1", new BABYLON.Vector3(0, 1, 0), scene);
        ambient.intensity = 0.5;

        var shader = "";


        
        //View Space Position Texture Pass
        shader = (await fetch("position.vertex").then(response => response.text())).toString();
        BABYLON.Effect.ShadersStore.positionTextureVertexShader = shader;
        
        shader = (await fetch("position.fragment").then(response => response.text())).toString();
        BABYLON.Effect.ShadersStore.positionTextureFragmentShader = shader;
        
        var positionTextureMaterial = new BABYLON.ShaderMaterial(
            'position texture material',
            scene,
            'positionTexture',
            {
                attributes: ['position', 'normal', 'uv'],
                uniforms: ['worldViewProjection', 'view', 'worldView', 'world']
            }
            );
            
            //documentar esto:  
            var positionRenderTarget = new BABYLON.RenderTargetTexture('position texture', canvas, scene, false, true, 2);
            positionRenderTarget.activeCamera = camera;
            // positionRenderTarget.textureType = 1;
            scene.customRenderTargets.push(positionRenderTarget);
            positionRenderTarget.renderList = boxes;
            
            positionRenderTarget.render();
            positionRenderTarget.setMaterialForRendering(boxes, positionTextureMaterial);
            
            positionRenderTarget.wrapU = BABYLON.Texture.CLAMP_ADDRESSMODE;
            positionRenderTarget.wrapV = BABYLON.Texture.CLAMP_ADDRESSMODE;
            
            // var buffer = new BABYLON.Buffer(engine, new BABYLON.DataBuffer(), true);
            // var a = new BABYLON.DynamicFloat32Array(canvas.height * canvas.width);
            // buffer.create(a.subarray(0, 0));
            // BABYLON.Effect.bind(a);
            // var tex = new BABYLON.Texture("", engine, false, false, 0, null, null, buffer, true, Float32Array)

            
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

        //documentar esto:  
        var normalRenderTarget = new BABYLON.RenderTargetTexture('normal texture', canvas, scene, false, true, 2);
        normalRenderTarget.activeCamera = camera;
        scene.customRenderTargets.push(normalRenderTarget);
        normalRenderTarget.renderList = boxes;

        normalRenderTarget.render();
        normalRenderTarget.setMaterialForRendering(boxes, normalTextureMaterial);

        normalRenderTarget.wrapU = BABYLON.Texture.CLAMP_ADDRESSMODE;
        normalRenderTarget.wrapV = BABYLON.Texture.CLAMP_ADDRESSMODE;

        //SSAO Pass
        var numSamples = 16;
        var kernelSphere = new BABYLON.SmartArray(16);
        //radius around the analyzed pixel. Default: 0.0006
        // var radius = 0.01;
        var radius = 0.0002;
        //Bias default: 0.025
        var bias = 0.002;
        //base color of SSAO
        var base = 0.5;
        var kernelSphereData2: number[] = [];
        for (let index = 0; index < numSamples; index++) {
            var sample = new BABYLON.Vector2(
                Math.random() * 2.0 - 1.0,
                Math.random() * 2.0 - 1.0);
                // Math.random());
                // Math.random() * 2.0 - 1.0);
            sample.normalize();
            var scale = index / numSamples;
            //improve distribution
            scale = BABYLON.Scalar.Lerp(0.1, 1.0, scale * scale);
            sample.scale(scale);
            //TEST
            sample.x = +sample.x.toFixed(3);
            sample.y = +sample.y.toFixed(3);
            // sample.z = +sample.z.toFixed(3);
            //sample.scale(BABYLON.Scalar.RandomRange(0, 1));
            // console.log(sample.toString())
            kernelSphere.push(sample);
            kernelSphereData2.push(parseFloat(sample.x.toString()));
            kernelSphereData2.push(parseFloat(sample.y.toString()));
            // kernelSphereData2.push(parseFloat(sample.z.toString()));
        }
        var kernelSphereData = kernelSphere.data.map(Number);

        //Noise texture
        var noiseTexture = new BABYLON.Texture("Noise.png", scene);
        noiseTexture.wrapU = BABYLON.Texture.MIRROR_ADDRESSMODE;
        noiseTexture.wrapV = BABYLON.Texture.MIRROR_ADDRESSMODE;

        //Depth texture
        var depthTexture = scene.enableDepthRenderer(camera, false).getDepthMap(); //false to get linear depht, true to get logarithmic depth
        depthTexture.wrapU = BABYLON.Texture.MIRROR_ADDRESSMODE;
        depthTexture.wrapV = BABYLON.Texture.MIRROR_ADDRESSMODE;

        //PrePostProcess shader
        shader = (await fetch("default.fragment").then(response => response.text())).toString();
        BABYLON.Effect.ShadersStore.defaultPostProcessFragmentShader = shader;
        var defaultPostProcessPass = new BABYLON.PostProcess(
            'Default Post Process shader',
            'defaultPostProcess',
            [],
            [],
            1.0,
            camera,
            BABYLON.Texture.BILINEAR_SAMPLINGMODE,
            engine
        );
        // defaultPostProcessPass.onApply = function (effect) {}
 
        
        scene.clearColor = new BABYLON.Color4(0, 0, 0, 1);
        
        // // //Geometry Buffer
        // shader = (await fetch("positionBuffer.fragment").then(response => response.text())).toString();
        // BABYLON.Effect.ShadersStore.gBufferFragmentShader = shader;

        // const geometryBuffer = scene.enableGeometryBufferRenderer();
        // if(geometryBuffer){
        //     if(geometryBuffer.isSupported){
        //         geometryBuffer.enablePosition = true;
        //         // geometryBuffer.enableReflectivity = true;
        //         console.log("Yup");
        //     }
        // }

        

        // var positionPostProcessPass = new BABYLON.PostProcess(
        //     'Position Post Process Shader',
        //     'gBuffer',
        //     [],
        //     ["positionSampler"],
        //     1.0,
        //     null,
        //     3,
        //     engine,
        //     true
        //     )

        // positionPossProcessPass.onApply = function (effect){
        //     if(geometryBuffer){
        //         const positionIndex = geometryBuffer.getTextureIndex(BABYLON.GeometryBufferRenderer.POSITION_TEXTURE_TYPE);
        //         effect.setTexture("positionSampler", geometryBuffer.getGBuffer().textures[positionIndex]);
                
        //     }
        //     console.log("Test");
        // };

        // if(geometryBuffer){
        //     const positionIndex = geometryBuffer.getTextureIndex(BABYLON.GeometryBufferRenderer.POSITION_TEXTURE_TYPE);
        //     BABYLON
        //     // var ab = new BABYLON.CreateImageDataArrayBufferViews();
        //     // const data =  geometryBuffer.getGBuffer().textures[positionIndex].readPixels(0, 0, ab, true, true);
          
        //     // if(data)
        //     // console.log(geometryBuffer.getGBuffer().textures[positionIndex].readPixels(0, 0, null, false, false));
        // }
        // BABYLON.Buffer.apply( () => geometryBuffer?.getGBuffer())

    
        scene.clearColor = new BABYLON.Color4(0, 0, 0, 1);
        
        
        
        //SSAO Shader
        shader = (await fetch("ssao_renderTarget.fragment").then(response => response.text())).toString();
        BABYLON.Effect.ShadersStore.ssaoPostProcessFragmentShader = shader;
        
        
        var ssaoPostProcessPass = new BABYLON.PostProcess(
            'Normal Post Process shader',
            'ssaoPostProcess',
            ['radius', 'numSamples', 'kernelSphere', 'fallOff', 'projection', 'view', 'bias', 'dirLight'],
            ['normalTexture', 'depthTexture', 'noiseTexture', 'positionTexture'],
            1.0,
            camera,
            BABYLON.Texture.BILINEAR_SAMPLINGMODE,
            engine
            );

        //SSDO
        ssaoPostProcessPass.onApply = function (effect) {
            effect.setFloat("radius", radius);
            effect.setInt("numSamples", numSamples);
            effect.setArray2("kernelSphere", kernelSphereData2);
            effect.setFloat("bias", bias);
            
            effect.setTexture("normalTexture", normalRenderTarget);
            effect.setTexture("depthTexture", depthTexture);
            effect.setTexture("positionTexture", positionRenderTarget);
            effect.setTexture("noiseTexture", noiseTexture);
            
            //we need to set uniform matrices in PostProcess shaders
            effect.setMatrix("projection", camera.getProjectionMatrix(true));
            effect.setMatrix("view", camera.getViewMatrix(true));
            
            // effect.setFloat("near", camera.minZ);
            // effect.setFloat("far", camera.maxZ);
            
            //SSDO
            effect.setFloat3("dirLight", -dirLight.direction._x, -dirLight.direction._y, -dirLight.direction._z);
        }
        
        
        //Blur Pass
        //Horizontal & Vertical
        var blurKernelSize = 9;
        var hBlurPass = new BABYLON.BlurPostProcess("Horizontal Blur Post Process", new BABYLON.Vector2(1, 0), blurKernelSize, 0.5, camera);
        var vBlurPass = new BABYLON.BlurPostProcess("Vertical Blur Post Process", new BABYLON.Vector2(0, 1), blurKernelSize, 0.5, camera);
        hBlurPass.apply;
        vBlurPass.apply;
        
        scene.clearColor = new BABYLON.Color4(0, 0, 0, 1);
        
        //Combine Pass
        shader = (await fetch("combine.fragment").then(response => response.text())).toString();
        BABYLON.Effect.ShadersStore.combinePostProcessFragmentShader = shader;
        
        var combinePostProcessPass = new BABYLON.PostProcess(
            'Combine Post Process shader',
            'combinePostProcess',
            [],
            ['ssaoSampler', 'defaultSampler'],
            1.0,
            camera,
            BABYLON.Texture.BILINEAR_SAMPLINGMODE,
            engine
            );
            //https://playground.babylonjs.com/#JAVY4F#5
        
        // scene.disableGeometryBufferRenderer();

        // combinePostProcessPass.onApply = function (effect) {
        //     effect.setTextureFromPostProcess("defaultSampler", defaultPostProcessPass);
        //     effect.setTextureFromPostProcess("ssaoSampler", vBlurPass);
        //     if(geometryBuffer){
        //         const positionIndex = geometryBuffer.getTextureIndex(BABYLON.GeometryBufferRenderer.POSITION_TEXTURE_TYPE);
        //         effect.setTexture("positionSampler", geometryBuffer.getGBuffer().textures[positionIndex]);
        //         console.log("TEXTURA EN COMBINE");
        //         // console.log(geometryBuffer.getGBuffer().textures[positionIndex].readPixels(0, 0, null, false, false));
        //     }
        // }
        


        return scene;
    };
}

export default new NormalScene();