precision highp float;
        
uniform sampler2D textureSampler;
uniform sampler2D depthTex;
uniform vec2 screenSize;
uniform vec2 direction;
uniform float blurWidth;

in vec2 vUV;
float weight[5] = float[] (0.227027, 0.1945946, 0.1216216, 0.054054, 0.016216);

void main(){
    vec3 result = vec3(0.0, 0.0, 0.0);
    float weightSum = 0.0;
    float depth = texture2D(depthTex, vUV).r;
    vec2 offset = vec2(screenSize.x * direction.x, screenSize.y * direction.y) * blurWidth;
    for(int i = 1; i < 5; ++i)
        {
            vec2 uv0 = vUV + offset * float(i);
            vec2 uv1 = vUV - offset * float(i);
            float distance0 = 1.0 / (1.0 + abs(depth - texture2D(depthTex, uv0).r));
            float distance1 = 1.0 / (1.0 + abs(depth - texture2D(depthTex, uv1).r));
            // float distance = exp(-(d * d));

            float weight0 = weight[i] * distance0;
            float weight1 = weight[i] * distance1;
            result += texture2D(textureSampler, uv0).rgb * weight0;
            result += texture2D(textureSampler, uv1).rgb * weight1;

            weightSum += weight0 + weight1;
        }

    float weightFinal = 1.0 - weightSum;
    // result += texture2D(textureSampler, vUV).rgb * weight[0];   
    result += texture2D(textureSampler, vUV).rgb * weightFinal;   
    gl_FragColor = vec4(result, 1.0);
}