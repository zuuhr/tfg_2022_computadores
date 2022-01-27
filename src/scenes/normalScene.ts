import { CreateSceneClass } from "../createScene";
import * as BABYLON from 'babylonjs';

export class NormalScene implements CreateSceneClass {
    createScene = async (engine: BABYLON.Engine, canvas: HTMLCanvasElement):
        Promise<BABYLON.Scene> => {
        // Create scene
        var scene = new BABYLON.Scene(engine);
        scene.clearColor = new BABYLON.Color4(0.2, 0.2, 0.2, 1);

        // Create camera
        var camera = new BABYLON.FreeCamera("camera", new BABYLON.Vector3(29, 13, 23), scene);
        camera.setTarget(new BABYLON.Vector3(0, 0, 0));
        camera.attachControl(canvas);
        camera.maxZ = 200; //Tweak to see better xd

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

        // Varying
        varying vec4 vPosition;
        varying vec3 vNormal;
        // Varying
        varying vec2 vUV;
        void main() {

            vec4 p = vec4( position, 1. );

            vPosition = p;
            vNormal = normal;
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
            //world space normal (world matrix is model matrix on unity)
            vec4 SP_Normal = transpose(inverse(worldView)) * normal;  //NO SE ME VUELVE A OLVIDAR 
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
        var samplesFactor = 1.0 / numSamples;
        var kernelSphere = new BABYLON.SmartArray(16);
        //radius around the analyzed pixel. Default: 0.0006
        var radius = 0.006;
        // Default: 0.0075;
        var area = 0.02;
        var fallOff = 0.000001;
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

        uniform mat4 projection; 
        uniform mat4 view; 

        vec3 getRandomVec3(vec2 uv){
            return normalize( 
                vec3( texture2D(noiseTexture, uv).rg * 2.0 - 1.0,
                0.0) 
            );
        }

        float getLinearDepth(float depth){
            //nearPlane; 
            //farPlane;
            // depth = nearPlane / (farPlane - depth * (farPlane - nearPlane)) * farPlane;
            return depth;
        }
        
        void main(void){
            // From linear [0, 1] to linear [-1, 1]
            float depth = texture2D(depthTexture, vUV).r;
            float depthUN = depth * 2.0 - 1.0;

            //Screen Space Fragment Position
            vec3 fragPos = vec3(vUV * 2.0 - 1.0, depthUN); //screen coordinates mirar la escala xy vs z
            
            //View Space Fragment Position
            mat4 projectionIN = inverse(projection);
            vec3 VS_fragPos = (projectionIN * vec4(fragPos, 1.0)).xyz;
                            
            //View Space Normal
            vec3 fragN = normalize(texture2D(normalTexture, vUV).xyz);
            //Tangent Space randomVec
            vec3 randomVec = getRandomVec3(vUV); 

            //The further the distance the bigger the radius? 
            float scale = radius / depth; //este
            scale = radius; 

            float ao = 0.0;
            for(int i = 0; i < numSamples; i++){
                
                //TODO: rotar el kernelSphere -> gotta use TBN matrix 
                vec3 tangent = normalize(randomVec - fragN * dot(randomVec, fragN));
                //gram schmidt:
                tangent = normalize(tangent - fragN * dot(tangent, fragN));
                vec3 binormal = cross(fragN, tangent);
                mat3 TBN = mat3(tangent, binormal, fragN);

                //Sample position in view space
                vec3 samplePosition =  TBN * kernelSphere[i];

                //offset sample position
                samplePosition = VS_fragPos + samplePosition * scale;

                //this depth is in View Space
                float sampleDepth = samplePosition.z;

                //the actual depth: (Screen space) -> (View Space)
                // float actualDepth = texture2D(depthTexture, samplePosition.xy).r; //samplePosition screen coordinates
                vec2 tempCoord = (projection * vec4(samplePosition, 1.0)).xy / 2.0 + 0.5;
                float tempDepth = texture2D(depthTexture, tempCoord).r * 2.0 - 1.0;
                vec3 SS_tempPos = vec3(tempCoord * 2.0 - 1.0, tempDepth);
                float actualDepth = (projectionIN * vec4(SS_tempPos, 1.0)).z;
                float difference = actualDepth - sampleDepth;

                // float rangeCheck =  smoothstep(0.0001, 1.0, radius / abs(difference)); //rehacer

                // rangeCheck = abs(actualDepth - depth) < area ? 1.0 : 0.0;

                ao += difference > 0.0001 ? 0.0 : 1.0;
            }
            ao /= float(numSamples);
            ao = 1.0 - ao;
            // gl_FragColor = texture2D(normalTexture, vUV);
            // gl_FragColor = texture2D(depthTexture, vUV);
            // gl_FragColor = vec4(vUV.x, vUV.y, 0.0, 1.0);
            // gl_FragColor = texture2D(noiseTexture, vUV);
            gl_FragColor = vec4(ao, ao, ao, 1);
            // gl_FragColor = vec4(fragPos, 1);
            // gl_FragColor = normalize(vec4(VS_fragPos, 1));
            // gl_FragColor = texture2D(textureSampler, vUV);
        }

        `;    


        var normalPostProcessPass = new BABYLON.PostProcess(
            'Normal Post Process shader',
            'normalPostProcess',
            ['radius', 'numSamples', 'kernelSphere', 'fallOff', 'area', 'projection', 'view'],
            ['normalTexture', 'depthTexture', 'noiseTexture'],
            1.0,
            camera,
            BABYLON.Texture.BILINEAR_SAMPLINGMODE,
            engine
        );

        normalPostProcessPass.onApply = function (effect) {
            effect.setFloat("radius", radius);
            effect.setInt("numSamples", numSamples);
            effect.setArray3("kernelSphere", kernelSphereData2);
            effect.setFloat("fallOff", fallOff);
            effect.setFloat("area", area);

            effect.setTexture("normalTexture", normalRenderTarget);
            effect.setTexture("depthTexture", depthTexture);
            effect.setTexture("noiseTexture", noiseTexture);

            //we need to set uniform matrices in PostProcess shaders
            effect.setMatrix("projection", camera.getProjectionMatrix(true));
            effect.setMatrix("view", camera.getViewMatrix(true));
            //world matrix
        }

        
        // normalRenderTarget.getCustomRenderList(0, boxes, numBoxes * numBoxes);
        
        // I left where nromasl must be transformed into view space
        return scene;

    };
}

export default new NormalScene();