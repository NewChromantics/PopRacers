import Pop from './PopEngineCommon/PopEngine.js'
import PromiseQueue from './PopEngineCommon/PromiseQueue.js'
import PopCamera from './PopEngineCommon/Camera.js'
import {CreateIdentityMatrix,MatrixInverse4x4,GetMatrixTransposed} from './PopEngineCommon/Math.js'
import {TransformPosition,Subtract3,Normalise3,Dot3} from './PopEngineCommon/Math.js'

const Default = 'XrFrame.js';
export default Default;

const IncludeNonHorizontalAnchors = false;


export class Anchor_t
{
	constructor(Uuid,Triangles,TriangleDataSize,LocalToWorld,Meta)
	{
		this.Uuid = Uuid;
		this.LocalToWorld = LocalToWorld;
		this.Triangles = new Float32Array(Triangles);
		this.TriangleDataSize = TriangleDataSize;
		this.Meta = Meta;
	}
	
	get Geometry()
	{
		const Geo = {};
		Geo.LocalPosition = {};
		Geo.LocalPosition.Size = this.TriangleDataSize;
		Geo.LocalPosition.Data = this.Triangles;
		return Geo;
	}
	
	IsHorizontal()
	{
		const Normal = this.Normal;
		const WorldUp = [0,1,0];
		const Dot = Math.abs( Dot3( Normal, WorldUp ) );
		return Dot > 0.5;
	}
	
	get Normal()
	{
		if ( !this.NormalCache )
			this.NormalCache = this.GetNormal();
		return this.NormalCache;
	}
	
	GetNormal()
	{
		//	probably should cache this
		//	gr: seems to fail with .w=0 so backup with world space subtraction
		let Up = [0,1,0,1];
		let Zero = [0,0,0,1];
		const WorldUp = TransformPosition( Up, this.LocalToWorld );
		const WorldZero = TransformPosition( Zero, this.LocalToWorld );
		const Normal = Normalise3( Subtract3( WorldUp, WorldZero ) );
		//	need to div/w?
		return Normal;
	}
};

let GeometryAnchors = {};	//	[uuid] = Anchor_t

let GeometryChangedQueue = new PromiseQueue('GeometryChangedQueue');

function GetComponentCount(Format)
{
	switch(Format)
	{
		case 'Float4':	return 4;
		case 'Float3':	return 3;
	}
	throw `Unhandled component count for format ${Format}`;
}

//	Anchor_t
export function AddGeometryAnchor(Anchor)
{
	const Uuid = Anchor.Meta.AnchorUuid;
	GeometryAnchors[Uuid] = Anchor;
	GeometryChangedQueue.Push( Anchor );
}

function OnGeometryFrame(Frame)
{
	//	{"AnchorName":"",
	//"AnchorType":"ARPlaneAnchor",
	//"AnchorUuid":"3E9826BB-3FB1-4589-878D-8AD7781D1275",
	//"LocalToWorld":[0.9980729818344116,0.06182514503598213,-0.005295906215906143,-0.5882441401481628,-0.0006530230166390538,-0.07487686723470688,-0.9971925616264343,-0.035060182213783264,-0.06204811483621597,0.9952744245529175,-0.07469220459461212,-0.5506494641304016,0,0,0,1],
	//"PendingFrames":1,
	//"Planes":[{"Channels":4,"DataSize":288,"Format":"Float4","Height":1,"Width":18}],
	//"PositionCount":0,
	//"StreamName":"Geometry"}
	const GeometryImage = Frame.Planes[0];
	const GeometryPositions = GeometryImage.GetPixelBuffer();
	const Triangles = GeometryPositions;
	const TriangleDataSize = GetComponentCount(GeometryImage.GetFormat());
	
	const Uuid = Frame.Meta.AnchorUuid;
	if ( !Uuid )
		throw `Anchor geometry has no uuid (${JSON.stringify(Frame.Meta)})`;
		
	if ( GeometryAnchors.hasOwnProperty( Uuid ) )
	{
		//	todo: check if data changed
		const Existing = GeometryAnchors[Uuid];
		if ( Existing.Triangles.length == Triangles.length )
			return;
		Pop.Debug(`Anchor(${Uuid}) triangles were x${Existing.Triangles.length}, now ${Triangles.length}`);
	}
	
	//	this transform also dictates the plane (center + up)
	let LocalToWorld = ArKitToPopTransform(Frame.Meta.LocalToWorld);
	
	const Anchor = new Anchor_t( Uuid, Triangles, TriangleDataSize, LocalToWorld, Frame.Meta );
	//	skip non horizontal anchors
	if ( !IncludeNonHorizontalAnchors )
		if ( !Anchor.IsHorizontal() )
			return;

	AddGeometryAnchor(Anchor);
	Pop.Debug(`Got geometry frame; ${JSON.stringify(Frame.Meta)}`);
}



