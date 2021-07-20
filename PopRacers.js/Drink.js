import * as PopMath from './PopEngineCommon/Math.js'
const Default = 'Drink.js';
export default Default;

import {CreateCubeGeometry} from './PopEngineCommon/CommonGeometry.js'
import * as DrinkShaderSource from './Drink/DrinkShader.glsl.js'
import {ExtractShaderUniforms} from './PopEngineCommon/Shaders.js'


let DrinkShader = null;
let DrinkGeo = null;
let DrinkGeoAttribs = null;

let DrinkBottom = null;
let DrinkTop = null;
let PendingPosition = null;

export function OnHoverMap(WorldPos,WorldRay,FirstDown)
{
}

export function OnUnclickMap()
{
	if ( PendingPositon )
	{
		if ( !DrinkBottom )
		{
			DrinkBottom = PendingPosition;
			PendingPosition = null;
		}	
		else
		{
			DrinkTop = PendingPosition;
			PendingPosition = null;
		}
	}
}

export function OnClickMap(WorldPos,WorldRay,FirstDown)
{
	if ( !DrinkBottom )
	{
		//	need to get a hit for placing the bottom 
		if ( WorldPos )
		{
			//PendingPosition = WorldPos;
			//	immediatly place
			DrinkBottom = WorldPos;
		}
	}
	else if ( DrinkBottom )//if ( !DrinkTop && DrinkBottom )
	{
		//	need to find the Y above drinkbottom that we're pointing at
		//	so get two rays, drink up, and our ray
		//	then find the nearest point on the drink line
		const DrinkUp = [0,1,0];
		const Result = PopMath.GetRayRayIntersection3( DrinkBottom, DrinkUp, WorldRay.Start, WorldRay.Direction );
		let NewDrinkTop = PopMath.GetRayPositionAtTime( DrinkBottom, DrinkUp, Result.IntersectionTimeA );
		
		NewDrinkTop[1] = Math.max( DrinkBottom[1], NewDrinkTop[1] );
		DrinkTop = NewDrinkTop;
	}
}

export async function LoadAssets(RenderContext)
{
	if ( !DrinkGeo )
	{
		const Geometry = CreateCubeGeometry(0,1);
		DrinkGeo = await RenderContext.CreateGeometry(Geometry,undefined);
		DrinkGeoAttribs = Object.keys(Geometry);
	}
	
	if ( !DrinkShader && DrinkGeo )
	{
		const FragSource = DrinkShaderSource.Frag;
		const VertSource = DrinkShaderSource.Vert;
		const ShaderUniforms = ExtractShaderUniforms(VertSource,FragSource);
		DrinkShader = await RenderContext.CreateShader(VertSource,FragSource,ShaderUniforms,DrinkGeoAttribs);
	}
}

export function GetRenderCommands(CameraUniforms,Camera,Assets)
{
	let Commands = [];
	
	function DrawCube(Position)
	{
		if ( !Position )
			return;
		const Uniforms = Object.assign({},CameraUniforms);
		//const Position = TrackPoint.Position.slice();
		Uniforms.LocalToWorldTransform = PopMath.CreateTranslationMatrix(...Position);
		Uniforms.Selected = false;//TrackPoint.Selected;
		Commands.push( ['Draw',DrinkGeo,DrinkShader,Uniforms] );
	}
	
	{
		let Bottom = DrinkBottom;
		let Top = PendingPosition || DrinkTop || DrinkBottom;
		//DrawCube(Bottom);
		//DrawCube(Top);
		
		if ( Bottom && Top )
		{
			const Uniforms = Object.assign({},CameraUniforms);
			Uniforms.LocalToWorldTransform = PopMath.CreateIdentityMatrix();
			Uniforms.WorldBoundsBottom = Bottom;
			Uniforms.WorldBoundsTop = Top;
			Uniforms.BoundsRadius = 0.06;
			Commands.push( ['Draw',DrinkGeo,DrinkShader,Uniforms] );
		}
	}

	return Commands;
}
