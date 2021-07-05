import {CreateCubeGeometry} from './PopEngineCommon/CommonGeometry.js'

const Default = 'SceneAssets.js';
export default Default;


let BlitShader = null;
//	todo: get rid of this requirement from sokol
const BlitShaderUniforms = 
[
	{Name:'Image',Type:'sampler2D'},
];

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
	gl_Position.z = 0.5;
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
	gl_FragColor = texture2D( Image, uv );
}
`;

const CubeShader_VertSource =`
#version 100
precision highp float;
attribute vec3 LocalUv;
attribute vec3 LocalPosition;
varying vec2 uv;
void main()
{
	gl_Position = vec4(LocalPosition,1);
	gl_Position.z = 0.5;
	uv = LocalUv.xy;
}
`;

const CubeShader_FragSource =`
#version 100
precision highp float;
varying vec2 uv;
uniform sampler2D Image;
void main()
{
	gl_FragColor = texture2D( Image, uv );
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
	Geometry.Positions = Positions;
	Geometry.PositionSize = 3;
	Geometry.TexCoords = TexCoords;
	return Geometry;
}


//	gr: this is very old conversion
//		now should be named attribs when coming in
async function CreateTriangleBuffer(RenderContext,Geometry,GeometryAttribNames)
{
	//	auto-calc triangle counts or vertex sizes etc
	if ( !Geometry.TriangleCount )
	{
		if ( Geometry.PositionSize && Geometry.Positions )
		{
			Geometry.TriangleCount = Geometry.Positions.length / Geometry.PositionSize;
		}
		else
		{
			throw `Cannot determine trianglecount/vertex attribute size for geometry`;
		}
	}
	
	const VertexAttribs = [];
	const LocalPosition = {};
	//	gr: should engine always just figure this out?
	LocalPosition.Size = Geometry.Positions.length / Geometry.TriangleCount;
	LocalPosition.Data = new Float32Array( Geometry.Positions );
	VertexAttribs['LocalPosition'] = LocalPosition;
	
	if ( Geometry.TexCoords )
	{
		const Uv0 = {};
		Uv0.Size = Geometry.TexCoords.length / Geometry.TriangleCount;
		Uv0.Data = new Float32Array( Geometry.TexCoords );
		VertexAttribs['LocalUv'] = Uv0;
	}
	
	//const TriangleIndexes = new Int32Array( Geometry.TriangleIndexes );
	const TriangleIndexes = undefined;
	const TriangleBuffer = await RenderContext.CreateGeometry( VertexAttribs, TriangleIndexes );
	
	//	these need to be in the right order...
	//	that depends what order thejs lib reads VertexAttribs in CreateGeometry...
	//	TriangleBuffer isn't an object either...
	//	gr: these aren't being set on the object (sealed??)
	//TriangleBuffer.AttribNames = Object.keys(VertexAttribs);
	GeometryAttribNames.push( ...Object.keys(VertexAttribs) );
	
	return TriangleBuffer;
}


export async function LoadAssets(RenderContext)
{
	if ( !ScreenQuad )
	{
		const Geometry = GetScreenQuad(-1,-1,1,1);
		ScreenQuad = await CreateTriangleBuffer(RenderContext,Geometry,ScreenQuad_AttribNames);
	}
	/*
	if ( !CubeTriangleBuffer )
	{
		const Geometry = CreateCubeGeometry();
		CubeTriangleBuffer = await CreateTriangleBuffer(RenderContext,Geometry,Cube_AttribNames);
	}
*/
	if ( !BlitShader && ScreenQuad )
	{
		const FragSource = BlitShader_FragSource;
		const VertSource = BlitShader_VertSource;
		//	gr: this attrib order is important...
		const BlitShaderAttribs = ['LocalPosition','LocalUv'];//ScreenQuad.AttribNames;
		Pop.Debug(`BlitShaderAttribs=${BlitShaderAttribs} ScreenQuad.AttribNames=${ScreenQuad.AttribNames} ScreenQuad_AttribNames=${ScreenQuad_AttribNames}`);
		BlitShader = await RenderContext.CreateShader(VertSource,FragSource,BlitShaderUniforms,BlitShaderAttribs);
		Pop.Debug(`BlitShader=${BlitShader}`);
	}
}

export function GetAssets()
{
	const Assets = {};
	Assets.ScreenQuad = ScreenQuad;
	Assets.BlitShader = BlitShader;
	//Assets.Cube = CubeTriangleBuffer;
	//Assets.CubeShader = CubeShader;
	return Assets;
}
