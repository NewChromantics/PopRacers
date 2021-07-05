import PromiseQueue from './PopEngineCommon/PromiseQueue.js'
import PopCamera from './PopEngineCommon/Camera.js'
import {CreateIdentityMatrix,MatrixInverse4x4,GetMatrixTransposed} from './PopEngineCommon/Math.js'

const Default = 'XrFrame.js';
export default Default;


class Anchor_t
{
	constructor(Uuid,Geometry,LocalToWorld)
	{
		this.Uuid = Uuid;
		this.LocalToWorld = LocalToWorld;
		this.Geometry = Geometry;
	}
};

let GeometryAnchors = {};	//	[uuid] = Anchor_t

let GeometryChangedQueue = new PromiseQueue('GeometryChangedQueue');

function OnFrameAnchor(FrameAnchor)
{
	if ( !FrameAnchor.Geometry )
		return;
		
	const Uuid = FrameAnchor.Uuid;
		
	if ( GeometryAnchors.hasOwnProperty( Uuid ) )
	{
		//	todo: check if data changed
		return;
	}
	
	//	this transform also dictates the plane (center + up)
	const LocalToWorld = ArKitToPopTransform(FrameAnchor.LocalToWorld);
	
	//	split input corners into positions, and generate a triangle fan
	let Vertexes = [];	//	[x,y,z],
	let CenterPosition = [0,0,0];
	for ( let i=0;	i<FrameAnchor.Geometry.length;	i+=3 )
	{
		const Position = FrameAnchor.Geometry.slice(i,i+3);
		Vertexes.push(Position);
		CenterPosition[0] += Position[0];
		CenterPosition[1] += Position[1];
		CenterPosition[2] += Position[2];
	}
	CenterPosition[0] /= FrameAnchor.Geometry.length;
	CenterPosition[1] /= FrameAnchor.Geometry.length;
	CenterPosition[2] /= FrameAnchor.Geometry.length;
	
	//	generate triangle fan
	const TrianglePositionData = [];
	for ( let t=0;	t<Vertexes.length;	t++ )
	{
		const ai = (t+0) % Vertexes.length;
		const bi = (t+1) % Vertexes.length;
		const a = Vertexes[ai];
		const b = Vertexes[bi];
		const c = CenterPosition;
		TrianglePositionData.push( ...a );
		TrianglePositionData.push( ...b );
		TrianglePositionData.push( ...c );
	}
		
	
	//	convert to pop geometry
	const Geo = {};
	Geo.LocalPosition = {};
	Geo.LocalPosition.Size = 3;
	Geo.LocalPosition.Data = new Float32Array(TrianglePositionData);

	const Anchor = new Anchor_t( Uuid, Geo, LocalToWorld );

	GeometryAnchors[Uuid] = Anchor;
	
	GeometryChangedQueue.Push( Anchor );
	//Got frame {"TimeMs":2022815597,"Meta":{"Anchors":[{"Geometry":[0.16923083364963531,0,0.1461537927389145,0.1961539089679718,0,0.08076918125152588,0.23846149444580078,0,-0.20769236981868744,0.24615372717380524,0,-0.3192308247089386,0.2269229292869568,0,-0.36538466811180115,-0.4230770170688629,0,-0.365384578704834,-0.46923086047172546,0,-0.34615379571914673,-0.38076916337013245,0,-0.00384607445448637,-0.34230759739875793,0,0.08846162259578705,-0.173076793551445,0,0.23461543023586273,-0.1076921746134758,0,0.26153847575187683],"LocalToWorld":[0.9193618893623352,0,-0.39341288805007935,0.05083607882261276,0,1,0,-0.18727344274520874,0.39341288805007935,0,0.9193618893623352,-0.33883318305015564,0,0,0,1],"SessionUuid":"FFA80CCF-164F-CCEF-0057-F330E9B03310","Uuid":"BAAC57FB-C769-44E7-A429-4EAF02FDF4CF"}],"Camera":{"Intrinsics":[1023.16455078125,0,629.5697021484375,0,1023.16455078125,352.0920104980469,0,0,1],"IntrinsicsCameraResolution":[1280,720],"LocalEulerRadians":[-0.48367640376091003,-0.0015200200723484159,-0.004942567087709904],"LocalToWorld":[0.9999830722808838,0.00564939808100462,-0.0013456600718200207,-0.0015735775232315063,-0.004375593736767769,0.8852804899215698,0.4650369882583618,0.00027070194482803345,0.0038184644654393196,-0.4650232493877411,0.8852903246879578,0.0015573576092720032,0,0,0,1],"ProjectionMatrix":[1.5986945629119873,0,0.015516102313995361,0,0,2.8421237468719482,-0.02057778835296631,0,0,0,-0.9999997615814209,-0.0009999998146668077,0,0,-1,0],"Tracking":"ARTrackingStateNormal","TrackingStateReason":"ARTrackingStateReasonNone"},"FeatureCount":6,"LightIntensity":655.3710699081421,"LightTemperature":4080.36572265625,"PendingFrames":1,"Planes":[{"Channels":1,"DataSize":921600,"Format":"Greyscale","Height":720,"Width":1280},{"Channels":2,"DataSize":460800,"Format":"ChromaUV_88","Height":360,"Width":640}],"StreamName":"RearColour","WorldMappingStatus":[65,82,87,111,114,108,100,77,97,112,112,105,110,103,83,116,97,116,117,115,78,111,116,65,118,97,105,108,97,98,108,101]},"Planes":[{},{}],"PendingFrames":0}
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

			const OnlyLatestFrame = true;
			const Device = new Pop.Media.Source(CameraName,Options, OnlyLatestFrame);
			Pop.Debug(`created device: ${Device}`);
			while ( true )
			{
				const Frame = await Device.WaitForNextFrame();
				//Pop.Debug(`Got frame ${JSON.stringify(Frame)}`);
				
				if ( Frame.Meta.Anchors )
					Frame.Meta.Anchors.forEach( OnFrameAnchor );
				
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
	Frame.Image = CameraFrame.Planes[0];



	const LocalToWorld = ArKitToPopTransform( CameraMeta.LocalToWorld );
	const WorldToLocal = MatrixInverse4x4(LocalToWorld);


	Frame.Camera = new PopCamera();
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
