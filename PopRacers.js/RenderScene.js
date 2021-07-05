import * as SceneAssets from './SceneAssets.js'
import * as Xr from './XrFrame.js'
import {CreateRandomImage} from './PopEngineCommon/Images.js'
import {CreateIdentityMatrix,MatrixInverse4x4} from './PopEngineCommon/Math.js'
import {Camera as PopCamera} from './PopEngineCommon/Camera.js'

const Default = 'RenderScene.js';
export default Default;

let LastXrBackgroundImage = CreateRandomImage(128,128);
let LastXrCamera = new PopCamera();
LastXrCamera.Position = [0,0,1.414];

const WorldGeos = {};	//	[uuid] = { .Anchor=Anchor_t, .TriangleBuffer, .AttribNames }

async function XrThread()
{
	while(true)
	{
		const Frame = await Xr.WaitForNextFrame();
		LastXrBackgroundImage = Frame.Image;
		LastXrCamera = Frame.Camera;
	}
}
XrThread().catch(Pop.Warning);



export async function LoadAssets(RenderContext)
{
	await SceneAssets.LoadAssets(RenderContext);
	await LoadWorldGeos(RenderContext);
}

//	get render commands in current state
export function GetRenderCommands(FrameNumber)
{
	let Commands = [];
	const Blue = (FrameNumber % 60)/60;
	const ClearColour = [Blue,1,0];
	Commands.push(['SetRenderTarget',null,ClearColour]);
	
	
	{
		let Camera = LastXrCamera;
		//let Camera = null;
		let SceneCommands = GetSceneRenderCommands(Camera);
		Commands.push( ...SceneCommands );
	}
	
	return Commands;
}


function GetSceneRenderCommands(Camera)
{
	const Assets = SceneAssets.GetAssets();
	const Commands = [];
	
	if ( false )
	{
		const Uniforms = {};
		Uniforms.Image = LastXrBackgroundImage;
		Commands.push( ['Draw',Assets.ScreenQuad,Assets.BlitShader,Uniforms] );
	}
	
	if ( Camera )
	{
		const Uniforms = {};
		
		//const RenderTargetRect = [0,0,1280,720];
		const RenderTargetRect = [0,0,1,1];
		//const RenderTargetRect = [0,0,1,720/1280];
		const WorldToCameraMatrix = Camera.GetWorldToCameraMatrix();
		const CameraProjectionMatrix = Camera.GetProjectionMatrix( RenderTargetRect );
		const CameraToWorldTransform = MatrixInverse4x4( WorldToCameraMatrix );
		
		const LocalToWorldTransform = CreateIdentityMatrix();//Actor.GetLocalToWorldTransform();
	
		Uniforms.LocalToWorldTransform = LocalToWorldTransform;
		Uniforms.WorldToCameraTransform = WorldToCameraMatrix;
		Uniforms.CameraProjectionTransform = CameraProjectionMatrix;
		
		Commands.push( ['Draw',Assets.CubeGeo,Assets.CubeShader,Uniforms] );
		
		
		for ( let WorldGeo of Object.values(WorldGeos) )
		{
			if ( !WorldGeo.TriangleBuffer )
				continue;
			const GeoUniforms = Object.assign({},Uniforms);
			//GeoUniforms.LocalToWorldTransform = WorldGeo.LocalToWorld;
			Commands.push( ['Draw',WorldGeo.TriangleBuffer,Assets.WorldGeoShader,GeoUniforms] );
		}
		
	}
	
	
	
	return Commands;
}




async function LoadWorldGeos(RenderContext)
{
	//	load triangle buffers for any geo that needs it
	for ( let Geo of Object.values(WorldGeos) )
	{
		if ( Geo.TriangleBuffer )
			continue;
		
		const Geometry = Geo.Anchor.Geometry;
		Geo.AttribNames = Object.keys(Geometry);
		Geo.TriangleBuffer =  await RenderContext.CreateGeometry( Geometry, undefined );
	}

}

async function UpdateWorldGeoThread()
{
	while ( true )
	{
		const NewAnchor = await Xr.WaitForNewGeometry();
		Pop.Debug(`New World Geo`);
		const Geo = {};
		Geo.Anchor = NewAnchor;
		Geo.TriangleBuffer = null;
		Geo.AttribNames = null;
		WorldGeos[NewAnchor.Uuid] = Geo;
	}
}
UpdateWorldGeoThread().catch(Pop.Warning);
