precision highp float;
        
uniform sampler2D textureSampler;
uniform sampler2D depthTex;
uniform vec2 screenSize;
uniform vec2 direction;
uniform float blurWidth;

in vec2 vUV;
// float weight[5] = float[] (0.227027, 0.1945946, 0.1216216, 0.054054, 0.016216);
float weight[10] = float[] (0.1974129434306977, 0.17466680058027237, 0.12097768865668214, 
0.06559086081218723, 0.027834737777226178, 0.009244634006751011, 0.002402737087917116, 
0.0004886429196522016, 0.00007774906664655715, 0.000009677377316317854);
// float weight[18] = float[] (5.551115123125783e-17, 4.6074255521944e-15, 2.0528023725319144e-13, 7.224332243538356e-12, 1.9865953326814179e-10, 4.269444575655257e-9, 7.172582311421039e-8, 9.421271820464483e-7, 0.00000967735760681876, 0.00007774890829836956, 0.0004886419244541362, 0.0024027321943655977, 0.009244615178601645, 0.027834681087410218, 0.06559072722609571, 0.12097744226661516, 0.1746664448438951, 0.1974125413682274);

void main(){
    vec3 result = vec3(0.0, 0.0, 0.0);
    float weightSum = 0.0;
    float depth = texture2D(depthTex, vUV).r;
    // vec2 offset = vec2(screenSize.x * direction.x, screenSize.y * direction.y) * blurWidth;
    vec2 offset = vec2(screenSize.x * direction.x, screenSize.y * direction.y) ;
    for(int i = 1; i < 10; i++)
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