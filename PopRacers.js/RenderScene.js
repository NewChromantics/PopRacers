import Pop from './PopEngineCommon/PopEngine.js'
import * as SceneAssets from './SceneAssets.js'
import * as Xr from './XrFrame.js'
import {CreateRandomImage} from './PopEngineCommon/Images.js'
import {CreateTranslationMatrix,CreateIdentityMatrix,MatrixInverse4x4} from './PopEngineCommon/Math.js'
import * as PopMath from './PopEngineCommon/Math.js'
import {Camera as PopCamera} from './PopEngineCommon/Camera.js'
import WorldGeo_t from './WorldGeo.js'
import {CreateQuad3Geometry} from './PopEngineCommon/CommonGeometry.js'

const Default = 'RenderScene.js';
export default Default;

const RenderOriginCube = false;
let RayHitCubePositions = [];

const InitialXrFrame = {};
InitialXrFrame.Camera = new PopCamera();
InitialXrFrame.Camera.Position = [0,0.2,0.3];
InitialXrFrame.Camera.FovVertical = 60;
InitialXrFrame.Planes = [CreateRandomImage(512,512)];

//	pending
let XrFrames = [InitialXrFrame];	//	always keep one to render

function GetXrFrame()
{
	//	latest one
	//	gr: should we use [0] in case it changes mid-render-command gather?
	return XrFrames[XrFrames.length-1];
}

const WorldGeos = {};	//	[uuid] = WorldGeo_t


async function XrThread()
{
	while(true)
	{
		const Frame = await Xr.WaitForNextFrame();
		
		XrFrames.push(Frame);
	}
}
XrThread().catch(Pop.Warning);

export function PostRender()
{
	//	should be able to delete frames we've rendered now...
}

//	flip new to old images/camera
function UpdateXrCamera()
{
	const DeletedFrames = XrFrames.splice( 0, XrFrames.length-1 );
	
	function OnDeletedFrame(Frame)
	{
		//	gr: free old (unused!) images manually to help avoid exhausting, rather than wait on garbage collector
		Frame.Planes.forEach( Image => {	if ( Image && Image.Clear )	Image.Clear() } );
	}
	DeletedFrames.forEach( OnDeletedFrame );
}

export async function LoadAssets(RenderContext)
{
	await SceneAssets.LoadAssets(RenderContext);
	await LoadWorldGeos(RenderContext);
}

//	get render commands in current state
export function GetRenderCommands(FrameNumber,ScreenRect)
{
	let Commands = [];
	const Blue = (FrameNumber % 60)/60;
	const ClearColour = [Blue,0,1];
	Commands.push(['SetRenderTarget',null,ClearColour]);
	
	UpdateXrCamera();
	
	{
		let Camera = GetXrFrame().Camera;
		
		//let Camera = null;
		let SceneCommands = GetSceneRenderCommands(Camera,ScreenRect);
		Commands.push( ...SceneCommands );
	}
	
	return Commands;
}


function GetSceneRenderCommands(Camera,ScreenRect)
{
	const Assets = SceneAssets.GetAssets();
	const Commands = [];
	const XrFrame = GetXrFrame();
	
	//if ( false )
	{
		const Uniforms = {};
		Uniforms.Luma = XrFrame.Planes[0];
		Uniforms.Plane1 = XrFrame.Planes[1] || Uniforms.Luma;
		Uniforms.Plane2 = XrFrame.Planes[2] || Uniforms.Plane1;
		const State = {};
		State.DepthRead = false;
		State.DepthWrite = false;
		Commands.push( ['Draw',Assets.ScreenQuad,Assets.BlitShader,Uniforms,State] );
	}
	
	if ( Camera )
	{
		const Uniforms = {};
		
		//const RenderTargetRect = [0,0,1280,720];
		//const RenderTargetRect = [0,0,1,1];
		//const RenderTargetRect = [0,0,1,720/1280];
		const RenderTargetRect = [0,0,1,ScreenRect[3]/ScreenRect[2]];
		//Pop.Debug(`RenderTargetRect=${RenderTargetRect}`);
		const WorldToCameraMatrix = Camera.GetWorldToCameraMatrix();
		const CameraProjectionMatrix = Camera.GetProjectionMatrix( RenderTargetRect );
		const CameraToWorldTransform = MatrixInverse4x4( WorldToCameraMatrix );
		
		const LocalToWorldTransform = CreateIdentityMatrix();//Actor.GetLocalToWorldTransform();
	
		Uniforms.LocalToWorldTransform = LocalToWorldTransform;
		Uniforms.WorldToCameraTransform = WorldToCameraMatrix;
		Uniforms.CameraProjectionTransform = CameraProjectionMatrix;
		
		if ( RenderOriginCube )
		{
			Commands.push( ['Draw',Assets.CubeGeo,Assets.CubeShader,Uniforms] );
		}
		for ( let CubePosition of RayHitCubePositions )
		{
			const GeoUniforms = Object.assign({},Uniforms);
			GeoUniforms.LocalToWorldTransform = CreateTranslationMatrix(...CubePosition);
			Commands.push( ['Draw',Assets.CubeGeo,Assets.CubeShader,GeoUniforms] );
		}
		
		for ( let WorldGeo of Object.values(WorldGeos) )
		{
			if ( !WorldGeo.TriangleBuffer )
				continue;
			const GeoUniforms = Object.assign({},Uniforms);
			GeoUniforms.LocalToWorldTransform = WorldGeo.LocalToWorld;

			//	draw the plane geo
			Commands.push( ['Draw',WorldGeo.TriangleBuffer,Assets.WorldGeoShader,GeoUniforms] );
			//	draw a cube at its center
			//Commands.push( ['Draw',Assets.CubeGeo,Assets.CubeShader,GeoUniforms] );
		
		}
		
	}
	
	
	
	return Commands;
}




