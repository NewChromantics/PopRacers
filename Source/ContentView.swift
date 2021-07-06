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


    var body: some View {
        Text("Hello, world!")
            .padding()
       OpenglView(renderer:$renderView)
    }
}

struct ContentView_Previews: PreviewProvider {
    static var previews: some View {
        ContentView()
    }
}
