//	from https://prathamesh.xyz/blog/2020/10/7/add-multi-screen-support-to-swiftui-apps
import SwiftUI


class ExternalDisplayContent: ObservableObject {

    @Published var string = ""
    @Published var isShowingOnExternalDisplay = false

}

struct ExternalView: View {

    @EnvironmentObject var externalDisplayContent: ExternalDisplayContent
	@State var renderView = PopEngineRenderView(name:"xxExternalScreen")

    var body: some View 
    {
    
        Text("external screen")
        OpenglView(renderer:$renderView)
    }

}
