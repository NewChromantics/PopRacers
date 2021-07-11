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
		const Normal = this.Normal;
		const WorldUp = [0,1,0];
		const Dot = Math.abs( Dot3( Normal, WorldUp ) );
		return Dot > 0.5;
	}
	
	get Normal()
	{
		if ( !this.NormalCache )
			this.NormalCache = this.GetNormal();
		return this.NormalCache;
	}
	
	GetNormal()
	{
		//	probably should cache this
		//	gr: seems to fail with .w=0 so backup with world space subtraction
		let Up = [0,1,0,1];
		let Zero = [0,0,0,1];
		const WorldUp = TransformPosition( Up, this.LocalToWorld );
		const WorldZero = TransformPosition( Zero, this.LocalToWorld );
		const Normal = Normalise3( Subtract3( WorldUp, WorldZero ) );
		//	need to div/w?
		return Normal;
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