async function LoadWorldGeos(RenderContext)
{
	//	load triangle buffers for any geo that needs it
	for ( let Geo of Object.values(WorldGeos) )
	{
		await Geo.LoadAssets(RenderContext);
	}

}

async function UpdateWorldGeoThread()
{
	while ( true )
	{
		const NewAnchor = await Xr.WaitForNewGeometry();
		//Pop.Debug(`New World Geo`);
		const Geo = new WorldGeo_t(NewAnchor);
		
		if ( WorldGeos[NewAnchor.Uuid] )
			WorldGeos[NewAnchor.Uuid].Free();
			
		WorldGeos[NewAnchor.Uuid] = Geo;
		
		//	throttle this thread
		await Pop.Yield(100);
	}
}
UpdateWorldGeoThread().catch(Pop.Warning);

function RayCastToWorldGeos(WorldRay)
{
	for ( let WorldGeo of Object.values(WorldGeos) )
	{
		const Intersection = WorldGeo.GetRaycastHit(WorldRay);
		if ( Intersection )
			return Intersection;
	}
	return null;
}

function CreateRayCube(u,v,Camera,ScreenRect)
{
	//	get ray from camrea
	//const ViewRect = [0,0,1,1];
	const RenderTargetRect = [0,0,1,ScreenRect[3]/ScreenRect[2]];
		
	const WorldRay = Camera.GetScreenRay(u,v,RenderTargetRect);
	const Distance = 0.10;
	const InFront = PopMath.GetRayPositionAtTime( WorldRay.Position, WorldRay.Direction, Distance );
	
	//	raycast to geometry
	const Hit = RayCastToWorldGeos( WorldRay );
	Pop.Debug(`RayCast hit=${Hit}`);
	if ( !Hit )
		return;
	
	RayHitCubePositions.push( Hit );
}

export function OnMouseMove(x,y,Button,FirstDown=false)
{
	//	todo: get correct camera for mouse source
	const Frame = GetXrFrame();
	const RenderView = this;
	
	if ( Button == 'Left' )
	{
		const Camera = Frame.Camera;
		const Rect = RenderView.GetScreenRect();
		let u = PopMath.Range( Rect[0], Rect[0]+Rect[2], x );
		let v = PopMath.Range( Rect[1], Rect[1]+Rect[3], y );
		//	flip, same as shader, need to get a proper rotation from camera/frame
		//	gr: sort this out!
		if ( Pop.GetPlatform() != 'Web' )
		{
			v = 1 - v;
		}
		CreateRayCube( u, v, Camera, Rect );
	}
	
	if ( Button == 'Right' )
	{
		//	pan horz
		const Camera = GetXrFrame().Camera;
		let MoveScale = 0.1;
		Camera.OnCameraPanLocal( -x*MoveScale, 0, y*MoveScale, FirstDown );
	}
}

export function OnMouseDown(x,y,Button)
{
	const FirstDown = true;
	OnMouseMove.call( this, ...arguments, FirstDown );
}

export function OnMouseScroll(x,y,Button,Delta)
{
	const Camera = GetXrFrame().Camera;
	let Fly = Delta[1] * 10;
	//Fly *= Params.ScrollFlySpeed;
			
	Camera.OnCameraPanLocal( 0, 0, 0, true );
	Camera.OnCameraPanLocal( 0, 0, -Fly, false );
}

export function CreateTestPlane()
{
	const Quad = CreateQuad3Geometry();
	const LocalToWorld = PopMath.CreateIdentityMatrix();
	const Triangles = Quad.LocalPosition.Data;
	const TriangleDataSize = Quad.LocalPosition.Size;
	//	Anchor_t
	const Meta = {};
	Meta.AnchorUuid = 'TestPlane';
	Meta.AnchorType = 'ARPlaneAnchor';
	const Anchor = new Xr.Anchor_t( Meta.AnchorUuid,Triangles,TriangleDataSize,LocalToWorld,Meta);

	Xr.AddGeometryAnchor(Anchor);
}
