`
            precision highp float;

        // Samplers
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


        vec3 normalFromDepth(vec2 coords, float depth){
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

        void main(void) 
        {
            // // //depth buffer check
            // // float depthTest = texture2D(textureSampler, vUV).r * 1000.0;
            // // gl_FragColor = vec4(depthTest, depthTest, depthTest, 1);

            // //gl_FragColor = normalize(texture2D(textureSampler, vUV));
            
            // float depth = texture2D(textureSampler, vUV).r;
            // vec3 fragPos = vec3(vUV, depth);
            // vec3 fragN = normalFromDepth(vUV, depth);
            // vec3 randomVec = normalize(texture2D(randomSampler, vUV * randTextureTiles).rgb);
            
            // //to scale it right?
            // float radiusDepth = radius / depth; 
            // //IMPORTANTE
            // float occlusion = 0.0;
            
            
            // vec3 ray;
            // vec3 hemiRay;
            // float occlusionDepth;
            // float difference;
            // depth = depth * 1000.0;
            
            // for (int i = 0; i < 16; i++){
            //     ray = radiusDepth * reflect(kernelSphere[i], randomVec);
            //     hemiRay = fragPos + sign(dot(ray, fragN)) * ray;
            //     occlusionDepth = texture2D(textureSampler, clamp(hemiRay.xy, vec2(0.001, 0.001), vec2(0.999, 0.999))).r;
            //     difference = depth - occlusionDepth;
                
            //     //range check
            //     occlusion += step(fallOff, difference) * (1.0 - smoothstep(fallOff, area, difference));
            // }
            // //ao contribution of sample fromm all samples
            // float ao = 1.0 - totalStrength * occlusion * samplesFactor;
	        // float result = clamp(ao + base, 0.0, 1.0);

            // gl_FragColor.rgb = vec3(result);
            // gl_FragColor.a = 1.0;

            // //gl_FragColor = texture2D(textureSampler, vUV) * vec4(1000);
            // float depthTest = texture2D(textureSampler, vUV).r * 1000.0;
            gl_FragColor = vec4(depthTest, depthTest, depthTest, 1);
        }
        `