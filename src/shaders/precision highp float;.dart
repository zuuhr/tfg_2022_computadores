precision highp float;
    
        // Built In
        varying vec2 vUV; // TexCoords
        uniform sampler2D textureSampler;
        uniform mat4 projection;
        uniform mat4 worldViewProjection;
        uniform mat4 view;
        
        // Attributes
        attribute vec3 position;
        attribute vec3 normal;
        
        // Uniforms
        uniform sampler2D textureNoise;
        uniform sampler2D textureDepth;
        uniform vec2 noiseScale;
        uniform vec3 samples[16];
        uniform float near;
        uniform float far;

        const float radius = 0.006;

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
        vec3 reconstructPosition(vec2 uv, float z, mat4 InvVP)
        {
            float x = uv.x * 2.0f - 1.0f;
            float y = (1.0 - uv.y) * 2.0f - 1.0f;
            vec4 position_s = vec4(x, y, z, 1.0f);
            vec4 position_v = InvVP * position_s;
            return position_v.xyz / position_v.w;
        }
        float depthToZ(float depth){
            float z_ndc = 2.0 * depth - 1.0;
            float z_eye = 2.0 * near * far / (far + near - z_ndc * (far - near));
            return -z_eye;
        }
        void main(void){

            float depth = texture2D(textureDepth, vUV).r;
            depth = depthToZ(depth);
            depth = abs(depth / far);
            // vec3 fragPos = texture2D(textureDepth, vUV).xyz;
            // xy from view and z from depth
            vec3 fragPos = vec3(vUV, depth);
            vec3 fragN = normalFromDepth(vUV, depth);
            // fragN = reconstructPosition(vUV, depth, inverse(projection));
            vec3 randomVec = texture2D(textureNoise, vUV * noiseScale).xyz;

            vec3 tangent = normalize(randomVec - fragN * dot(randomVec, fragN));
            vec3 bitangent = cross(fragN, tangent);
            mat3 TBN = mat3(tangent, bitangent, fragN);


            float rad = 0.5;
            float occlusion = 0.0;
            float accumDepth = 0.0;
            vec3 accumPos = vec3(0.0);
            for(int i = 0; i < 16; i++){
                vec3 samplePos = TBN * samples[i];
                samplePos = fragPos + samplePos * rad;

                ///transform sample to screen space
                vec4 offset = vec4(samplePos, 1.0);
                offset = projection * offset; //from view to clip-space
                offset.xyz /= offset.w;
                offset.xyz = offset.xyz * 0.5 + 0.5;

                float bias = 0.0025;
                float sampleDepth = texture2D(textureDepth, offset.xy).z;
                occlusion += (sampleDepth >= samplePos.z + bias ? 1.0 : 0.0);

                accumDepth += sampleDepth;
                accumPos += offset.xyz;
                
            }


            occlusion = 1.0 - (occlusion / 16.0);

            gl_FragColor =  vec4(depth, depth, depth, 1.0);
            // gl_FragColor = vec4(fragN, 1.0);
            // gl_FragColor = vec4(randomVec, 1.0);
            // gl_FragColor = vec4(accumDepth);
            // gl_FragColor = vec4(accumPos, 1.0);

            }