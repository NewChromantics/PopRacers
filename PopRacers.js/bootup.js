
import * as RenderScene from './RenderScene.js'
//import * as Xr from './XrFrame.js'

const MainWindow = new Pop.Gui.Window(null);




async function CreateMainWindowRenderContext(RenderViewName)
{
	for ( let i=0;	i<99999;	i++ )
	{
		try
		{
			const ViewWindow = MainWindow;
			if ( RenderViewName != 'RenderView' )
				throw 'x';
			const RenderView = new Pop.Gui.RenderView(ViewWindow,RenderViewName);
			const Sokol = new Pop.Sokol.Context(RenderView);
			return Sokol;
		}
		catch(e)
		{
			Pop.Debug(`Failed to make render context (${RenderViewName}); ${e}...`);
			await Pop.Yield(100);
		}
	}
	throw `Couldn't make render context`;
}



async function WindowRenderThread(RenderViewName,DoRender)
{
	//	new sokol renderer
	const RenderThrottleMs = 1;
	const Sokol = await CreateMainWindowRenderContext(RenderViewName);

	Pop.Debug(`Created context ${RenderViewName}`);

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
WindowRenderThread('RenderView').catch(Pop.Warning);
WindowRenderThread('ExternalScreen').catch(Pop.Warning);


