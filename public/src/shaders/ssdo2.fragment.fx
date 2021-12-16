
precision highp float;
 
varying vec2 vUV;
 
uniform sampler2D textureSampler;
 
 
 
void main(void) {
    float depth = texture2D(textureSampler, vUV).r ;
    vec3 position = vec3(vUV, depth);
	vec3 normal = normalFromDepth(depth, vUV);

    
    gl_FragColor = texture2D(textureSampler, vUV) + vec4(0.5);
 
}