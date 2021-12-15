
// digital assets
import controllerModel from "../../assets/glb/samsung-controller.glb";
import roomEnvironment from "../../assets/environment/room.env"
import { ArcRotateCamera, CubeTexture, Engine, EnvironmentHelper, HemisphericLight, Scene, SceneLoader, Vector3 } from "babylonjs";
import { CreateSceneClass } from "../createScene";

export class LoadModelAndEnvScene implements CreateSceneClass {
    createScene = async (
        engine: Engine,
        canvas: HTMLCanvasElement
    ): Promise<Scene> => {
        // This creates a basic Babylon Scene object (non-mesh)
        const scene = new Scene(engine);

        // This creates and positions a free camera (non-mesh)
        const camera = new ArcRotateCamera(
            "my first camera",
            0,
            Math.PI / 3,
            10,
            new Vector3(0, 0, 0),
            scene
        );

        // This targets the camera to scene origin
        camera.setTarget(Vector3.Zero());

        // This attaches the camera to the canvas
        camera.attachControl(canvas, true);

        camera.useFramingBehavior = true;

        // load the environment file
        scene.environmentTexture = new CubeTexture(roomEnvironment, scene);

        // if not setting the envtext of the scene, we have to load the DDS module as well
        new EnvironmentHelper( {
            skyboxTexture: roomEnvironment,
            createGround: false
        }, scene)

        // This creates a light, aiming 0,1,0 - to the sky (non-mesh)
        const light = new HemisphericLight(
            "light",
            new Vector3(0, 1, 0),
            scene
        );

        // Default intensity is 1. Let's dim the light a small amount
        light.intensity = 0.7;

        const importResult = await SceneLoader.ImportMeshAsync(
            "",
            "",
            controllerModel,
            scene,
            undefined,
            ".glb"
        );

        // just scale it so we can see it better
        importResult.meshes[0].scaling.scaleInPlace(10);

        return scene;
    };
}

export default new LoadModelAndEnvScene();
