const Default = 'Blit shader';
export default Default;

//	https://github.com/NewChromantics/PopUnity/blob/master/PopYuv.cginc
export const FragSource = `

#version 100
precision highp float;
varying vec2 uv;
uniform sampler2D Luma;
uniform sampler2D Plane1;
uniform sampler2D Plane2;
uniform int PlaneCount;

struct YuvColourParams
{
	float LumaMin;
	float LumaMax;
	float ChromaVRed;
	float ChromaUGreen;
	float ChromaVGreen;
	float ChromaUBlue;
};

YuvColourParams GetDefaultYuvColourParams()
{
	YuvColourParams Params;
	Params.LumaMin = 16.0/255.0;
	Params.LumaMax = 253.0/255.0;
	Params.ChromaVRed = 1.5958;
	Params.ChromaUGreen = -0.81290;
	Params.ChromaVGreen = -0.81290;
	Params.ChromaUBlue = 2.017;
	return Params;
}

vec3 LumaChromaUV_To_Rgb(float Luma,float ChromaU,float ChromaV,YuvColourParams Params)
{
	//	0..1 to -0.5..0.5
	vec2 ChromaUV = vec2(ChromaU,ChromaV);
	ChromaUV -= 0.5;

	//	set luma range
	Luma = mix(Params.LumaMin, Params.LumaMax, Luma);
	vec3 Rgb;
	Rgb.x = Luma + (Params.ChromaVRed * ChromaUV.y);
	Rgb.y = Luma + (Params.ChromaUGreen * ChromaUV.x) + (Params.ChromaVGreen * ChromaUV.y);
	Rgb.z = Luma + (Params.ChromaUBlue * ChromaUV.x);
	
	
	return Rgb;
}

void main()
{
	vec2 SampleUv = vec2(uv.x,1.0-uv.y);

	if ( PlaneCount == 1 )
	{
		gl_FragColor = texture2D( Luma, SampleUv );
		return;
	}
		
	//	gr: get correct flip/rotation!
	float Lumaf = texture2D( Luma, SampleUv ).x;
	//float ChromaUf = texture2D( Plane1, SampleUv ).x;
	//float ChromaVf = texture2D( Plane2, SampleUv ).x;
	vec2 ChromaUVf = texture2D( Plane1, SampleUv ).xy;
	float ChromaUf = ChromaUVf.x;
	float ChromaVf = ChromaUVf.y;
	
	YuvColourParams YuvParams = GetDefaultYuvColourParams();
	gl_FragColor.xyz = LumaChromaUV_To_Rgb( Lumaf, ChromaUf, ChromaVf, YuvParams );
	gl_FragColor.w = 1.0;
}
`;


export const VertSource =`
#version 100
precision highp float;
attribute vec3 LocalUv;
attribute vec3 LocalPosition;
varying vec2 uv;
void main()
{
	gl_Position = vec4(LocalPosition,1);
	gl_Position.z = 0.0;
	uv = LocalUv.xy;
}
`;

