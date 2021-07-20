export const Vert = `
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

uniform mat4 LocalToWorldTransform;
uniform mat4 WorldToCameraTransform;
uniform mat4 CameraProjectionTransform;

uniform vec3 WorldBoundsBottom;
uniform vec3 WorldBoundsTop;
uniform float BoundsRadius;

void main()
{
	//	expecting cube 0..1
	vec3 LocalPos = LocalPosition;
	//vec4 WorldPos = LocalToWorldTransform * vec4(LocalPos,1);
	vec4 WorldPos;
	WorldPos.xyz = mix( WorldBoundsBottom, WorldBoundsTop, LocalPos.y );
	WorldPos.x += mix( -BoundsRadius, BoundsRadius, LocalPos.x );
	WorldPos.z += mix( -BoundsRadius, BoundsRadius, LocalPos.z );
	WorldPos.w = 1.0;
	
	vec4 CameraPos = WorldToCameraTransform * WorldPos;	//	world to camera space
	vec4 ProjectionPos = CameraProjectionTransform * CameraPos;
	gl_Position = ProjectionPos;
	
	WorldPosition = WorldPos.xyz;
	FragColour = vec3( LocalUv );
	FragLocalPosition = LocalPosition;
	FragLocalUv = LocalUv.xy;
	TriangleIndex = LocalUv.z;
	
	vec4 WorldUp4 = LocalToWorldTransform * vec4(0,1,0,0);
	WorldUp = WorldUp4.xyz;//normalize(WorldUp4.xyz / WorldUp4.w);
}



`;

export const Frag = `
#version 100
precision highp float;
varying vec2 FragLocalUv;
void main()
{
	gl_FragColor = vec4( FragLocalUv, 1.0, 1 );
}
`;

export default Vert;
