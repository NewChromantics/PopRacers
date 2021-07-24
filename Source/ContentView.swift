//
//  ContentView.swift
//  PopRacers
//
//  Created by Graham Reeves on 04/07/2021.
//

import SwiftUI



struct ContentView: View {

	@EnvironmentObject var externalDisplayContent: ExternalDisplayContent
	
	@State var renderView = PopEngineRenderView(name:"RenderView")
	@State var SaveButton = PopTickBox(name:"SaveMeshes")

	func Save()
	{
		//	we don't have a button type yet, toggle setting to trigger callback
		SaveButton.value = !SaveButton.value
	}

    var body: some View {
    	Button(action: Save)
    	{
    		Text("Save Maps")
		}
        .padding()
       OpenglView(renderer:$renderView)
    }
}

struct ContentView_Previews: PreviewProvider {
    static var previews: some View {
        ContentView()
    }
}
