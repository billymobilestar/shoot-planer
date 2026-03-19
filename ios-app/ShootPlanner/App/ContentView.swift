import SwiftUI

struct ContentView: View {
    @EnvironmentObject var auth: AuthService

    var body: some View {
        Group {
            if auth.isLoading {
                LoadingView()
            } else if auth.isAuthenticated {
                DashboardView()
            } else {
                SignInView()
            }
        }
        .animation(.easeInOut(duration: 0.3), value: auth.isAuthenticated)
    }
}

struct LoadingView: View {
    var body: some View {
        ZStack {
            Theme.bgPrimary.ignoresSafeArea()
            VStack(spacing: 16) {
                Text("Shoot Planner")
                    .font(.largeTitle)
                    .fontWeight(.bold)
                    .foregroundColor(Theme.accent)
                ProgressView()
                    .tint(Theme.accent)
            }
        }
    }
}
