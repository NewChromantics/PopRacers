const Default = 'SceneAssets.js';
export default Default;


let TestShader = null;
//	todo: get rid of this requirement from sokol
const TestShaderUniforms = 
[
/*
	{Name:'ColourA',Type:'vec4'},
	{Name:'ColourB',Type:'vec4'},
	{Name:'ImageA',Type:'sampler2D'},
	{Name:'ImageB',Type:'sampler2D'},
	{Name:'ImageC',Type:'sampler2D'},
	{Name:'ImageD',Type:'sampler2D'},
	{Name:'ImageE',Type:'sampler2D'},
	{Name:'ImageF',Type:'sampler2D'},
	{Name:'ImageG',Type:'sampler2D'},
	{Name:'MouseUv',Type:'vec2'},
	*/
];

let ScreenQuad = null;
let ScreenQuad_Attribs = null;


const TestShader_VertSource =`
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

const TestShader_FragSource =`
#version 100
precision highp float;
varying vec2 uv;
void main()
{
	gl_FragColor = vec4( uv, 0, 1 );
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


async function CreateTriangleBuffer(RenderContext,Geometry)
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
	ScreenQuad_Attribs = Object.keys(VertexAttribs);
	
	return TriangleBuffer;
}

async function GetScreenQuad_TriangleBuffer(RenderContext)
{
	//const Geometry = GetScreenQuad(-0.5,-0.5,0.5,0.5,0.5);
	const Geometry = GetScreenQuad(-1,-1,1,1);
	const Buffer = CreateTriangleBuffer(RenderContext,Geometry);
	return Buffer;
}



export async function LoadAssets(RenderContext)
{
	if ( !ScreenQuad )
		ScreenQuad = await GetScreenQuad_TriangleBuffer(RenderContext);

	if ( !TestShader )
	{
		const FragSource = TestShader_FragSource;
		const VertSource = TestShader_VertSource;
		const TestShaderAttribs = ScreenQuad_Attribs;
		TestShader = await RenderContext.CreateShader(VertSource,FragSource,TestShaderUniforms,TestShaderAttribs);
		Pop.Debug(`TestShader=${TestShader}`);
	}
}

export function GetAssets()
{
	const Assets = {};
	Assets.ScreenQuad = ScreenQuad;
	Assets.TestShader = TestShader;
	return Assets;
}
