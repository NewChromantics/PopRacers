import * as SceneAssets from './SceneAssets.js'

const Default = 'RenderScene.js';
export default Default;

/*
let LastBackgroundImage;

async function XrThread()
{
	while(true)
	{
		const Frame = await Xr.WaitForNextFrame();
		LastBackgroundImage = Frame;
	}
}
XrThread().catch(Pop.Warning);
*/


export async function LoadAssets(RenderContext)
{
	await SceneAssets.LoadAssets(RenderContext);

}

//	get render commands in current state
export function GetRenderCommands(FrameNumber)
{
	let Commands = [];
	const Blue = (FrameNumber % 60)/60;
	const ClearColour = [0,Blue,1];
	Commands.push(['SetRenderTarget',null,ClearColour]);
	
	
	{
		//let Camera = LastXrFrameCamera;
		let Camera = null;
		let SceneCommands = GetSceneRenderCommands(Camera);
		Commands.push( ...SceneCommands );
	}
	
	return Commands;
}


function GetSceneRenderCommands(Camera)
{
	const Assets = SceneAssets.GetAssets();
	
	const Uniforms = {};
	const RenderQuadCommand = ['Draw',Assets.ScreenQuad,Assets.TestShader,Uniforms];
	
	return [RenderQuadCommand];
}

