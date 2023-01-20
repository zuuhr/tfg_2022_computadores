precision highp float;
        
uniform sampler2D textureSampler;
uniform sampler2D depthTex;
uniform sampler2D normalTex;
uniform sampler2D noiseTex;
uniform vec2 noiseTiling;

uniform mat4 projection;

uniform vec3 pointLight;
uniform vec3 lightColor;

uniform float aoRadius;
uniform float ssdoRadius;
uniform float ssdoIntensity;
uniform float aoIntensity;
uniform int numSamples;
uniform vec3 kernelSphere[16]; //SAME AS numSamples

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

    vec3 fragColor = texture2D(textureSampler, vUV).xyz;
    vec3 VS_fragPos = VSPositionFromDepth(vUV);
    
    // View Space Normal DONT NORMALIZE
    vec3 fragN = texture2D(normalTex, vUV).xyz;

    float noise = texture2D(noiseTex, vUV * noiseTiling).x;
    noise = noise * 2.0 - 1.0;


    //The further the distance the bigger the radius in view space 
    float aoScale = aoRadius / VS_fragPos.z; 
    float ssdoScale = ssdoRadius / VS_fragPos.z; 
 
    float ao = 0.0;
    vec3 ssdo = vec3(0.0, 0.0, 0.0);
    for(int i = 0; i < numSamples; i++){

        vec2 aoSampleCoord = kernelSphere[i].xy * aoScale * noise;
        vec3 VS_offsetPos = VSPositionFromDepth(vUV + aoSampleCoord);

        vec3 diff = VS_offsetPos - VS_fragPos;
        float dist = abs(VS_offsetPos.z - VS_fragPos.z);
        dist *= 50000.0;
        // dist = dist > 0.0001 ? 1000000.0 : dist;
        float rangeCheck = (1.0 / (1.0 + dist));
        float aofragNAngle = dot(fragN, normalize(diff)) - 0.2;

        ao += aofragNAngle * rangeCheck;



        vec2 ssdoSampleCoord = kernelSphere[i].xy * ssdoScale * noise;

        vec3 offsetPos = VSPositionFromDepth(vUV + ssdoSampleCoord);
        vec3 offsetN = texture2D(normalTex, vUV + ssdoSampleCoord).xyz;
        vec3 offsetColor = (texture2D(textureSampler, vUV + ssdoSampleCoord).xyz + lightColor) * lightColor;

        vec3 difference = offsetPos - VS_fragPos;

        float offsetNAngle = clamp(dot(offsetN, -normalize(difference)), 0.0, 1.0);
        float fragNAngle =  clamp(dot(fragN, normalize(difference)), 0.0, 1.0);

        // ssdo += offsetNAngle * fragNAngle * offsetColor * rangeCheck * ssdoIntensity;
        ssdo += offsetNAngle * fragNAngle * offsetColor * rangeCheck;
    }
    ao /= 16.0;
    ao = max(ao, 0.0);
    ao = 1.0 - (ao * aoIntensity);
    // ssdo = fragColor * ssdo / 16.0;
    ssdo = (ssdo / 16.0) * ssdoIntensity;

    gl_FragColor = vec4(ssdo,  ao);
}