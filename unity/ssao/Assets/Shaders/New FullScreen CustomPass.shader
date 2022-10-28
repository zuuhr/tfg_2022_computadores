Shader "FullScreen/NewFullScreenCustomPass"
{
    Properties
    {
        _NoiseTex ("Noise", 2D) = "white" {}
        // _MainTex ("Texture", 2D) = "white" {}
    }

    HLSLINCLUDE

    #pragma vertex Vert
    // #pragma shader_feature_local _NoiseTex

    #pragma target 4.5
    #pragma only_renderers d3d11 playstation xboxone xboxseries vulkan metal switch
    
    #include "Packages/com.unity.render-pipelines.high-definition/Runtime/RenderPipeline/RenderPass/CustomPass/CustomPassCommon.hlsl"
    #include "Packages/com.unity.render-pipelines.high-definition/Runtime/Material/NormalBuffer.hlsl"
    // The PositionInputs struct allow you to retrieve a lot of useful information for your fullScreenShader:
    // struct PositionInputs
    // {
    //     float3 positionWS;  // World space position (could be camera-relative)
    //     float2 positionNDC; // Normalized screen coordinates within the viewport    : [0, 1) (with the half-pixel offset)
    //     uint2  positionSS;  // Screen space pixel coordinates                       : [0, NumPixels)
    //     uint2  tileCoord;   // Screen tile coordinates                              : [0, NumTiles)
    //     float  deviceDepth; // Depth from the depth buffer                          : [0, 1] (typically reversed)
    //     float  linearDepth; // View space Z coordinate                              : [Near, Far]
    // };

    TEXTURE2D(_NoiseTex);
    SAMPLER(sampler_NoiseTex);
    float4 _NoiseTex_ST;
    float4 _NoiseTex_TexelSize;
    float4 kernelSphere[16];

    // To sample custom buffers, you have access to these functions:
    // But be careful, on most platforms you can't sample to the bound color buffer. It means that you
    // can't use the SampleCustomColor when the pass color buffer is set to custom (and same for camera the buffer).
    // float4 SampleCustomColor(float2 uv);
    // float4 LoadCustomColor(uint2 pixelCoords);
    // float LoadCustomDepth(uint2 pixelCoords);
    // float SampleCustomDepth(float2 uv);

    // There are also a lot of utility function you can use inside Common.hlsl and Color.hlsl,
    // you can check them out in the source code of the core SRP package.

    float4 FullScreenPass(Varyings varyings) : SV_Target
    {
        UNITY_SETUP_STEREO_EYE_INDEX_POST_VERTEX(varyings);
        float depth = LoadCameraDepth(varyings.positionCS.xy);
        PositionInputs posInput = GetPositionInput(varyings.positionCS.xy, _ScreenSize.zw, depth, UNITY_MATRIX_I_VP, UNITY_MATRIX_V);
        float3 viewDirection = GetWorldSpaceNormalizeViewDir(posInput.positionWS);
        float4 color = float4(0.0, 0.0, 0.0, 0.0);
        
        

        // Load the camera color buffer at the mip 0 if we're not at the before rendering injection point
        if (_CustomPassInjectionPoint != CUSTOMPASSINJECTIONPOINT_BEFORE_RENDERING)
            color = float4(CustomPassLoadCameraColor(varyings.positionCS.xy, 0), 1);

        // Add your custom pass code here

        // Sample depth
        color = float4(depth, depth, depth, 1.0);

        // Sample World Space Normals
        NormalData normalData;
        // CAUTION: Texture doesn't clear up each frame
        const float4 normalBuffer = LOAD_TEXTURE2D_X(_NormalBufferTexture, varyings.positionCS.xy);
        DecodeFromNormalBuffer(normalBuffer, varyings.positionCS.xy, normalData);
        color = float4(normalData.normalWS, 1.0);

        // POSITION
        // float3 position = posInput.positionNDC;
        float2 position = posInput.positionNDC;
        float3 fragPos = float3(position.x, position.y, depth);

        // color = float4(position, 1.0);
        color = float4(position, depth * 100.0, 1.0);


        // NOISE 
        
        // color = LOAD_TEXTURE2D_X(_NoiseTex, varyings.positionCS.xy);
        // color = LOAD_TEXTURE2D_X(_NoiseTex, 50 / varyings.positionCS.xy );
        // color = SAMPLE_TEXTURE2D_LOD(_NoiseTex, s_linear_repeat_sampler,  varyings.positionCS.xy * _NoiseTex_TexelSize.xy, 0);
        // color = SampleCustomColor(_NoiseTex, varyings.positionCS.xy);
        color = SAMPLE_TEXTURE2D(_NoiseTex, s_linear_repeat_sampler, varyings.positionCS.xy * _NoiseTex_TexelSize.xy );

        // KERNEL SPHERE
        color = float4(kernelSphere[0].x, kernelSphere[1].y, 0.0, 1.0); 


        // SSAO SHADER
        float radius = 0.002;
        float scale = radius / depth;

        float ao = 0.0;

        for(int i = 0; i < 16; i++){
            float2 sampleCoord = kernelSphere[i].xy * scale;
            float offsetDepth = LoadCameraDepth(varyings.positionCS.xy + sampleCoord);
            float3 offsetPos = float3(fragPos.x + sampleCoord.x, fragPos.y + sampleCoord.y, offsetDepth);


            float3 diff = offsetPos - fragPos;
            float offsetNAngle = dot(normalBuffer.xyz, diff);
            // color = float4(offsetNAngle, offsetNAngle, offsetNAngle, 1.0);


            float zDiff = offsetPos.z - fragPos.z;

            ao += zDiff > 0.0 ? 1.0 * offsetNAngle : 0.0;
        }


        ao /= 16;
        ao = 1 - ao;
        color = float4(ao, ao, ao, 1.0);



        // Fade value allow you to increase the strength of the effect while the camera gets closer to the custom pass volume
        float f = 1 - abs(_FadeValue * 2 - 1);
        f = 0;
        return float4(color);
        return float4(color.rgb + f, color.a);
    }

    ENDHLSL
    
    SubShader
    {
        Pass
        {
            Name "Custom Pass 0"

            ZWrite Off
            ZTest Always
            Blend SrcAlpha OneMinusSrcAlpha
            Cull Off

            HLSLPROGRAM
                
                #pragma fragment FullScreenPass
            ENDHLSL
        }
    }
    Fallback Off
}
