precision highp float;
        
uniform sampler2D textureSampler;
uniform sampler2D depthTex;
uniform sampler2D normalTex;

uniform mat4 projection;

uniform vec3 dirLight;
uniform vec3 pointLight;

in vec2 vUV;

vec2 vec[16];

vec3 VSPositionFromDepth(vec2 texCoord)
{
    // Get the depth value for this pixel
    float z = texture2D(depthTex, texCoord).r;
    // Get x/w and y/w from the viewport position
    float x = texCoord.x * 2.0 - 1.0;
    float y = texCoord.y * 2.0 - 1.0;
    vec4 projectedPos = vec4(x, y, z, 1.0);
    // Transform by the inverse projection matrix
    mat4 projectionIN = inverse(projection);
    vec4 positionVS = projectionIN * projectedPos;
    // vec4 positionVS = proj * projectedPos;
    // Divide by w to get the view-space position
    vec3 a = positionVS.xyz / positionVS.w;  
    // vec3 a = positionVS.xyz;  
    return a.xyz;
}

void main(){

    vec[0] = vec2(1,0);
    vec[1] = vec2(-1,0);
    vec[2] = vec2(0,1);
    vec[3] = vec2(0,-1);
    vec[4] = vec2(0.707, 0.707);
    vec[5] = vec2(-0.707, 0.707);
    vec[6] = vec2(-0.707, -0.707);
    vec[7] = vec2(0.707, -0.707);

    vec[8] = vec2(0.25, 0.3);
    vec[9] = vec2(0.25, -0.3);
    vec[10] = vec2(-0.25, -0.3);
    vec[11] = vec2(-0.25, 0.3);
    vec[12] = vec2(0.5, 0.1);
    vec[13] = vec2(0.5, -0.1);
    vec[14] = vec2(-0.5, -0.1);
    vec[15] = vec2(-0.5, 0.1);

    vec3 fragColor = texture2D(textureSampler, vUV).xyz;
    vec3 VS_fragPos = VSPositionFromDepth(vUV);
    
    // View Space Normal DONT NORMALIZE
    vec3 fragN = texture2D(normalTex, vUV).xyz;
    fragN = fragN * 2.0 - 1.0;

    //The further the distance the bigger the radius in view space 
    float aoScale = 0.02 / VS_fragPos.z; 
    float ssdoScale = 0.05 / VS_fragPos.z; 

    // float fragL = dot(fragN, dirLight);

 
    float ao = 0.0;
    vec3 ssdo = vec3(0.0, 0.0, 0.0);
    for(int i = 0; i < 16; i++){
        vec2 aoSampleCoord = vec[i].xy * aoScale;
        vec2 ssdoSampleCoord = vec[i].xy * ssdoScale;
        vec3 VS_offsetPos = VSPositionFromDepth(vUV + aoSampleCoord);

        vec3 offsetN = texture2D(normalTex, vUV + ssdoSampleCoord).xyz;
        offsetN.z = -offsetN.z;
        // offsetN = offsetN * 2.0 - 1.0;
        // float offsetL = max(dot(offsetN, -dirLight), 0.0);
        float offsetL = max(dot(offsetN, normalize(VS_fragPos - pointLight)), 0.0);
        vec3 offsetColor = texture2D(textureSampler, vUV + ssdoSampleCoord).xyz;

        vec3 diff = VS_offsetPos - VS_fragPos;
        float dist = abs(VS_offsetPos.z - VS_fragPos.z);
        // dist *= 500.0;
        dist = dist > 0.0001 ? 1000000.0 : dist;
        float rangeCheck = (1.0 / (1.0 + dist));

        float offsetNAngle =  max(dot(fragN, normalize(diff)), 0.0);
        ao += offsetNAngle * rangeCheck;
        ssdo += (1.0 - ao) * ( offsetL * offsetColor);
    }
    // ao *= 10.0;
    ao = max(1.0 - (max(0.0, ao)), 0.1);
    ao = ao < 0.92 ? 1.0 : ao;
    
    
    ssdo /= 16.0;
    ssdo =  max(vec3(0.0, 0.0, 0.0), ssdo);
    
    vec3 result = min((fragColor  + ssdo), vec3(1.0, 1.0, 1.0)) * ao;
    // gl_FragColor = vec4(result, 1);
    gl_FragColor = vec4(ssdo, ao);
    // gl_FragColor = vec4(ao, ao, ao, 1);

}