let CameraThreadPromise;
let CameraFrameQueue = new PromiseQueue('Camera frames');
async function CameraThread()
{
	//	todo: don't loop forever
	while ( true )
	{
		try
		{
			const CameraName = 'Arkit Rear Depth';	//	gr: currently need "depth" camera to get arkit meta

			const Options = {};
			Options.Format = 'Yuv_8_88';	//	needed to start video with "Back Camera", oops
			Options.AnchorGeometryStream = true;
			//Options.WorldGeometryStream = true;
			Options.Anchors = false;

			const OnlyLatestFrame = true;
			const Device = new Pop.Media.Source(CameraName,Options, OnlyLatestFrame);
			Pop.Debug(`created device: ${Device}`);
			while ( true )
			{
				const Frame = await Device.WaitForNextFrame();
				//Pop.Debug(`Got frame ${JSON.stringify(Frame)}`);
				
				if ( Frame.Meta.StreamName == 'Geometry' )
				{
					OnGeometryFrame(Frame);
					continue;
				}
				CameraFrameQueue.Push(Frame);
			}
		}
		catch(e)
		{
			Pop.Warning(`Camera error; ${e}`);
			await Pop.Yield(5*1000);
		}
	}
}

function ArKitToPopTransform(LocalToWorld)
{
	if (LocalToWorld == null || LocalToWorld.length == 0 )
		return CreateIdentityMatrix();

	//	convert arkit to unity/pop
	function InvertZMatrix(RightHandMatrix)
	{
		if ( true )	//	col major approach
		{
			//	unity
			//	1	1	-1	1
			//	1	1	-1	1
			//	-1	-1	1	-1
			//	1	1	1	1
			
			//	this
			//	1	1	-1	1
			//	1	1	-1	1
			//	-1	-1	1	-1
			//	1	1	-1	1
			const LocalToWorld = RightHandMatrix;
			const Transform = [];
				
			Transform[0] = LocalToWorld[0];
			Transform[1] = LocalToWorld[1];
			Transform[2] = -LocalToWorld[2];
			Transform[3] = LocalToWorld[3];
			
			Transform[4] = LocalToWorld[4];
			Transform[5] = LocalToWorld[5];
			Transform[6] = -LocalToWorld[6];
			Transform[7] = LocalToWorld[7];

			Transform[8] = -LocalToWorld[8];
			Transform[9] = -LocalToWorld[9];
			Transform[10] = LocalToWorld[10];	//	do not invert this
			Transform[11] = -LocalToWorld[11];
					
			Transform[12] = LocalToWorld[12];
			Transform[13] = LocalToWorld[13];
			Transform[14] = -LocalToWorld[14];
			Transform[15] = LocalToWorld[15];
			
			return Transform;
		}
			
		//	this is now working on unity, but had the matrix transposed wrong
		//	BUT the position is now backwards compared to before
		RightHandMatrix = GetMatrixTransposed(RightHandMatrix);
		const InvertZ =
		[
			1,0,0,0,
			0,1,0,0,
			0,0,-1,0,
			0,0,0,1
		];
		let Left = MatrixMultiply4x4(InvertZ,RightHandMatrix);
		RightHandMatrix = GetMatrixTransposed(RightHandMatrix);
		return Left;
	}

	//	data comes in column major, our invert is row major
	//	gr: inverse is now column major too
	let Transform = LocalToWorld.slice();

	//	convert right hand to left, but can't quite do it in one multiply, so rebuilding matrix (which is stable)
	Transform = InvertZMatrix(Transform);

	//	gr: we seem to need to transpose to column major for opengl
	//		unity doesn't, as it stores matrixes in coloumn major (so I guess Unity's SetMatrix() maybe does conversions??)
	const TranposeLocalToWorldOut = true;
	if ( TranposeLocalToWorldOut )
		Transform = GetMatrixTransposed(Transform);
	return Transform;
}


export async function WaitForNewGeometry()
{
	const Geo = await GeometryChangedQueue.WaitForNext();
	return Geo;
}

