import {TransformPosition,Subtract3,Normalise3} from './PopEngineCommon/Math.js'

export default class WorldGeo_t
{
	constructor(Anchor)
	{
		this.Anchor = Anchor;
		
		//	need to start storing buffer per context
		//	which shuoild be in asset system anyway
		this.TriangleBuffer = null;
		this.TriangleBufferRenderContext = null;
		this.AttribNames = null;


		Pop.Debug(`New world geo Normal=${this.Normal}`);
	}
	
	async LoadAssets(RenderContext)
	{
		if ( this.TriangleBuffer )
			return;
		
		const Geometry = this.Anchor.Geometry;
		this.AttribNames = Object.keys(Geometry);
		this.TriangleBuffer =  await RenderContext.CreateGeometry( Geometry, undefined );
		this.TriangleBufferRenderContext = RenderContext; 
	}
	
	IsHorizontal()
	{
		return this.Anchor.IsHorizontal();
	}
	
	get Normal()
	{
		return this.Anchor.Normal;
	}
	
	get LocalToWorld()
	{
		return this.Anchor.LocalToWorld;
	}
	
	Free()
	{
		if ( this.TriangleBuffer )
		{
			this.TriangleBufferRenderContext.FreeGeometry(this.TriangleBuffer);
			this.TriangleBuffer = null;
			this.TriangleBufferRenderContext = null;
		}
	}
}

