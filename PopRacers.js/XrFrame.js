import PromiseQueue from './PopEngineCommon/PromiseQueue.js'
import PopCamera from './PopEngineCommon/Camera.js'


let CameraThreadPromise;
let CameraFrameQueue = new PromiseQueue('Camera frames');
async function CameraThread()
{
	//	todo: don't loop forever
	while ( true )
	{
		try
		{
			const Device = new Pop.Media.Camera('Rear Camera');
			while ( true )
			{
				const Frame = await Device.WaitForNextFrame();
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
	const Frame = await CameraFrameQueue.WaitForLatest();
	return Frame;
}	
