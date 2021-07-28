import {TransformPosition,Subtract3,Normalise3} from './PopEngineCommon/Math.js'
import * as PopMath from './PopEngineCommon/Math.js'
import Pop from './PopEngineCommon/PopEngine.js'

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

		//Pop.Debug(`New world geo Normal=${this.Normal} LocalToWorld=${this.LocalToWorld}`);
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
	
	GetRaycastHit(WorldRay)
	{
		//	todo: get world bounds and quick hit check
		//	move ray into geo space
		//	do local space raycast (this should be moved into a generic thing)
		//	for now... lets just cast against plane
		if ( this.Anchor.Meta.AnchorType != 'ARPlaneAnchor' )
			throw `Todo: raycast against non plane (${this.Anchor.Type})`;
		
		//	how do I get distance hmm
		const LocalToWorld = this.LocalToWorld;
		const Plane = [...this.Normal, 0.0];
		
		//	this isn't it
		const WorldCenter = PopMath.GetMatrixTranslation(LocalToWorld);
		//Plane[3] = -PopMath.Length3(WorldCenter);
		
		//	if normal is 0,1,0
		//	and center is x,y,z, plane D must be Y
		//	so... should we be able to extract it from local000?
		Plane[3] = WorldCenter[1];
		//Pop.Debug(`Plane=${Plane}`);
		
		
		const Intersection = PopMath.GetPlaneIntersection( WorldRay.Position, WorldRay.Direction, Plane );
		return Intersection;
	}
}

