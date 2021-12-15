
precision highp float;
 
varying vec2 vUV;
 
uniform sampler2D textureSampler;
//SSAO Variables
uniform sampler2D randomSampler;
//8 is the number of samples
uniform vec3 kernelSphere[16]; 
uniform float randTextureTiles;
uniform float radius;
uniform float area;
uniform float fallOff;
uniform float totalStrength;
uniform float samplesFactor;
uniform float base;

vec3 normalFromDepth(float depth, vec2 coords)
{
	vec2 offset1 = vec2(0.0, radius);
	vec2 offset2 = vec2(radius, 0.0);

	float depth1 = texture2D(textureSampler, coords + offset1).r;
	float depth2 = texture2D(textureSampler, coords + offset2).r;

	vec3 p1 = vec3(offset1, depth1 - depth);
	vec3 p2 = vec3(offset2, depth2 - depth);

	vec3 normal = cross(p1, p2);
	normal.z = -normal.z;

	return normalize(normal);
} 
 
void main(void) {

    vec3 random = normalize(texture2D(randomSampler, vUV * randTextureTiles).rgb);
	float depth = texture2D(textureSampler, vUV).r ;
	vec3 position = vec3(vUV, depth);
	vec3 normal = normalFromDepth(depth, vUV);
	float radiusDepth = radius / depth ;
	float occlusion = 0.0;


	vec3 ray;
	vec3 hemiRay;
	float occlusionDepth;
	float difference;

    for (int i = 0; i < 16; i++)
	{
		ray = radiusDepth * reflect(kernelSphere[i], random);
		hemiRay = position + sign(dot(ray, normal)) * ray;

		occlusionDepth = texture2D(textureSampler, clamp(hemiRay.xy, vec2(0.001, 0.001), vec2(0.999, 0.999))).r;
		difference = depth - occlusionDepth;
        
		occlusion += step(fallOff, difference) * (1.0 - smoothstep(fallOff, area, difference));
	}

    float ao = 1.0 - totalStrength * occlusion * samplesFactor;
	float result = clamp(ao + base, 0.0, 1.0);

	gl_FragColor.r = (1.0 - smoothstep(fallOff, area, difference));
	gl_FragColor.g = 0.0;
	gl_FragColor.b = 0.0;
	gl_FragColor.a = 1.0;
    
    //depth test
    // float depthTest = texture2D(textureSampler, vUV).r * 100.0;
    // depthTest = occlusionDepth * 100.0;
    // gl_FragColor = vec4(depthTest, depthTest, depthTest, 1);
 	//gl_FragColor.rgb= vec3(vUV, depth);
    //is it working test
    // gl_FragColor = texture2D(textureSampler, vUV) + vec4(0.5);

}