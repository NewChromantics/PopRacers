let Window = new Pop.Gui.Window(null);
//let Renderer = new Pop.Sokol.Context(Window,'TestRenderView');

async function CreateRenderContext()
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

async function SokolRenderThread()
{
	//	new sokol renderer
	const RenderThrottleMs = 40;
	const Sokol = await CreateRenderContext();

	let FrameCount = 0;
	
	function GetRenderCommands()
	{
		let Commands = [];
		const Blue = (FrameCount % 60)/60;
		const ClearColour = [0,Blue,1];
		Commands.push(['SetRenderTarget',null,ClearColour]);
		return Commands;
	}

	while (Sokol)
	{
		try
		{
			const Commands = GetRenderCommands();
			await Sokol.Render(Commands);
			FrameCount++;
		}
		catch(e)
		{
			Pop.Debug(`Renderloop error; ${e}`);
			await Pop.Yield(1000);
		}
	}
}
SokolRenderThread().catch(Pop.Warning);

