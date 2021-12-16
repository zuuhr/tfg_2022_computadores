
precision highp float;
 
varying vec2 vUV;
 
uniform sampler2D textureSampler;
 
 
 
void main(void) {
    float depthTest = texture2D(textureSampler, vUV).r * 100.0;
    gl_FragColor = vec4(depthTest, depthTest, depthTest, 1);
    // gl_FragColor = texture2D(textureSampler, vUV);
 
}
