import PromiseQueue from './PopEngineCommon/PromiseQueue.js'
import PopCamera from './PopEngineCommon/Camera.js'

const Default = 'XrFrame.js';
export default Default;

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
				//Pop.Debug(`Got frame ${Frame}`);
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

	Frame.Camera = new PopCamera();
	Frame.Camera.ProjectionMatrix = CameraMeta.ProjectionMatrix;
	Frame.Camera.GetLocalToWorldMatrix = function()	{	return CameraMeta.LocalToWorld;	};
	

	return Frame;
}	