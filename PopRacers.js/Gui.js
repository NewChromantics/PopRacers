import Pop from './PopEngineCommon/PopEngine.js'


const Default = 'Gui.js';
export default Default;

const EventHandlers = {};
const EventGuis = {};

export function SetEvent(Name,Functor)
{
	EventHandlers[Name] = Functor;
}

function OnGuiEvent()
{
	const Name = this;
	const Handler = EventHandlers[Name];
	if ( !Handler )
	{
		Pop.Debug(`Gui event for ${Name} unhandled`);
		return;
	}
	Handler(...Array.from(arguments));
}

const Window = new Pop.Gui.Window(null);

function SetupGuiCallback(Name,Type)
{
	const Gui = new Type(Window,Name);
	EventGuis[Name] = Gui;
	Gui.OnChanged = OnGuiEvent.bind(Name);
}
	
SetupGuiCallback( 'SaveMeshes', Pop.Gui.TickBox );
