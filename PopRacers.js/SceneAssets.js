import {CreateCubeGeometry} from './PopEngineCommon/CommonGeometry.js'
import GeoVertGlsl from './Assets/Geo.Vert.glsl.js'
import {ExtractShaderUniforms} from './PopEngineCommon/Shaders.js'
import * as BlitShaderSource from './Assets/BlitYuv.Frag.glsl.js'

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
varying vec3 WorldUp;

const vec3 Blue = vec3(1,0,0);
const vec3 Green = vec3(0,1,0);
void main()
{
	bool Horizontal = abs(dot( WorldUp, vec3(0,1,0) )) > 0.5;
	vec3 Colour = Horizontal ? Green : Blue;
	//vec3 Colour = vec3( FragLocalUv, 1.0 );
	//vec3 Colour = vec3( WorldPosition );
	//vec3 Colour = (WorldUp+vec3(0.5,0.5,0.5)) / 2.0;	//	show normal
	gl_FragColor = vec4( Colour, 1 );
	
	vec3 xyz = WorldPosition.xyz * 40.0;
	xyz = fract(xyz);
	bool x = xyz.x < 0.5;
	bool y = (Horizontal ? xyz.z : xyz.y) < 0.5;
	if ( x == y )
		discard;
}
`;


const CubeShader_VertSource = GeoVertGlsl;
const WorldGeoShader_VertSource = GeoVertGlsl;
const WorldGeoShader_AttribNames = ['LocalPosition'];

let WorldGeoShader = null;
let BlitShader = null;
let CubeShader = null;

let ScreenQuad = null;
let ScreenQuad_AttribNames = [];
let CubeTriangleBuffer = null;
let Cube_AttribNames = [];


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
		const CubeSize = 0.015;
		const Geometry = CreateCubeGeometry(-CubeSize,CubeSize);
		CubeTriangleBuffer = await RenderContext.CreateGeometry(Geometry,undefined);
		Cube_AttribNames = Object.keys(Geometry);
	}

	if ( !BlitShader && ScreenQuad )
	{
		const FragSource = BlitShaderSource.FragSource;
		const VertSource = BlitShaderSource.VertSource;
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
