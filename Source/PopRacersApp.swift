//
//  PopRacersApp.swift
//  PopRacers
//
//  Created by Graham Reeves on 04/07/2021.
//

import SwiftUI
import Combine


@main
struct PopRacersApp: App {

	@ObservedObject var externalDisplayContent = ExternalDisplayContent()
	@State var additionalWindows: [UIWindow] = []

	var body: some Scene 
	{
		WindowGroup 
		{
			ContentView()
				.environmentObject(externalDisplayContent)
				.onAppear 
				{
					//	call engine startup
					PopEngine("PopRacers.js")
				}
				.onReceive(
					screenDidConnectPublisher,
					perform: screenDidConnect
				)
				.onReceive (
					screenDidDisconnectPublisher,
					perform: screenDidDisconnect
				)
		}
	}

	private func screenDidConnect(_ screen: UIScreen) 
	{
		let window = UIWindow(frame: screen.bounds)

		window.windowScene = UIApplication.shared.connectedScenes
		.first { ($0 as? UIWindowScene)?.screen == screen }
		as? UIWindowScene

		let view = ExternalView()
		.environmentObject(externalDisplayContent)
		let controller = UIHostingController(rootView: view)
		window.rootViewController = controller
		window.isHidden = false
		additionalWindows.append(window)
		externalDisplayContent.isShowingOnExternalDisplay = true
	}

    private func screenDidDisconnect(_ screen: UIScreen) {
        //  Coming soon…
        externalDisplayContent.isShowingOnExternalDisplay = false
    }
    
    private var screenDidConnectPublisher: AnyPublisher<UIScreen, Never> {
        NotificationCenter.default
            .publisher(for: UIScreen.didConnectNotification)
            .compactMap { $0.object as? UIScreen }
            .receive(on: RunLoop.main)
            .eraseToAnyPublisher()
    }

    private var screenDidDisconnectPublisher: AnyPublisher<UIScreen, Never> {
        NotificationCenter.default
            .publisher(for: UIScreen.didDisconnectNotification)
            .compactMap { $0.object as? UIScreen }
            .receive(on: RunLoop.main)
            .eraseToAnyPublisher()
    }
}