export async function WaitForNextFrame()
{
	//	start thread if there isn't one
	if ( !CameraThreadPromise )
		CameraThreadPromise = CameraThread();

	//	ios; open camera device with ARKit
	//	wait for frames
	//	convert meta to PopCamera
	//	return image + camera
	const CameraFrame = await CameraFrameQueue.WaitForLatest();

	//Pop.Debug(JSON.stringify(Frame.Meta,null,'\t'));
	//New XR frame: {"TimeMs":1992591550,"Meta":{"Anchors":[{"LocalToWorld":[0.999936580657959,0,-0.011262161657214165,0.057931654155254364,0,1,0,-0.06849021464586258,0.011262161657214165,0,0.999936580657959,0.03380255028605461,0,0,0,1],"SessionUuid":"53D9E356-7720-72C9-AC26-1CA988DF8D36","Uuid":"96A915B0-B799-400A-81D8-0968C165A0BD"}],"Camera":{"Intrinsics":[1022.5894165039062,0,629.5763549804688,0,1022.5894165039062,352.0911560058594,0,0,1],"IntrinsicsCameraResolution":[1280,720],"LocalEulerRadians":[-0.4863026738166809,0.0014693199191242456,-0.005998630542308092],"LocalToWorld":[0.9999850392341614,0.005311899818480015,0.0012989765964448452,-0.0009464100003242493,-0.005303158890455961,0.8840510249137878,0.46736040711402893,-0.0002620592713356018,0.00133421178907156,-0.46736031770706177,0.8840659260749817,0.00033827126026153564,0,0,0,1],"ProjectionMatrix":[1.5977959632873535,0,0.015505671501159668,0,0,2.8405261039733887,-0.020580172538757324,0,0,0,-0.9999997615814209,-0.0009999998146668077,0,0,-1,0],"Tracking":"ARTrackingStateNormal","TrackingStateReason":"ARTrackingStateReasonNone"},"FeatureCount":4,"LightIntensity":947.7024078369141,"LightTemperature":5932.4140625,"PendingFrames":1,"Planes":[{"Channels":1,"DataSize":921600,"Format":"Greyscale","Height":720,"Width":1280},{"Channels":2,"DataSize":460800,"Format":"ChromaUV_88","Height":360,"Width":640}],"StreamName":"RearColour","WorldMappingStatus":[65,82,87,111,114,108,100,77,97,112,112,105,110,103,83,116,97,116,117,115,78,111,116,65,118,97,105,108,97,98,108,101]},"Planes":[{},{}],"PendingFrames":0}
	const CameraMeta = CameraFrame.Meta.Camera;
	/*
	Pop.Debug(JSON.stringify(CameraMeta));
	{"Intrinsics":[1022.5894165039062,0,629.57666015625,0,1022.5894165039062,352.0909118652344,0,0,1],
	"IntrinsicsCameraResolution":[1280,720],
	"LocalEulerRadians":[-0.4825268089771271,-0.00014580755669157952,-0.0032781404443085194],
	"LocalToWorld":[0.9999942779541016,0.0033457924146205187,-0.00012916002015117556,-0.0004254723899066448,-0.002903854474425316,0.8858205080032349,0.46401897072792053,-0.00043684171396307647,0.001666923752054572,-0.46401602029800415,0.8858252763748169,0.00031121785286813974,0,0,0,0.9999998807907104],
	"ProjectionMatrix":[1.5977959632873535,0,0.015505194664001465,0,0,2.8405261039733887,-0.020580768585205078,0,0,0,-0.9999997615814209,-0.0009999998146668077,0,0,-1,0],
	"Tracking":"ARTrackingStateNormal","TrackingStateReason":"ARTrackingStateReasonNone"}
*/
	const Frame = {};
	Frame.Planes = CameraFrame.Planes;


	const LocalToWorld = ArKitToPopTransform( CameraMeta.LocalToWorld );
	const WorldToLocal = MatrixInverse4x4(LocalToWorld);

	Frame.Camera = new PopCamera();
//Pop.Debug(`CameraMeta.ProjectionMatrix= ${CameraMeta.ProjectionMatrix}`);
//Pop.Debug(`CameraMeta.Intrinsics= ${CameraMeta.Intrinsics}`);
/*
CameraMeta.ProjectionMatrix= 
1.5933024883270264,	0,				0.015366852283477783,	0,
0,				2.832537889480591,	-0.02082228660583496,	0,
0,				0,					-0.9999997615814209,	-0.0009999998146668077,
0,				0	,				-1,						0

CameraMeta.Intrinsics= 
1020.5763549804688,	0,					629.6652221679688,
0,					1020.5763549804688,	352.0038146972656,
0,0,1

DefaultProj=

0.8284271,	0,			0.5,	0,
0,			0.828427,	0.5,	0,
0,			0,			1.0002000,	1,
0,			0,		-0.020002000200020003,	0
*/
	const p = CameraMeta.ProjectionMatrix;

	const Focal = {};
	Focal.fx = p[0];
	Focal.s = p[1];
	Focal.cx = p[2];
	Focal.fy = p[5];
	Focal.cy = -p[6];	//	flipped center y! is this image being flipped, or world?

	Frame.Camera.GetOpenglFocalLengths = function( ViewRect )
	{
		return Focal;
	}
		
/*
	Frame.Camera.ProjectionMatrix = 
	[
		p[0],	p[1],	p[2],		0,
		0,		p[5],	p[6],		0,
		0,		0,		1.0000002000,	1,
		0,		0,		-0.0002,	0
		
	];
	*/
	//Frame.Camera.ProjectionMatrix = CameraMeta.ProjectionMatrix;
	/*
	Frame.Camera.GetOpenglFocalLengths = function(ViewRect)
	{
		const Intrinsics = CameraMeta.Intrinsics;
		const Focals = {};
		Focals.fx = 1 / Intrinsics[0];
		Focals.fy = 1 / Intrinsics[4];
		Focals.cx = 0.5;//Intrinsics[2];
		Focals.cy = 0.5;//Intrinsics[5];
		Focals.s = 0;
		return Focals;
	}
	*/
	//Frame.Camera.GetLocalToWorldMatrix = function()	{	return CameraMeta.LocalToWorld;	};
	//Frame.Camera.GetWorldToCameraMatrix = function()	{	return MatrixInverse4x4(CameraMeta.LocalToWorld);	}
	Frame.Camera.GetWorldToCameraMatrix = function()	{	return WorldToLocal;	}
	
	
	return Frame;
}	
