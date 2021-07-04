//
//  Use this file to import your target's public headers that you would like to expose to Swift.
//

#import "../Source/Apple/PopEngine.xcframework/ios-arm64/PopEngine_Ios.framework/Headers/SoyGuiSwift.h"

//	declare CAPI in bridging header to allow swift to call, but engine.h has extern "C" atm, so declare it ourselves
//#import "Apple/PopEngine.xcframework/ios-arm64/PopEngine_Ios.framework/Headers/PopEngine.h"
int PopEngine(const char* ProjectPath);
