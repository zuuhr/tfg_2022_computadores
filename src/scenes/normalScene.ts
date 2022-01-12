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
	        sphere.rotate(new BABYLON.Vector3(0,1,0), angle, BABYLON.Space.WORLD);
	        pivot.rotate(new BABYLON.Vector3(0,1,0), angle, BABYLON.Space.WORLD);
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

        void main(void){
            //AQUI EL FALLO
            //model space normal
            vec4 normal = vec4(vNormal, 1);
            //world space normal (world matrix is model matrix on unity)
            vec4 SP_Normal = world * normal;
            gl_FragColor = SP_Normal;
            
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

        BABYLON.Effect.ShadersStore.normalPostProcessFragmentShader = `
        precision highp float;
        
        varying vec2 vUV;
        
        uniform sampler2D normalTexture;
        uniform sampler2D textureSampler;

        void main(void){
            gl_FragColor = texture2D(normalTexture, vUV);
            // gl_FragColor = texture2D(textureSampler, vUV);
        }

        `;    


        var normalPostProcessPass = new BABYLON.PostProcess(
            'Normal Post Process shader',
            'normalPostProcess',
            null,
            ['normalTexture'],
            1.0,
            camera,
            BABYLON.Texture.BILINEAR_SAMPLINGMODE,
            engine
        );

        normalPostProcessPass.onApply = function (effect) {
            effect.setTexture("normalTexture", normalRenderTarget);
        }

        
        // normalRenderTarget.getCustomRenderList(0, boxes, numBoxes * numBoxes);
        
        // I left where nromasl must be transformed into view space
        return scene;

    };
}

export default new NormalScene();