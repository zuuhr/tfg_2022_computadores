using System.Collections;
using System.Collections.Generic;
using UnityEngine;

public class SSAO : MonoBehaviour
{
    private Vector4[] _kernelSphere;
    [SerializeField] private int _numSamples = 16;
    // public Material ssaoMat;

    void Update(){
        // Debug.Log("asdfsadf");
        _kernelSphere = new Vector4[_numSamples];

        for(int index = 0; index < _numSamples; index++){
            Vector2 sample = new Vector2(Random.value * 2.0f - 1.0f, Random.value * 2.0f - 1.0f);
            sample.Normalize();

            float scale = index / (float) _numSamples;

            scale = Mathf.Lerp(0.1f, 1.0f, scale * scale);
            sample.Scale(new Vector2(scale, scale));

            sample.x = Mathf.Round(sample.x * 1000.0f) * 0.001f;
            sample.y = Mathf.Round(sample.y * 1000.0f) * 0.001f;

            _kernelSphere[index].x = sample.x;
            _kernelSphere[index].y = sample.y;

            Debug.Log(_kernelSphere[index].x);
            // Debug.Log(Random.value * 2.0f - 1.0f);
        }
        

        Shader.SetGlobalVectorArray("kernelSphere", _kernelSphere);
    }

}
