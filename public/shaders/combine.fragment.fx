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
    // gl_FragColor = vec4((vec3(1.0) - ((vec3(1.0) - ssdo) * (vec3(1.0) - baseColor))), 1.0);
    // gl_FragColor = (vec4(0.5, 0.5, 0.5, 0.0) + vec4(ssdo, 1)) * ao;
    //La energía se suma
    gl_FragColor = vec4((baseColor + ssdo) * ao, 1.0);
    // gl_FragColor = vec4((vec3(0.5) + ssdo) * ao, 1.0);
    gl_FragColor = vec4((vec3(0.5) ) * ao, 1.0);
    // gl_FragColor = vec4(ssdo, 1.0);
    // gl_FragColor = vec4(min((baseColor  + ssdo), vec3(1.0, 1.0, 1.0)), 1.0);
    // gl_FragColor = vec4(baseColor * ao, 1.0);
    // gl_FragColor = vec4(baseColor, 1.0);
    // gl_FragColor = vec4(ao, -ao, 0.0, 1.0);
    // gl_FragColor = vec4(ao, ao, ao, 1.0);
    
}