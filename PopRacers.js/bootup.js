
import * as RenderScene from './RenderScene.js'
//import * as Xr from './XrFrame.js'

Pop.Debug(`RenderScene = ${Object.keys(RenderScene)}`);


async function CreateMainWindowRenderContext(Window)
{
	for ( let i=0;	i<100;	i++ )
	{
		try
		{
			const ViewWindow = Window;
			const ViewName = "RenderView";
			const RenderView = new Pop.Gui.RenderView(ViewWindow,ViewName);
			const Sokol = new Pop.Sokol.Context(RenderView);
			return Sokol;
		}
		catch(e)
		{
			Pop.Debug(`Failed to make render context; ${e}...`);
			await Pop.Yield(100);
		}
	}
	throw `Couldn't make render context`;
}



async function WindowRenderThread(Window)
{
	//	new sokol renderer
	const RenderThrottleMs = 40;
	const Sokol = await CreateMainWindowRenderContext(Window);

	let FrameCount = 0;

	while (Sokol)
	{
		try
		{
			await RenderScene.LoadAssets(Sokol);
			const Commands = RenderScene.GetRenderCommands(FrameCount);
			await Sokol.Render(Commands);
			FrameCount++;
			await Pop.Yield(RenderThrottleMs);
		}
		catch(e)
		{
			Pop.Debug(`Renderloop error; ${e}`);
			await Pop.Yield(1000);
		}
	}
}
const MainWindow = new Pop.Gui.Window(null);
WindowRenderThread(MainWindow).catch(Pop.Warning);


