
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
			Sokol.RenderView = RenderView;
			Sokol.RenderView.OnMouseDown = RenderScene.OnMouseDown.bind(RenderView);
			Sokol.RenderView.OnMouseMove = RenderScene.OnMouseMove.bind(RenderView);
			//	until renderview gets a rect func
			Sokol.RenderView.GetScreenRect = Sokol.GetScreenRect.bind(Sokol);
			return Sokol;
		}
		catch(e)
		{
			Pop.Debug(`Failed to make render context (${RenderViewName}); ${e}...`);
			await Pop.Yield(5000);
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
			RenderScene.PostRender();
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


