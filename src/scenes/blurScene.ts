

import { CreateSceneClass } from "../createScene";
import * as GUI from "babylonjs-gui";
import { ArcRotateCamera, ColorCurves, DefaultRenderingPipeline, DepthOfFieldEffectBlurLevel, Engine, Scene, SceneLoader, Vector3 } from "babylonjs";



export class BlurScene implements CreateSceneClass {
    createScene = async (engine: Engine, canvas: HTMLCanvasElement):
        Promise<Scene> => {
        // Create basic scene
        var scene = new Scene(engine);
        var camera = new ArcRotateCamera("Camera", 0, 0, 0, new Vector3(0, 0, 0), scene);
        camera.setPosition(new Vector3(-3, 1, -5));
        camera.wheelPrecision = 50
        camera.attachControl(canvas, true);

        // GUI initialization and helper functions
        var bgCamera = new ArcRotateCamera("BGCamera", Math.PI / 2 + Math.PI / 7, Math.PI / 2, 100,
            new Vector3(0, 20, 0),
            scene);
        bgCamera.layerMask = 0x10000000;

        var advancedTexture = GUI.AdvancedDynamicTexture.CreateFullscreenUI("UI");
        if(advancedTexture.layer) advancedTexture.layer.layerMask = 0x10000000;
        advancedTexture.renderScale = 1.5;

        var rightPanel = new GUI.StackPanel();
        rightPanel.width = "300px";
        rightPanel.isVertical = true;
        rightPanel.paddingRight = "20px";
        rightPanel.horizontalAlignment = GUI.Control.HORIZONTAL_ALIGNMENT_RIGHT;
        rightPanel.verticalAlignment = GUI.Control.VERTICAL_ALIGNMENT_CENTER;
        advancedTexture.addControl(rightPanel);

        var leftPanel = new GUI.StackPanel();
        leftPanel.width = "300px";
        leftPanel.isVertical = true;
        leftPanel.paddingRight = "20px";
        leftPanel.horizontalAlignment = GUI.Control.HORIZONTAL_ALIGNMENT_LEFT;
        leftPanel.verticalAlignment = GUI.Control.VERTICAL_ALIGNMENT_CENTER;
        advancedTexture.addControl(leftPanel);

        var addCheckbox = function (text: string, func: { (value: any): void; (value: any): void; (value: any): void; (value: any): void; (value: any): void; (value: any): void; (value: any): void; (value: any): void; (value: any): void; (value: any): void; (value: any): void; (value: any): void; (arg0: any): void; }, initialValue: boolean, left: string | undefined, panel: GUI.StackPanel | undefined) {
            if (!panel) {
                panel = leftPanel
            }
            var checkbox = new GUI.Checkbox();
            checkbox.width = "20px";
            checkbox.height = "20px";
            checkbox.isChecked = initialValue;
            checkbox.color = "green";
            checkbox.onIsCheckedChangedObservable.add(function (value: any) {
                func(value);
            });

            var header = GUI.Control.AddHeader(checkbox, text, "280px", { isHorizontal: true, controlFirst: true });
            header.height = "30px";
            header.color = "white";
            header.horizontalAlignment = GUI.Control.HORIZONTAL_ALIGNMENT_LEFT;

            if (left) {
                header.left = left;
            }

            panel.addControl(header);
        }

        var addSlider = function (text: string, func: { (value: any): void; (value: any): void; (value: any): void; (value: any): void; (value: any): void; (value: any): void; (value: any): void; (value: any): void; (value: any): void; (value: any): void; (value: any): void; (value: any): void; (value: any): void; (value: any): void; (value: any): void; (value: any): void; (value: any): void; (arg0: any): void; }, initialValue: number, min: number, max: number, left: string | undefined, panel: GUI.StackPanel | undefined) {
            if (!panel) {
                panel = leftPanel
            }
            var header = new GUI.TextBlock();
            header.text = text;
            header.height = "30px";
            header.color = "white";
            header.textHorizontalAlignment = GUI.Control.HORIZONTAL_ALIGNMENT_LEFT;
            panel.addControl(header);
            if (left) {
                header.left = left;
            }

            var slider = new GUI.Slider();
            slider.minimum = min;
            slider.maximum = max;
            slider.value = initialValue;
            slider.height = "20px";
            slider.color = "green";
            slider.background = "white";
            slider.onValueChangedObservable.add(function (value: any) {
                func(value);
            });

            if (left) {
                slider.paddingLeft = left;
            }

            panel.addControl(slider);
        }

        var addColorPicker = function (text: string, func: { (value: any): void; (arg0: any): void; }, initialValue: any, left: string, panel: GUI.StackPanel | undefined) {
            if (!panel) {
                panel = leftPanel
            }
            var header = new GUI.TextBlock();
            header.text = text;
            header.height = "30px";
            header.color = "white";
            header.textHorizontalAlignment = GUI.Control.HORIZONTAL_ALIGNMENT_LEFT;
            panel.addControl(header);

            if (left) {
                header.left = left;
            }

            var colorPicker = new GUI.ColorPicker();
            colorPicker.value = initialValue;
            colorPicker.size = "100px";
            colorPicker.horizontalAlignment = GUI.Control.HORIZONTAL_ALIGNMENT_LEFT;
            colorPicker.onValueChangedObservable.add(function (value: any) {
                func(value);
            });

            if (left) {
                colorPicker.left = left;
            }

            panel.addControl(colorPicker);
        }

        // Create default pipeline
        var defaultPipeline = new DefaultRenderingPipeline("default", true, scene, [camera]);
        var curve = new ColorCurves();
        curve.globalHue = 200;
        curve.globalDensity = 80;
        curve.globalSaturation = 80;
        curve.highlightsHue = 20;
        curve.highlightsDensity = 80;
        curve.highlightsSaturation = -80;
        curve.shadowsHue = 2;
        curve.shadowsDensity = 80;
        curve.shadowsSaturation = 40;
        defaultPipeline.imageProcessing.colorCurves = curve;
        defaultPipeline.depthOfField.focalLength = 150;

        // Add gui for default pipeline effects
        addCheckbox("Multisample Anti-Aliasing", function (value: any) {
            defaultPipeline.samples = defaultPipeline.samples == 1 ? 4 : 1;
        }, defaultPipeline.samples == 4, 'a', leftPanel);

        addCheckbox("Fast Approximate Anti-Aliasing", function (value: any) {
            defaultPipeline.fxaaEnabled = value;

        }, defaultPipeline.fxaaEnabled, 'a', leftPanel);

        addCheckbox("Tone Mapping", function (value: any) {
            defaultPipeline.imageProcessing.toneMappingEnabled = value;
        }, defaultPipeline.imageProcessing.toneMappingEnabled, "0px", leftPanel);

        addSlider("camera contrast", function (value: any) {
            defaultPipeline.imageProcessing.contrast = value;
        }, defaultPipeline.imageProcessing.contrast, 0, 4, "0px", leftPanel);

        addSlider("camera exposure", function (value: any) {
            defaultPipeline.imageProcessing.exposure = value;
        }, defaultPipeline.imageProcessing.exposure, 0, 4, "0px", leftPanel);

        addCheckbox("Color curves", function (value: any) {
            defaultPipeline.imageProcessing.colorCurvesEnabled = value;
        }, defaultPipeline.imageProcessing.colorCurvesEnabled, "0px", leftPanel);

        addCheckbox("Bloom", function (value: any) {
            defaultPipeline.bloomEnabled = value;
        }, defaultPipeline.bloomEnabled, "0px", leftPanel);
        addSlider("Kernel", function (value: any) {
            defaultPipeline.bloomKernel = value;
        }, defaultPipeline.bloomKernel, 1, 500, "20px", leftPanel);
        addSlider("Weight", function (value: any) {
            defaultPipeline.bloomWeight = value;
        }, defaultPipeline.bloomWeight, 0, 1, "20px", leftPanel);
        addSlider("Threshold", function (value: any) {
            defaultPipeline.bloomThreshold = value;
        }, defaultPipeline.bloomThreshold, 0, 1, "20px", leftPanel);
        addSlider("Scale", function (value: any) {
            defaultPipeline.bloomScale = value;
        }, defaultPipeline.bloomScale, 0.0, 1, "20px", leftPanel);

        addCheckbox("Depth Of Field", function (value: any) {
            defaultPipeline.depthOfFieldEnabled = value;
        }, defaultPipeline.depthOfFieldEnabled, "0px", leftPanel);

        addSlider("Blur Level", function (value: number) {
            if (value < 1) {
                defaultPipeline.depthOfFieldBlurLevel = DepthOfFieldEffectBlurLevel.Low;
            } else if (value < 2) {
                defaultPipeline.depthOfFieldBlurLevel = DepthOfFieldEffectBlurLevel.Medium;
            } else if (value < 3) {
                defaultPipeline.depthOfFieldBlurLevel = DepthOfFieldEffectBlurLevel.High;
            }
        }, 1, 0, 3, "20px", leftPanel);

        addSlider("Focus Distance", function (value: any) {
            defaultPipeline.depthOfField.focusDistance = value;
        }, defaultPipeline.depthOfField.focusDistance, 1, 50000, "20px", leftPanel);

        addSlider("F-Stop", function (value: any) {
            defaultPipeline.depthOfField.fStop = value;
        }, defaultPipeline.depthOfField.fStop, 1.0, 10, "20px", leftPanel);

        addSlider("Focal Length", function (value: any) {
            defaultPipeline.depthOfField.focalLength = value;
        }, defaultPipeline.depthOfField.focalLength, 1.0, 300, "20px", leftPanel);

        leftPanel = rightPanel

        addCheckbox("Chromatic Aberration", function (value: any) {
            defaultPipeline.chromaticAberrationEnabled = value;
        }, defaultPipeline.chromaticAberrationEnabled, "0px", leftPanel);

        addSlider("Amount", function (value: any) {
            defaultPipeline.chromaticAberration.aberrationAmount = value;
        }, 0, -1000, 1000, "20px", leftPanel);
        addSlider("Radial Intensity", function (value: any) {
            defaultPipeline.chromaticAberration.radialIntensity = value;
        }, 0, 0.1, 5, "20px", leftPanel);
        addSlider("Direction", function (value: number) {
            if (value == 0) {
                defaultPipeline.chromaticAberration.direction.x = 0
                defaultPipeline.chromaticAberration.direction.y = 0
            } else {
                defaultPipeline.chromaticAberration.direction.x = Math.sin(value)
                defaultPipeline.chromaticAberration.direction.y = Math.cos(value)
            }

        }, 0, 0, Math.PI * 2, "20px", leftPanel);

        addCheckbox("Sharpen", function (value: any) {
            defaultPipeline.sharpenEnabled = value;
        }, defaultPipeline.sharpenEnabled, "0px", leftPanel);

        addSlider("Edge Amount", function (value: any) {
            defaultPipeline.sharpen.edgeAmount = value;
        }, defaultPipeline.sharpen.edgeAmount, 0, 2, "20px", leftPanel);

        addSlider("Color Amount", function (value: any) {
            defaultPipeline.sharpen.colorAmount = value;
        }, defaultPipeline.sharpen.colorAmount, 0, 1, "20px", leftPanel);

        addCheckbox("Vignette", function (value: any) {
            defaultPipeline.imageProcessing.vignetteEnabled = value;
        }, defaultPipeline.imageProcessing.vignetteEnabled, "0px", leftPanel);

        addColorPicker("Color", function (value: any) {
            defaultPipeline.imageProcessing.vignetteColor = value;
        }, defaultPipeline.imageProcessing.vignetteColor, "20px", leftPanel);

        addSlider("Weight", function (value: any) {
            defaultPipeline.imageProcessing.vignetteWeight = value;
        }, defaultPipeline.imageProcessing.vignetteWeight, 0, 10, "20px", leftPanel);

        addCheckbox("Grain", function (value: any) {
            defaultPipeline.grainEnabled = value;
        }, defaultPipeline.grainEnabled, "0px", leftPanel);

        addSlider("Intensity", function (value: any) {
            defaultPipeline.grain.intensity = value
        }, defaultPipeline.grain.intensity, 0, 100, "20px", leftPanel);

        addCheckbox("Animated", function (value: any) {
            defaultPipeline.grain.animated = value;
        }, defaultPipeline.grain.animated, "20px", leftPanel);

        scene.activeCameras = [camera, bgCamera];

        // Import model
        SceneLoader.ImportMesh("", "https://www.babylonjs.com/Assets/DamagedHelmet/glTF/", "DamagedHelmet.gltf", scene, function (newMeshes) {
            camera.target = Vector3.Zero();
            //var e = scene.createDefaultEnvironment();
            // Creating default environment enables tone mapping so disable for demo
            defaultPipeline.imageProcessing.toneMappingEnabled = false;
        });

        return scene;
    }
}

export default new BlurScene();