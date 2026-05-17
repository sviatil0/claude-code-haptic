import AppKit

let args = CommandLine.arguments
var pulses = 3
var pattern: NSHapticFeedbackManager.FeedbackPattern = .levelChange
var gap: TimeInterval = 0.25

var i = 1
while i < args.count {
    switch args[i] {
    case "-n", "--pulses":
        if i + 1 < args.count, let n = Int(args[i + 1]) { pulses = n; i += 1 }
    case "-g", "--gap":
        if i + 1 < args.count, let g = Double(args[i + 1]) { gap = g; i += 1 }
    case "-p", "--pattern":
        if i + 1 < args.count {
            switch args[i + 1] {
            case "generic": pattern = .generic
            case "alignment": pattern = .alignment
            case "levelChange": pattern = .levelChange
            default: break
            }
            i += 1
        }
    case "-h", "--help":
        print("""
        haptic — trigger macBook trackpad haptic feedback

        Usage: haptic [-n PULSES] [-g GAP_SECONDS] [-p PATTERN]

        Options:
          -n, --pulses N      number of pulses (default: 3)
          -g, --gap SECONDS   gap between pulses (default: 0.25)
          -p, --pattern P     generic | alignment | levelChange (default: levelChange)
          -h, --help          show this help

        Requires: System Settings → Trackpad → "Force Click and haptic feedback" ON
        """)
        exit(0)
    default: break
    }
    i += 1
}

let app = NSApplication.shared
app.setActivationPolicy(.accessory)
app.activate(ignoringOtherApps: true)

let perf = NSHapticFeedbackManager.defaultPerformer

DispatchQueue.main.asyncAfter(deadline: .now() + 0.05) {
    for _ in 0..<pulses {
        perf.perform(pattern, performanceTime: .now)
        Thread.sleep(forTimeInterval: gap)
    }
    DispatchQueue.main.asyncAfter(deadline: .now() + 0.15) { exit(0) }
}
app.run()
