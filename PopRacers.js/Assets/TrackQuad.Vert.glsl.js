export const TrackQuadVertGlsl = `
#version 100
precision highp float;

attribute vec3 LocalPosition;
attribute vec3 LocalUv;
varying vec3 FragColour;
varying vec3 WorldPosition;
varying vec3 FragLocalPosition;
varying vec2 FragLocalUv;
varying float TriangleIndex;

varying vec3 WorldUp;	//	up of LocalToWorldTransform

//uniform mat4 LocalToWorldTransform;
uniform vec3 StartWorldPosition;
uniform vec3 EndWorldPosition;
uniform mat4 WorldToCameraTransform;
uniform mat4 CameraProjectionTransform;

void main()
{
	//vec3 LocalPos = LocalPosition;
	//vec3 WorldPos3 = mix( StartWorldPosition, EndWorldPosition, LocalUv.y );
	//WorldPos3 += LocalPos;//	+localuv?
	//	use u as left/right
	//	use v as front/back
	//	make quad big enough to sdf
	vec3 Dir = normalize(EndWorldPosition - StartWorldPosition);
	vec3 Cross = vec3( -Dir.z, 0.0, Dir.x );
	float Width = 0.02;
	Cross *= Width;
	vec3 WorldPos3 = mix( StartWorldPosition, EndWorldPosition, LocalUv.y );
	//	widen
	WorldPos3 += mix( -Cross, Cross, LocalUv.x );
	//	endcaps
	WorldPos3 += mix( -Dir*Width, Dir*Width, LocalUv.y );
	
	
	vec4 WorldPos = vec4( WorldPos3, 1.0 );
	//vec4 WorldPos = LocalToWorldTransform * vec4(LocalPos,1);
	
	vec4 CameraPos = WorldToCameraTransform * WorldPos;	//	world to camera space
	vec4 ProjectionPos = CameraProjectionTransform * CameraPos;
	gl_Position = ProjectionPos;
	
	WorldPosition = WorldPos.xyz;
	FragColour = vec3( LocalUv );
	FragLocalPosition = LocalPosition;
	FragLocalUv = LocalUv.xy;
	TriangleIndex = LocalUv.z;
	
	//vec4 WorldUp4 = LocalToWorldTransform * vec4(0,1,0,0);
	//WorldUp = WorldUp4.xyz;//normalize(WorldUp4.xyz / WorldUp4.w);
	WorldUp = vec3(0,1,0);
}

`;


export const TrackQuadFragGlsl = `
#version 100
precision highp float;
varying vec3 WorldPosition;
varying vec2 FragLocalUv;
uniform bool Selected;
uniform vec3 StartWorldPosition;
uniform vec3 EndWorldPosition;

const float TrackWidth = 0.01;
const float DashWidth = TrackWidth * 0.2;
const float DashInset = DashWidth;

float TimeAlongLine2(vec2 Position,vec2 Start,vec2 End)
{
	vec2 Direction = End - Start;
	float DirectionLength = length(Direction);
	float Projection = dot( Position - Start, Direction) / (DirectionLength*DirectionLength);
	
	return Projection;
}

vec2 NearestToLine2(vec2 Position,vec2 Start,vec2 End)
{
	float Projection = TimeAlongLine2( Position, Start, End );
	
	//	past start
	Projection = max( 0.0, Projection );
	//	past end
	Projection = min( 1.0, Projection );
	
	//	is using lerp faster than
	//	Near = Start + (Direction * Projection);
	vec2 Near = mix( Start, End, Projection );
	return Near;
}

float DistanceToLine2(vec2 Position,vec2 Start,vec2 End)
{
	vec2 Near = NearestToLine2( Position, Start, End );
	return length( Near - Position );
}

float GetDistanceToTrack()
{
	return DistanceToLine2( WorldPosition.xz, StartWorldPosition.xz, EndWorldPosition.xz );
}

void main()
{
	float DistanceAlongLine = FragLocalUv.y * length(EndWorldPosition-StartWorldPosition);

	float Distance = GetDistanceToTrack();
	if ( Distance > TrackWidth )
		discard;
	//	dark
	//gl_FragColor = vec4( FragLocalUv*1.0, 0.0, 1 );
	gl_FragColor = vec4( 0, 0, 0, 1 );
	
	//	edge lines
	float HalfDashWidth = DashWidth * 0.5;
	/*
	if ( Distance < TrackWidth - DashInset + HalfDashWidth &&
		Distance > TrackWidth - DashInset - HalfDashWidth )
	{
		gl_FragColor = vec4( 1, 1, 1, 1 );
	}
*/
	//	center lines
	if ( Distance < HalfDashWidth )
	{
		//	dash them
		float RepeatEvery = 0.02;
		float DashScalar = 1.0 / RepeatEvery;
		if ( fract(DistanceAlongLine*DashScalar) < 0.5 )
			gl_FragColor = vec4( 1, 1, 1, 1 );
	}
	
	
	if ( Selected )
	{
		float DistanceToStart = length( StartWorldPosition - WorldPosition );
		if ( DistanceToStart < TrackWidth )
			gl_FragColor.x = 1.0;
	}
}
`;

export default TrackQuadVertGlsl;
