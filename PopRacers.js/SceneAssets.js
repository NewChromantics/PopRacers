import {CreateCubeGeometry} from './PopEngineCommon/CommonGeometry.js'
import {GeoVertGlsl} from './Assets/Geo.Vert.glsl.js'
import {ExtractShaderUniforms} from './PopEngineCommon/Shaders.js'


const Default = 'SceneAssets.js';
export default Default;
 
const CubeShader_FragSource = `
#version 100
precision highp float;
varying vec2 FragLocalUv;
void main()
{
	gl_FragColor = vec4( FragLocalUv, 1.0, 1 );
}
`;


const WorldGeoShader_FragSource = `
#version 100
precision highp float;
varying vec2 FragLocalUv;
varying vec3 WorldPosition;
void main()
{
	gl_FragColor = vec4( FragLocalUv, 1.0, 1 );
	
	vec3 xyz = WorldPosition.xyz * 40.0;
	xyz = fract(xyz);
	bool x = xyz.x < 0.5;
	bool y = xyz.z < 0.5;
	if ( x == y )
		discard;
}
`;


const CubeShader_VertSource = GeoVertGlsl;
const WorldGeoShader_VertSource = GeoVertGlsl;
const WorldGeoShader_AttribNames = ['LocalPosition'];

let WorldGeoShader = null;

let BlitShader = null;
//	todo: get rid of this requirement from sokol
/*
const BlitShaderUniforms = 
[
	{Name:'Image',Type:'sampler2D'},
];
*/
let CubeShader = null;
//	todo: get rid of this requirement from sokol
const CubeShaderUniforms = 
[
	{Name:'Image',Type:'sampler2D'},
];

let ScreenQuad = null;
let ScreenQuad_AttribNames = [];
let CubeTriangleBuffer = null;
let Cube_AttribNames = [];

const BlitShader_VertSource =`
#version 100
precision highp float;
attribute vec3 LocalUv;
attribute vec3 LocalPosition;
varying vec2 uv;
void main()
{
	gl_Position = vec4(LocalPosition,1);
	gl_Position.z = 0.999;
	uv = LocalUv.xy;
}
`;

const BlitShader_FragSource =`
#version 100
precision highp float;
varying vec2 uv;
uniform sampler2D Image;
void main()
{
	gl_FragColor = texture2D( Image, vec2(uv.x,1.0-uv.y) );
}
`;



function GetScreenQuad(MinX,MinY,MaxX,MaxY,TheZ=0)
{
	let Positions = [];
	let TexCoords = [];
	
	function AddTriangle(a,b,c)
	{
		Positions.push( ...a.slice(0,3) );
		Positions.push( ...b.slice(0,3) );
		Positions.push( ...c.slice(0,3) );
		
		const TriangleIndex = Positions.length / 3;
		function PosToTexCoord(xyzuv)
		{
			const u = xyzuv[3];
			const v = xyzuv[4];
			const w = TriangleIndex;
			return [u,v,w];
		}
		
		TexCoords.push( ...PosToTexCoord(a) );
		TexCoords.push( ...PosToTexCoord(b) );
		TexCoords.push( ...PosToTexCoord(c) );
	}
	
	let tr = [MaxX,MinY,TheZ,	1,0];
	let tl = [MinX,MinY,TheZ,	0,0];
	let br = [MaxX,MaxY,TheZ,	1,1];
	let bl = [MinX,MaxY,TheZ,	0,1];
	
	AddTriangle( tl, tr, br );
	AddTriangle( br, bl, tl );
	
	const Geometry = {};
	Geometry.LocalPosition = {};
	Geometry.LocalPosition.Data = new Float32Array( Positions );
	Geometry.LocalPosition.Size = 3;

	Geometry.LocalUv = {};
	Geometry.LocalUv.Data = new Float32Array( TexCoords );
	Geometry.LocalUv.Size = 3;

	return Geometry;
}



export async function LoadAssets(RenderContext)
{
	if ( !ScreenQuad )
	{
		const Geometry = GetScreenQuad(-1,-1,1,1);
		ScreenQuad_AttribNames = Object.keys(Geometry);
		ScreenQuad =  await RenderContext.CreateGeometry( Geometry, undefined );
	}

	if ( !CubeTriangleBuffer )
	{
		const CubeSize = 0.01;
		const Geometry = CreateCubeGeometry(-CubeSize,CubeSize);
		CubeTriangleBuffer = await RenderContext.CreateGeometry(Geometry,undefined);
		Cube_AttribNames = Object.keys(Geometry);
	}

	if ( !BlitShader && ScreenQuad )
	{
		const FragSource = BlitShader_FragSource;
		const VertSource = BlitShader_VertSource;
		const ShaderUniforms = ExtractShaderUniforms(VertSource,FragSource);
		BlitShader = await RenderContext.CreateShader(VertSource,FragSource,ShaderUniforms,ScreenQuad_AttribNames);
	}
	
	if ( !CubeShader && CubeTriangleBuffer )
	{
		const FragSource = CubeShader_FragSource;
		const VertSource = CubeShader_VertSource;
		const ShaderUniforms = ExtractShaderUniforms(VertSource,FragSource);
		CubeShader = await RenderContext.CreateShader(VertSource,FragSource,ShaderUniforms,Cube_AttribNames);
	}
	
	if ( !WorldGeoShader )
	{
		const FragSource = WorldGeoShader_FragSource;
		const VertSource = WorldGeoShader_VertSource;
		const ShaderUniforms = ExtractShaderUniforms(VertSource,FragSource);
		WorldGeoShader = await RenderContext.CreateShader(VertSource,FragSource,ShaderUniforms,WorldGeoShader_AttribNames);
	}
}

export function GetAssets()
{
	const Assets = {};
	Assets.ScreenQuad = ScreenQuad;
	Assets.BlitShader = BlitShader;
	
	Assets.CubeGeo = CubeTriangleBuffer;
	Assets.CubeShader = CubeShader;
	
	Assets.WorldGeoShader = WorldGeoShader;
	
	return Assets;
}
