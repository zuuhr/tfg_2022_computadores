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
        var planeH = BABYLON.MeshBuilder.CreatePlane("planeH", {height:60, width:60, sideOrientation:2});
        planeH.lookAt(new BABYLON.Vector3(0,1,0));
        var planeF = BABYLON.MeshBuilder.CreatePlane("planeF", {height:60, width:60, sideOrientation:2});
        planeF.lookAt(new BABYLON.Vector3(0,0,-1));
        var planeR = BABYLON.MeshBuilder.CreatePlane("planeR", {height:60, width:60, sideOrientation:2});
        planeR.lookAt(new BABYLON.Vector3(1,0,0));
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

        var numBoxes = 2;
        for (var i = 0; i < numBoxes; i++) {
            for (var j = 0; j < numBoxes; j++) {
                var box = BABYLON.Mesh.CreateBox("box" + i + " - " + j, 5, scene);
                box.position = new BABYLON.Vector3(i * 5, 2.5, j * 5);
                box.rotation = new BABYLON.Vector3(i, i * j, j);
                boxes.push(box);

                // if (j % 2 == 0) box.material = boxMaterial;
                // else box.material = boxMaterial2;
            }
        }
        boxes.forEach(element => {
            element.material = boxMaterial;
        });

        var dirLight = new BABYLON.DirectionalLight("dirLight", new BABYLON.Vector3(0, -1, -1), scene);


        //Normal Texture
        // var normalTexure = new BABYLON.InternalTexture(engine, 5);

        BABYLON.Effect.ShadersStore.normalTextureVertexShader = `
        precision highp float;

        // Attributes
        attribute vec3 position;
        attribute vec3 normal;
        attribute vec2 uv;

        // Uniforms
        uniform mat4 worldViewProjection;
        uniform mat4 worldView;

        // Varying
        varying vec4 vPosition;
        varying vec3 vNormal;
        // Varying
        varying vec2 vUV;
        void main() {

            vec4 p = vec4( position, 1.0 );

            vPosition = p;
            vNormal = (transpose(inverse(worldView)) * vec4(normal, 0.0)).xyz;
            vUV = uv;
            gl_Position = worldViewProjection * p;

        }
        `;

        BABYLON.Effect.ShadersStore.normalTextureFragmentShader = `
        precision highp float;

        //Uniforms
        uniform sampler2D textureSampler;
        uniform sampler2D normalTexture;
        uniform mat4 worldViewProjection;
        uniform mat4 worldView;
        uniform mat4 view;
        uniform mat4 world;
        
        //Varying
        varying vec2 vUV;
        varying vec3 vNormal;
        varying vec4 vPosition;

        void main(void){
            //AQUI EL FALLO
            //model space normal
            vec4 normal = vec4(vNormal, 1);
            normal.z = -normal.z;
            //world space normal (world matrix is model matrix on unity)
            // vec4 SP_Normal = transpose(inverse(worldView)) * normal;  //NO SE ME VUELVE A OLVIDAR 
            vec4 SP_Normal = normal; 
            gl_FragColor = SP_Normal;
            //Fin Normal 

            // gl_FragColor = worldView * vPosition;
            
            // gl_FragColor = texture2D(textureSampler, vUV);
        }
        `;

        var normalTextureMaterial = new BABYLON.ShaderMaterial(
            'normal texture material',
            scene,
            'normalTexture',
            {
                attributes:['position', 'normal', 'uv'],
                uniforms: ['worldViewProjection', 'view', 'worldView', 'world']
            }
        );


        var normalRenderTarget = new BABYLON.RenderTargetTexture('normal texture', canvas, scene, false);
        normalRenderTarget.activeCamera = camera;
        scene.customRenderTargets.push(normalRenderTarget);
        normalRenderTarget.renderList = boxes;
        
        normalRenderTarget.render();
        

        normalRenderTarget.setMaterialForRendering(boxes, normalTextureMaterial);

        

        //post process shader
        var numSamples = 16;
        var kernelSphere = new BABYLON.SmartArray(16);
        //radius around the analyzed pixel. Default: 0.0006
        var radius = 0.005;
        var fallOff = 0.000001;
        //Bias default: 0.025
        var bias = 0.02;
        //base color of SSAO
        var base = 0.5;
        //max value of SSAO
        var totalStrength = 1.0;
        var kernelSphereData2: number[] = [];
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
        
        
        kernelSphereData.forEach(element => {
           console.log(element.toString()); 
        });
        console.log(kernelSphereData2.toString());
        
        
        //noise texture
        // var noiseTexture = this._generateNoiseTexture(scene);
        // var noiseTexture = new BABYLON.Texture("https://imgur.com/BJwNGuo", scene);
        var noiseTexture = new BABYLON.Texture("Noise.png", scene);
        noiseTexture.wrapU = BABYLON.Texture.WRAP_ADDRESSMODE;
        noiseTexture.wrapV = BABYLON.Texture.WRAP_ADDRESSMODE;
        //with false it works just fine
        var depthTexture = scene.enableDepthRenderer(camera, false).getDepthMap(); //false to get linear depht, true to get logarithmic depth

        BABYLON.Effect.ShadersStore.normalPostProcessFragmentShader = `
        precision highp float;
        
        varying vec2 vUV;
        varying vec4 vPosition;
        
        uniform sampler2D textureSampler;
        uniform sampler2D normalTexture;
        uniform sampler2D depthTexture;
        uniform sampler2D noiseTexture;

        uniform float radius;
        uniform int numSamples;
        uniform vec3 kernelSphere[16]; 
        uniform float fallOff;
        uniform float area;
        uniform float bias;

        uniform mat4 projection; 
        uniform mat4 view; 

        uniform float near;
        uniform float far;

        vec3 getRandomVec3(vec2 uv){
            return normalize( 
                vec3( texture2D(noiseTexture, uv).rg * 2.0 - 1.0,
                0.0) 
            );
        }
        
        void main(void){
            //Linear depth from texture
            float depth = texture2D(depthTexture, vUV).r;

            //Clip Space Fragment Position (z scale in ss and vs don't vary) screen space (* 2.0 - 1.0) - > clip space
            vec3 fragPos = vec3(vUV * 2.0 - 1.0, depth);
            
            //View Space Fragment Position 
            mat4 projectionIN = inverse(projection);
            vec3 VS_fragPos = (projectionIN * vec4(fragPos, 1.0)).xyz;
            //to readjust depth add this: [MAYBE]
            VS_fragPos.z = depth;
                            
            //View Space Normal
            vec3 fragN = normalize(texture2D(normalTexture, vUV).xyz);

            //Tangent Space randomVec
            vec3 randomVec = getRandomVec3(vUV); 
            // randomVec = vec3(1.0, 0.0, 0.0);

            //Generate kernelSphere rotated along surface normal -> use TBN matrix 
            vec3 tangent = normalize(randomVec - fragN * dot(randomVec, fragN));
            //gram schmidt:
            tangent = normalize(tangent - fragN * dot(tangent, fragN));

            vec3 binormal = cross(fragN, tangent);
            mat3 TBN = mat3(tangent, binormal, fragN);


            //The further the distance the bigger the radius in view space 
            float scale = radius / depth; 
            //fixed for testing reasons
            //TODO: tamaño maximo
            // scale = radius;

            float ao = 0.0;
            float prueba = 0.0;
            vec3 pruebaVec = binormal;
            for(int i = 0; i < numSamples; i++){
                
                    //Sample position in view space
                vec3 samplePosition =  TBN * kernelSphere[i];

                    //offset sample position with current fragment
                samplePosition = VS_fragPos + samplePosition * scale;

                    //samplePos depth in View Space
                float sampleDepth = samplePosition.z; //Z aleatoria

                    //view -> (projection) -> clip -> (/ 2.0 + 0.5) -> screen
                vec2 tempCoord = (projection * vec4(samplePosition, 1.0)).xy / 2.0 + 0.5;
                    //offset Depth is the real depth of the screen fragment at the same xy of samplePosition
                float offsetDepth = texture2D(depthTexture, tempCoord).r;
                    //difference is comparison of the depth of the sample and the depth at that position 
                
                ////BEGIN [MY CODE]
                ////comprobar si está ocluido el sample Position
                // float difference = sampleDepth - offsetDepth; 
                // float rangeCheck =  smoothstep(0.0, 1.0, scale / abs(difference)); //rehacer
                // rangeCheck = 1.0 - offsetDepth; //rehacer

                // ao += difference > 0.01 ? 1.0 * rangeCheck : 0.0;
                ////END [MY CODE]

                ////BEGIN [GAMEDEV CODE]
                ////comprobar si la superficie ocluye hacia el fragmento 
                vec3 VS_offsetPos = vec3(samplePosition.xy, offsetDepth);
                vec3 diff = VS_offsetPos - VS_fragPos;
                diff = -diff;
                vec3 v = normalize(diff);
                float d = length(diff) * scale;
                d = length(diff);
                // ao += max(0.0, dot(fragN, v) - bias) * (1.0 / (1.0 + d));
                float rangeCheck =  1.0 / (1.0 + d * 200.0);
                ao += max(0.0, dot(fragN, v) ) * rangeCheck - bias;
                
                
                ////END [GAMEDEV CODE]
                prueba = max(0.0, dot(fragN, v) - bias);
                prueba =  dot(fragN, v);
                // pruebaVec = samplePosition;
                pruebaVec = v * 0.5 + 0.5;
            }
            // prueba /= float(numSamples);
            ao /= float(numSamples);
            // ao *= 500.0;
            ao = 1.0 - ao;

            
            // gl_FragColor = vec4(fragN, 1);
            // gl_FragColor = vec4(depth, depth, depth, 1);
            // gl_FragColor = vec4(depthNDC, depthNDC, depthNDC, 1);
            // gl_FragColor = vec4(depthL, depthL, depthL, 1) ;
            // gl_FragColor = texture2D(depthTexture, vUV);
            // gl_FragColor = vec4(vUV.x, vUV.y, 0.0, 1.0);
            // gl_FragColor = texture2D(noiseTexture, vUV);
            // gl_FragColor = vec4(tangent, 1);
            // gl_FragColor = vec4(binormal, 1);
            // gl_FragColor = vec4(fragNLength, fragNLength, fragNLength, 1);
            // gl_FragColor = vec4(fragPos, 1);
            // gl_FragColor = normalize(vec4(VS_fragPos, 1));
            // gl_FragColor = texture2D(textureSampler, vUV);
            // gl_FragColor = texture2D(normalTexture, vUV);
            gl_FragColor = vec4(ao, ao, ao, 1);
            // gl_FragColor = vec4(pruebaVec, 1);
            // gl_FragColor = vec4(prueba, prueba, prueba, 1);
        }

        `;    


        var normalPostProcessPass = new BABYLON.PostProcess(
            'Normal Post Process shader',
            'normalPostProcess',
            ['radius', 'numSamples', 'kernelSphere', 'fallOff', 'projection', 'view', 'bias'],
            ['normalTexture', 'depthTexture', 'noiseTexture'],
            1.0,
            camera,
            BABYLON.Texture.BILINEAR_SAMPLINGMODE,
            engine
        );

        // scene.clearColor = new BABYLON.Color4(0.2, 0.2, 0.2, 1);
        normalPostProcessPass.onApply = function (effect) {
            effect.setFloat("radius", radius);
            effect.setInt("numSamples", numSamples);
            effect.setArray3("kernelSphere", kernelSphereData2);
            effect.setFloat("fallOff", fallOff);
            effect.setFloat("bias", bias);
            
            effect.setTexture("normalTexture", normalRenderTarget);
            effect.setTexture("depthTexture", depthTexture);
            effect.setTexture("noiseTexture", noiseTexture);
            
            //we need to set uniform matrices in PostProcess shaders
            effect.setMatrix("projection", camera.getProjectionMatrix(true));
            effect.setMatrix("view", camera.getViewMatrix(true));
            //world matrix
            
            effect.setFloat("near", camera.minZ);
            effect.setFloat("far", camera.maxZ);
        }
        
        
        console.log("Near Plane: " + camera.minZ);
        console.log("Far Plane: " + camera.maxZ);
        
        
        //Blur
        
        //Horizontal vs Vertical
        var HV = 1.0;
        var kernelSize = 3;
        
        BABYLON.Effect.ShadersStore.blurPostProcessFragmentShader = `
        precision highp float;
        
        varying vec2 vUV;
        varying vec4 vPosition;
        
        uniform sampler2D textureSampler;
        
            uniform float HV;
            uniform int kernelSize;
            
            void main(void){
                vec4 col = texture2D(textureSampler, vUV);
                vec2 res = vec2(float(textureSize(textureSampler, 0).x), float(textureSize(textureSampler, 0).y) );
                vec2 offset = vec2(1.0 * HV, 1.0 - 1.0 * HV) / res;
                for(int i = 0; i < kernelSize; i++){
                    col += texture2D(textureSampler, vUV + offset * float(i));
                    col += texture2D(textureSampler, vUV - offset * float(i));
                }
                col /= float(kernelSize) * 2.0 + 1.0;
                gl_FragColor = col;
            }
            `;
            
            var horizontalBlurPostProcessPass = new BABYLON.PostProcess(
                'Horizontal Blur Post Process shader',
                'blurPostProcess',
                ['HV', 'kernelSize'],
                [],
                1.0,
                camera,
                BABYLON.Texture.BILINEAR_SAMPLINGMODE,
                engine
                );
                
                horizontalBlurPostProcessPass.onApply = function(effect){
                    HV = 1.0;
                    effect.setFloat("HV", HV);
                    effect.setInt("kernelSize", kernelSize);
                }
                
                var verticalBlurPostProcessPass = new BABYLON.PostProcess(
                    'Horizontal Blur Post Process shader',
                    'blurPostProcess',
                    ['HV', 'kernelSize'],
                    [],
                    1.0,
                    camera,
                    BABYLON.Texture.BILINEAR_SAMPLINGMODE,
                    engine
                    );
                    // scene.clearColor = new BABYLON.Color4(1, 1, 1, 1);
                    verticalBlurPostProcessPass.onApply = function(effect){
                        // scene.clearColor = new BABYLON.Color4(0.2, 0.2, 0.2, 1);
                        HV = 0.0;
                        effect.setFloat("HV", HV);
                        effect.setInt("kernelSize", kernelSize);
                    }
                    


                    scene.onKeyboardObservable.add((keyInfo) => {
                        if (keyInfo.type == BABYLON.KeyboardEventTypes.KEYDOWN){
                            switch(keyInfo.event.key){
                                case "f":
                                case "F":
                                    screenCapture();
                                break
                            };
                        };
                    });

                    function screenCapture() {
                        BABYLON.Tools.CreateScreenshot(engine, camera, { width:canvas.width, height:canvas.height},);
                        console.log("Screen Capture Taken");
                        
                    }
                    

                    return scene;
                    
                };
                
            }
         
            
            export default new NormalScene();

