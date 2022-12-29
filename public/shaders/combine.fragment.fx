precision highp float;
        
uniform sampler2D textureSampler;
uniform sampler2D ssdoTex;

in vec2 vUV;

void main(){
    vec3 baseColor = texture2D(textureSampler, vUV).rgb;
    vec3 ssdo = texture2D(ssdoTex, vUV).rgb;
    float ao = texture2D(ssdoTex, vUV).a;
    gl_FragColor = vec4(min((baseColor  + ssdo), vec3(1.0, 1.0, 1.0)) * ao, 1.0);
    gl_FragColor = vec4((vec3(1.0) - ((vec3(1.0) - ssdo) * (vec3(1.0) - baseColor))) * ao, 1.0);
    // gl_FragColor = vec4(min((baseColor  + ssdo), vec3(1.0, 1.0, 1.0)), 1.0);
    // gl_FragColor = vec4(baseColor * ao, 1.0);
    // gl_FragColor = vec4(ao, ao, ao, 1.0);
}