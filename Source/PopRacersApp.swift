//
//  PopRacersApp.swift
//  PopRacers
//
//  Created by Graham Reeves on 04/07/2021.
//

import SwiftUI

@main
struct PopRacersApp: App {
    var body: some Scene {
        WindowGroup {
            ContentView()
            .onAppear 
            {
            PopEngine("PopRacers.js")
        }
        }
        
       
    }
}
