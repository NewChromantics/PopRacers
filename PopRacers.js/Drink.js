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
const MaxSectionLength = 0.1;

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

function GetPreviousPoint(Point)
{
	if ( !Point )
		return null;
	if ( TrackPoints.length < 2 )
		return null;
		
	let ThisIndex = TrackPoints.indexOf(Point);
	if ( ThisIndex == -1 )
		throw `GetPreviousPoint() Didn't find this point?`;

	let PreviousIndex = (ThisIndex==0) ? TrackPoints.length-1 : ThisIndex-1;
	return TrackPoints[PreviousIndex];
	
}

export function OnHoverMap(WorldPos,FirstDown)
{
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
	
	//	if this stretches the current pos, snap and make a new one
	let PreviousPoint = GetPreviousPoint(LockedPoint);
	if ( PreviousPoint )
	{
		const SectionLength = PopMath.Distance3( WorldPos, PreviousPoint.Position );
		if ( SectionLength > MaxSectionLength )
		{
			const NewPoint = new TrackPoint_t(WorldPos);
			TrackPoints.push(NewPoint);
			LockPoint(NewPoint);
		}
	}
	
	LockedPoint.Position = WorldPos;
}

export function LoadAssets(RenderContext)
{
}

export function GetRenderCommands(CameraUniforms,Camera,Assets)
{
	let Commands = [];
	
/*	
	for ( let TrackPoint of TrackPoints )
	{
		const Uniforms = Object.assign({},CameraUniforms);
		const Position = TrackPoint.Position.slice();
		Uniforms.LocalToWorldTransform = PopMath.CreateTranslationMatrix(...Position);
		Uniforms.Selected = TrackPoint.Selected;
		Commands.push( ['Draw',Assets.CubeGeo,Assets.CubeShader,Uniforms] );
	}
*/
	function GetTrackPoint(Index)
	{
		if ( TrackPoints.length == 1 )
			return TrackPoints[0];
			
		if ( Index < 0 )
			Index += TrackPoints.length;
		Index = Index % TrackPoints.length;
		return TrackPoints[Index];
	}
	
	//	make track lines
	for ( let t=0;	t<TrackPoints.length;	t++ )
	{
		const Prev = GetTrackPoint(t-1);
		const Start = GetTrackPoint(t+0);
		const End = GetTrackPoint(t+1);
		const Next = GetTrackPoint(t+2);
		
		const Uniforms = Object.assign({},CameraUniforms);
		Uniforms.PrevWorldPosition = Prev.Position.slice();
		Uniforms.StartWorldPosition = Start.Position.slice();
		Uniforms.EndWorldPosition = End.Position.slice();
		Uniforms.NextWorldPosition = Next.Position.slice();
		Uniforms.PrevWorldPosition[1] += 0.0011;
		Uniforms.StartWorldPosition[1] += 0.0012;
		Uniforms.EndWorldPosition[1] += 0.0013;
		Uniforms.NextWorldPosition[1] += 0.0014;
		Uniforms.Selected = Start.Selected;
		Commands.push( ['Draw',Assets.TrackQuadGeo,Assets.TrackShader,Uniforms] );
	}


	return Commands;
}
