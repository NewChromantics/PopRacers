import * as PopMath from './PopEngineCommon/Math.js'
const Default = 'RaceTrack.js';
export default Default;


class TrackPoint_t
{
	constructor(Position)
	{
		this.Selected = false;
		this.Position = Position;
	}
}
//	
let TrackPoints = [];	//	TrackPoint_t
let LockedPoint = null;

function UnlockPoint()
{
	//	if we have one locked, unlock it
	if ( !LockedPoint )
		return;
		
	LockedPoint.Selected = false;
	LockedPoint = null;
}

function LockPoint(Point)
{
	UnlockPoint();
	
	if ( !Point )
		return;
		
	LockedPoint = Point;
	LockedPoint.Selected = true;
}

function GetNearestPoint(Position,MaxDistance)
{
	function PointToPointAndDistance(Point)
	{
		const PointAndDistance = {};
		PointAndDistance.Point = Point;
		PointAndDistance.Distance = PopMath.Distance3( Position, Point.Position );
		return PointAndDistance;
	}
	function CompareDistance(a,b)
	{
		if ( a.Distance < b.Distance )	return -1;
		if ( a.Distance > b.Distance )	return 1;
		return 0;
	}
	let Points = TrackPoints.map( PointToPointAndDistance );
	Points = Points.filter( pad => pad.Distance <= MaxDistance );
	Points.sort( CompareDistance );
	if ( !Points.length )
		return null;
	return Points[0].Point;
}

export function OnClickMap(WorldPos,FirstDown)
{
	if ( FirstDown )
	{
		//	look for nearby existing points to manipulate
		const MaxDistance = 0.05;	//	need to figure this out with camera info
		const NearestPoint = GetNearestPoint(WorldPos,MaxDistance);
		LockPoint( NearestPoint );
	}
	
	//	if no locked point, make a new one
	if ( !LockedPoint )
	{
		const NewPoint = new TrackPoint_t(WorldPos);
		TrackPoints.push(NewPoint);
		LockPoint(NewPoint);
	}
	
	LockedPoint.Position = WorldPos;
}


export function GetRenderCommands(CameraUniforms,Camera,Assets)
{
	let Commands = [];
	
	//	make track lines
	for ( let t=0;	t<TrackPoints.length;	t++ )
	{
		const This = TrackPoints[t];
		const Next = TrackPoints[(t+1)%TrackPoints.length];
		
		const Uniforms = Object.assign({},CameraUniforms);
		Uniforms.StartWorldPosition = This.Position.slice();
		Uniforms.EndWorldPosition = Next.Position.slice();
		Uniforms.StartWorldPosition[1] += 0.001;
		Uniforms.EndWorldPosition[1] += 0.001;
		Uniforms.Selected = This.Selected;
		Commands.push( ['Draw',Assets.TrackQuadGeo,Assets.TrackShader,Uniforms] );
	}
/*	
	for ( let TrackPoint of TrackPoints )
	{
		const Uniforms = Object.assign({},CameraUniforms);
		const Position = TrackPoint.Position.slice();
		Position[1] += 0.001;
		Uniforms.LocalToWorldTransform = PopMath.CreateTranslationMatrix(...Position);
		Uniforms.Selected = TrackPoint.Selected;
		Commands.push( ['Draw',Assets.TrackQuadGeo,Assets.TrackShader,Uniforms] );
	}
	*/
	return Commands;
}
