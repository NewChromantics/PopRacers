export default const GeoVertGlsl = `
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

void main()
{
	vec3 LocalPos = LocalPosition;
	
	vec4 WorldPos = LocalToWorldTransform * vec4(LocalPos,1);
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
