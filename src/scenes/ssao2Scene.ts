import * as BABYLON from "babylonjs";
import { Texture } from "babylonjs/Materials/Textures/texture";
import { CreateSceneClass } from "../createScene";


export class SSAO2Scene implements CreateSceneClass {

    createScene = async (engine: BABYLON.Engine, canvas: HTMLCanvasElement):
    Promise<BABYLON.Scene> => {
        // Create scene
        var scene = new BABYLON.Scene(engine);

        const camera = new BABYLON.FlyCamera(
            "main",
            new BABYLON.Vector3(29, 13, 10),
            scene,
            true
        )

        camera.attachControl(true);
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

        var numSamples = 16;
        //Generate random dome
        var kernelSphere = new BABYLON.SmartArray(numSamples);
        for (let index = 0; index < numSamples; index++) {
            var sample = new BABYLON.Vector3(
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

        var ssaoNoise = new BABYLON.SmartArray(16);
        for (let index = 0; index < 16; index++) {
            var noise = new BABYLON.Vector3(
                Math.random() * 2.0 - 1.0,
                Math.random() * 2.0 - 1.0,
                0.0
            );
            ssaoNoise.push(noise);
        }
        var ssaoNoiseData = ssaoNoise.data.map(Number);

        var depthTexture = scene.enableDepthRenderer().getDepthMap(); // Force depth renderer "on"
        var noiseTexture = new BABYLON.NoiseProceduralTexture("noiseTex", 4, scene, new BABYLON.Texture("otherTex", scene), false);
        noiseTexture.wrapU = BABYLON.Texture.WRAP_ADDRESSMODE;
        noiseTexture.wrapV = BABYLON.Texture.WRAP_ADDRESSMODE;

        var noiseScale = new BABYLON.Vector2(canvas.width / 4.0, canvas.height / 4.0);

        BABYLON.Effect.ShadersStore["ssaoFragmentShader"] = `
        precision highp float;
    
        // Built In
        varying vec2 vUV; // TexCoords
        uniform sampler2D textureSampler;
        uniform mat4 projection;
        uniform mat4 worldViewProjection;
        uniform mat4 view;
        uniform mat4 world;
        
        // Attributes
        attribute vec3 position;
        attribute vec3 normal;
        
        // Uniforms
        uniform sampler2D textureNoise;
        uniform sampler2D textureDepth;
        uniform float near;
        uniform float far;

        const float radius = 0.006;

        vec3 normalFromDepth(float depth){
            vec2 offset1 = vec2(0.0, radius);
	        vec2 offset2 = vec2(radius, 0.0);
            float depth1 = texture2D(textureSampler, vUV + offset1).r;
	        float depth2 = texture2D(textureSampler, vUV + offset2).r;

            vec3 p1 = vec3(offset1, depth1 - depth);
            vec3 p2 = vec3(offset2, depth2 - depth);

            vec3 normal = cross(p1, p2);
            normal.z = -normal.z;

            return normalize(normal);
        }

        vec4 depthToWorld(float depth, vec2 uv, mat4 INProjView){
            vec4 pos = vec4(uv * 2.0 - 1.0, depth * 2.0 - 1.0, 1.0);
            pos = INProjView * pos;
            return pos/pos.w;
        }

        void main(void){

            float depth = texture2D(textureDepth, vUV).r;
            // depth *= 100.0;
            vec4 fragPos = view * depthToWorld(depth, vUV, inverse(projection * view));
            
            vec3 normal = normalFromDepth(depth);
            
            gl_FragColor =  inverse(projection) * vec4(normal, 1.0);
            // gl_FragColor =  vec4(depth, depth, depth, 1.0);
            gl_FragColor = fragPos;

            }
        `;

        var postProcess = new BABYLON.PostProcess("ssao", "ssao",
        ["noiseScale"],
        ["textureNoise", "textureSampler", "textureDepth", "samples", "near", "far"],
        0.5,
        camera,
        BABYLON.Texture.BILINEAR_SAMPLINGMODE,
        engine,
        false)

        postProcess.onApply = function (effect) {
            effect.setTexture("textureNoise", noiseTexture);
            effect.setTexture("textureDepth", depthTexture);
            effect.setVector2("noiseScale", noiseScale);
            effect.setArray3("samples", kernelSphereData);
            effect.setFloat("near", camera.minZ);
            effect.setFloat("far", camera.maxZ);
        }

        console.log(camera.maxZ);
        
        return scene;
    }


}


export default new SSAO2Scene();